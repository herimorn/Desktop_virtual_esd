import { connectToDatabase } from "main/database";

export async function sendReceiptToTRA(data: {
  products: Product[];
  sale_id: number;
  customerId: string;
  customerName: string;
  customerMobile: string;
  invoiceNumber: string;
  description: string;
  quantity: number;
  amount: number;
  customer_name: string;
  tin: number;
  invoice_number: string;
  phone: string;
}): Promise<any> {
  const db=connectToDatabase();

  // Check if there's a receipt in progress for this sale
  const processingReceipt = await new Promise<boolean>((resolve, reject) => {
    db.get('SELECT COUNT(*) AS count FROM receipt_que WHERE sale_id = ? AND status = "progress"', [data.sale_id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count > 0);
      }
    });
  });

  if (processingReceipt) {
    throw new Error('Another receipt is currently being processed for this sale. Please wait until it completes.');
  }

  // Insert new receipt into queue with status "progress"
  db.run(
    'INSERT INTO receipt_que (sale_id, receipt, status) VALUES (?, ?, "progress")',
    [data.sale_id, ''], // Placeholder for receipt data
    async (err) => {
      if (err) {
        console.error('Error inserting receipt into queue:', err);
        return;
      }

      const { sale_id, tin, customer_name, phone, invoice_number } = data;
      const sanitizedPhone = phone.replace('+', '');

      try {
        const sale: Sale | undefined = await new Promise((resolve, reject) => {
          db.get<Sale>('SELECT * FROM Sales WHERE id = ?', [sale_id], (err, row) => {
            if (err) {
              reject(err);
            } else {
              resolve(row);
            }
          });
        });

        if (!sale) {
          throw new Error('Sale not found');
        }

        const tra: TRA | undefined = await new Promise((resolve, reject) => {
          db.get<TRA>('SELECT * FROM TRA LIMIT 1', (err, row) => {
            if (err) {
              reject(err);
            } else {
              resolve(row);
            }
          });
        });

        if (!tra) {
          throw new Error('TRA details not found');
        }

        const accessToken = await fetchTokenFromDatabase();
        if (!accessToken) {
          throw new Error('Access token not found');
        }

        let { GC, RCTNUM, DC, ZNUM } = await getOrInitializeCredentials();

        const currentDate = new Date();
        const currentZNUM = `${currentDate.getFullYear()}${(currentDate.getMonth() + 1)
          .toString()
          .padStart(2, '0')}${currentDate.getDate().toString().padStart(2, '0')}`;
        const currentTime = currentDate.toTimeString().split(' ')[0];

        if (currentZNUM !== ZNUM) {
          DC = 1;
          ZNUM = currentZNUM;

          db.run(
            'UPDATE reportCredential SET znum = ?, dc = ?, time = ?, rct_date = ?',
            [ZNUM, DC, currentTime, new Date().toISOString()],
            (err) => {
              if (err) console.error('Error updating ZNUM and DC:', err);
            }
          );
        }

        let ackCode: string | undefined;
        let retry = true;

        while (retry) {
          let totalTax = 0;
          let totalTaxExcl = 0;
          let totalTaxIncl = 0;
          data.products.forEach((product: Product) => {
            const productTotalExcl = product.sold_quantity * product.selling_price;
            const productTaxAmount = productTotalExcl * product.tax_codeValue;
            const productTotalIncl = productTotalExcl + productTaxAmount;

            totalTaxExcl += productTotalExcl;
            totalTax += productTaxAmount;
            totalTaxIncl += productTotalIncl;
          });

          const receiptData = xmlbuilder
            .create('RCT')
            .ele('DATE', new Date().toISOString().split('T')[0])
            .up()
            .ele('TIME', new Date().toISOString().split('T')[1].split('.')[0])
            .up()
            .ele('TIN', tra.tin)
            .up()
            .ele('REGID', tra.regId)
            .up()
            .ele('EFDSERIAL', tra.certKey)
            .up()
            .ele('CUSTIDTYPE', '1')
            .up()
            .ele('CUSTID', tin)
            .up()
            .ele('CUSTNAME', customer_name)
            .up()
            .ele('MOBILENUM', sanitizedPhone)
            .up()
            .ele('RCTNUM', RCTNUM)
            .up()
            .ele('DC', DC)
            .up()
            .ele('GC', GC)
            .up()
            .ele('ZNUM', ZNUM)
            .up()
            .ele('RCTVNUM', tra.receiptCode)
            .up()
            .ele('ITEMS');

          data.products.forEach((product: Product, index: number) => {
            receiptData
              .ele('ITEM')
              .ele('ID', (index + 1).toString())
              .up()
              .ele('DESC', product.product_name)
              .up()
              .ele('QTY', product.sold_quantity)
              .up()
              .ele('TAXCODE', product.tax_codeValue)
              .up()
              .ele('AMT', product.selling_price)
              .up()
              .up();
          });

          receiptData
            .up()
            .ele('TOTALS')
            .ele('TOTALTAXEXCL', totalTaxExcl.toFixed(2))
            .up()
            .ele('TOTALTAXINCL', totalTaxIncl.toFixed(2))
            .up()
            .ele('DISCOUNT', 0)
            .up()
            .up()
            .ele('PAYMENTS')
            .ele('PMTTYPE', 'INVOICE')
            .up()
            .ele('PMTAMOUNT', sale.total_amount)
            .up()
            .up()
            .ele('VATTOTALS')
            .ele('VATRATE', 'A')
            .up()
            .ele('NETTAMOUNT', '18.90')
            .up()
            .ele('TAXAMOUNT', totalTax.toFixed(2))
            .up()
            .up();

          let receiptXml = receiptData.end({ pretty: true });
          receiptXml = removeXmlDecLine(receiptXml);

          const { privateKey, serialNumber } = await getPrivateKeyAndSerialNumber();
          const payloadDataSignature = await encryptAndSignData(receiptXml, privateKey);

          const signedReceipt = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <EFDMS>
    ${receiptXml}
    <EFDMSSIGNATURE>${payloadDataSignature}</EFDMSSIGNATURE>
  </EFDMS>`;

          const headers = {
            'Content-Type': 'application/xml',
            'Routing-Key': 'vfdrct',
            'Cert-Serial': Buffer.from(serialNumber).toString('base64'),
            'Client': 'webapi',
            'Authorization': `Bearer ${accessToken}`,
          };

          try {
            const response = await axios.post('https://vfdtest.tra.go.tz/api/efdmsrctinfo', signedReceipt, {
              headers,
            });

            const parser = new xml2js.Parser();
            const responseXml = response.data;

            const result = await parser.parseStringPromise(responseXml);
            ackCode = result.EFDMS.RCTACK[0].ACKCODE[0];
            // console.log('ACKCODE:', ackCode);

            if (ackCode === '0') {
              GC++;
              RCTNUM++;
              DC++;

              const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false }).replace(/:/g, '');
              const receiptCode = `${tra.receiptCode}${GC}_${currentTime}`;
              const qrCodeImage = await QRCode.toDataURL(receiptCode);
              await insertInvoiceDetails(sale_id, invoice_number, qrCodeImage);

              db.run(
                `UPDATE reportCredential SET rctnum = ?, dc = ?, gc = ?, rct_date = ?, znum = ?, time = ?`,
                [RCTNUM, DC, GC, new Date().toISOString(), ZNUM, currentTime],
                (err) => {
                  if (err) console.error('Error updating reportCredential:', err);
                }
              );

              db.run('DELETE FROM receipt_que WHERE sale_id = ?', [sale_id], (err) => {
                if (err) {
                  console.error('Error deleting from receipt_que:', err);
                }
              });

              retry = false;
            } else {
              await new Promise((resolve) => setTimeout(resolve, 5000));
              console.log('Retrying...');
            }
          } catch (error) {
            console.error('Error sending receipt to TRA:', error);
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      } catch (error) {
        console.error('Error handling receipt:', error);
      }
    }
  );
}
