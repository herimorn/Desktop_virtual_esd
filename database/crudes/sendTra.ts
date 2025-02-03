import sqlite3 from 'sqlite3';
import xmlbuilder from 'xmlbuilder';
import axios from 'axios';
import crypto from 'crypto';
import { ipcMain } from 'electron';
import xml2js from 'xml2js';
import QRCode from 'qrcode';
import process from 'process';
import { format } from 'date-fns';
import { connectToDatabase } from '../../src/main/database';

interface Product {
  tax_id: any;
  tax_codeType: any;
  product_id: number;
  product_name: string;
  itemCode: string;
  sold_quantity: number;
  selling_price: number;
  buying_price: number;
  profit: number;
  tax_codeValue: number;
}

interface Sale {
  id: number;
  tin: string;
  total_tax_excl: number;
  total_tax_incl: number;
  total_tax: number;
  total_amount: number;
  products: Product[];
}

interface TRA {
  receiptCode: Object | undefined;
  certKey: string;
  tin: string;
  regId: string;
  gc: string;
}

const db=connectToDatabase();

function getFormattedDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Function to remove the XML declaration line
export const removeXmlDecLine = (xml: string): string => {
  // console.log('Input XML:', xml);
  return xml.replace(/<\?xml.*?\?>/, '').trim();
};

// Function to fetch the token from the database
async function fetchTokenFromDatabase(): Promise<string> {
  const db = connectToDatabase();
  return new Promise((resolve, reject) => {
    db.get('SELECT token FROM token ORDER BY id DESC LIMIT 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row?.token || '');
      }
    });
  });
}

// Function to get or initialize credentials (GC, RCTNUM, DC, ZNUM)
async function getOrInitializeCredentials(): Promise<{
  GC: number;
  RCTNUM: number;
  DC: number;
  ZNUM: string;
}> {
  const db = connectToDatabase();

  return new Promise((resolve, reject) => {
    db.get(
      'SELECT gc, rctnum, dc, znum FROM reportCredential LIMIT 1',
      (err, row) => {
        if (err) {
          reject(err);
        } else if (row && row.gc && row.rctnum && row.dc && row.znum) {
          // Credentials exist in reportCredential
          resolve({
            GC: parseInt(row.gc),
            RCTNUM: parseInt(row.rctnum),
            DC: parseInt(row.dc),
            ZNUM: parseInt(row.znum),
          });
        } else {
          // Fetch from TRA table if not found in reportCredential
          db.get('SELECT gc FROM TRA LIMIT 1', (errTRA, rowTRA) => {
            if (errTRA) {
              reject(errTRA);
            } else if (rowTRA && rowTRA.gc) {
              const currentDate = new Date();
              const currentZNUM = `${currentDate.getFullYear()}${(
                currentDate.getMonth() + 1
              )
                .toString()
                .padStart(
                  2,
                  '0',
                )}${currentDate.getDate().toString().padStart(2, '0')}`;
              const currentTime = currentDate.toTimeString().split(' ')[0]; // Get time in hh:mm:ss format

              // Insert the fetched credentials into reportCredential
              db.run(
                'INSERT INTO reportCredential (gc, rctnum, dc, znum, rct_date,time) VALUES (?, ?, ?, ?, ?,?)',
                [
                  parseInt(rowTRA.gc, 10),
                  parseInt(rowTRA.gc, 10),
                  1,
                  currentZNUM,
                  getFormattedDate,
                  currentTime,
                ],
                (insertErr) => {
                  if (insertErr) {
                    reject(insertErr);
                  } else {
                    resolve({
                      GC: parseInt(rowTRA.gc, 10),
                      RCTNUM: parseInt(rowTRA.gc, 10),
                      DC: 1,
                      ZNUM: currentZNUM,
                    });
                  }
                },
              );
            } else {
              // Initialize default values if not found in both tables
              const currentDate = new Date();
              const currentZNUM = `${currentDate.getFullYear()}${(
                currentDate.getMonth() + 1
              )
                .toString()
                .padStart(
                  2,
                  '0',
                )}${currentDate.getDate().toString().padStart(2, '0')}`;

              const defaultCredentials = {
                GC: 1,
                RCTNUM: 1,
                DC: 1,
                ZNUM: currentZNUM,
              };

              // Insert default credentials into reportCredential table
              db.run(
                'INSERT INTO reportCredential (gc, rctnum, dc, znum, rct_date) VALUES (?, ?, ?, ?, ?)',
                [
                  defaultCredentials.GC,
                  defaultCredentials.RCTNUM,
                  defaultCredentials.DC,
                  currentZNUM,
                  new Date().toISOString(),
                ],
                (insertErr) => {
                  if (insertErr) {
                    reject(insertErr);
                  } else {
                    resolve(defaultCredentials);
                  }
                },
              );
            }
          });
        }
      },
    );
  });
}

// Function to get the private key and serial number
async function getPrivateKeyAndSerialNumber(): Promise<{
  privateKey: string;
  serialNumber: string;
}> {
  const db = connectToDatabase();
  return new Promise((resolve, reject) => {
    db.get('SELECT privateKey, serialNumber FROM pfx LIMIT 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        if (row) {
          resolve({
            privateKey: row.privateKey,
            serialNumber: row.serialNumber,
          });
        } else {
          reject(new Error('Private key or serial number not found'));
        }
      }
    });
  });
}

// Function to encrypt and sign data
async function encryptAndSignData(
  data: string,
  privateKey: string,
): Promise<string> {
  const messageToSign = data.replace(/>\s+</g, '><').trim();
  const sign = crypto.createSign('RSA-SHA1');

  sign.update(messageToSign);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

// Function to send receipt to TRA
async function insertInvoiceDetails(
  saleId: number,
  invoiceNumber: string,
  qrCodeImageUrl: string,
): Promise<void> {
  const db = connectToDatabase();
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO InvoiceDetails (sale_id, invoice_number, qr_code_image_url) VALUES (?, ?, ?)',
      [saleId, invoiceNumber, qrCodeImageUrl],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
}

async function acquireLock(saleId: number): Promise<boolean> {
  const db = connectToDatabase();
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO locks (sale_id) VALUES (?) ON CONFLICT(sale_id) DO UPDATE SET locked_at = CURRENT_TIMESTAMP',
      [saleId],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      },
    );
  });
}

async function releaseLock(saleId: number): Promise<void> {
  const db = connectToDatabase();
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM locks WHERE sale_id = ?', [saleId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

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
  console.log("the data are",data)
  const { sale_id, tin, customer_name, phone, invoice_number } = data;
  const sanitizedPhone = phone.replace('+', '');


  const getTaxIdByCodeType = (codeType) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT id FROM Tax WHERE codeType = ?`;
      db.get(query, [codeType], (err, row) => {
        if (err) {
          console.error(`Error fetching tax ID for codeType ${codeType}:`, err.message);
          return reject(err);
        }
        resolve(row ? row.id : null); // Return the id or null if not found
      });
    });
  };


  // Fetch the sale record
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

  // Fetch TRA details
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

  // Fetch the access token
  const accessToken = await fetchTokenFromDatabase();
  if (!accessToken) {
    throw new Error('Access token not found');
  }

  // Fetch the latest receipt data from the queue
  const lastReceipt: any = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM receipt_que ORDER BY id DESC LIMIT 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

  let gc:any;
  let rctnum:any;
  let dc:any;
  const currentDate = new Date();
  const todayZNUM = currentDate.toISOString().split('T')[0].replace(/-/g, '');

  // If no receipt in the queue, fetch initial values from TRA table
  if (!lastReceipt) {
     gc = tra.gc || 1;
    rctnum = tra.gc || 1;
    dc = tra.dc || 1;
  } else if (lastReceipt.znum === todayZNUM) {
    // If there's a receipt from today, increment the values
    gc = parseInt(lastReceipt.gc) + 1;
    rctnum = parseInt(lastReceipt.rctnum) + 1;
    dc = parseInt(lastReceipt.dc) + 1;
  } else {
    // It's a new day, reset the counters
    dc = 1;
    gc = parseInt(lastReceipt.gc) + 1;
    rctnum = parseInt(lastReceipt.rctnum) + 1;
  }
  let totalTax = 0;
  let totalTaxExcl = 0;
  let totalTaxIncl = 0;
  let vatTotalsMap = {}; // To store total amounts for each VAT rate

  data.products.forEach((product: Product) => {
    const productTotalExcl = product.sold_quantity * product.selling_price;
  const productTaxAmount = Math.round(productTotalExcl * (product.tax_codeValue / 100));
 // Ensure this uses the correct tax rate
    const productTotalIncl = productTotalExcl + productTaxAmount;

    // Update overall totals
    totalTaxExcl += productTotalExcl;
    totalTax += productTaxAmount;
    totalTaxIncl += productTotalIncl;

  // Group by VAT rate
  const vatRate = product.tax_codeValue; // VAT rate for the current product
  const taxCodeType = product.tax_codeType; // Assuming the format "codeA"
  const vatKey = taxCodeType.charAt(4); // Extract only the letter part, e.g., "A"

  if (!vatTotalsMap[vatKey]) {
    vatTotalsMap[vatKey] = { nettAmount: 0, taxAmount: 0 };
  }
  vatTotalsMap[vatKey].nettAmount += productTotalExcl; // Sum the net amounts for the VAT rate
  vatTotalsMap[vatKey].taxAmount += productTaxAmount;  // Sum the tax amounts for the VAT rate
});

 console.log("the data for product is ",data.products);

  const receiptData = `
  <RCT>
    <DATE>${new Date().toISOString().split('T')[0]}</DATE>
    <TIME>${new Date().toISOString().split('T')[1].split('.')[0]}</TIME>
    <TIN>${tra.tin}</TIN>
    <REGID>${tra.regId}</REGID>
    <EFDSERIAL>${tra.certKey}</EFDSERIAL>
    <CUSTIDTYPE>1</CUSTIDTYPE>
    <CUSTID>${tin}</CUSTID>
    <CUSTNAME>${customer_name}</CUSTNAME>
    <MOBILENUM>${sanitizedPhone}</MOBILENUM>
    <RCTNUM>${rctnum}</RCTNUM>
    <DC>${dc}</DC>
    <GC>${gc}</GC>
    <ZNUM>${todayZNUM}</ZNUM>
    <RCTVNUM>${tra.receiptCode}${tra.gc}</RCTVNUM>
  <ITEMS>

  ${data.products.map((product, index) => {
    // Calculate the price including tax for a single item
    const priceWithTax = product.selling_price * (1 + product.tax_codeValue / 100); // selling_price includes the tax for one item
    // const taxId = getTaxIdByCodeType(product.tax_codeType); // Get tax_id from the database
    // Calculate the total amount for this product based on the quantity sold
    const totalAmount = priceWithTax * product.sold_quantity;

    return `
      <ITEM>
        <ID>${index + 1}</ID>
        <DESC>${product.product_name}</DESC>
        <QTY>${product.sold_quantity}</QTY>
        <TAXCODE>${product.tax_id}</TAXCODE>
        <AMT>${priceWithTax}</AMT> <!-- The total amount includes tax and quantity -->
      </ITEM>
    `;
  }).join('')}
</ITEMS>
    <TOTALS>
      <TOTALTAXEXCL>${totalTaxExcl}</TOTALTAXEXCL>
      <TOTALTAXINCL>${totalTaxIncl}</TOTALTAXINCL>
      <DISCOUNT>0</DISCOUNT>
    </TOTALS>
      <PAYMENTS>
      <PMTTYPE>INVOICE</PMTTYPE>
      <PMTAMOUNT>${totalTaxIncl}</PMTAMOUNT>
    </PAYMENTS>

  <VATTOTALS>
    ${Object.keys(vatTotalsMap).map(vatKey => `
      <VATRATE>${vatKey}</VATRATE> <!-- Now only the letter 'A' is shown -->
      <NETTAMOUNT>${vatTotalsMap[vatKey].nettAmount.toFixed(2)}</NETTAMOUNT>
      <TAXAMOUNT>${vatTotalsMap[vatKey].taxAmount.toFixed(2)}</TAXAMOUNT>
    `).join('')}
  </VATTOTALS>

  </RCT>
  `;
  console.log("the send receipt payload is",receiptData)

  // Now you can use `receiptData` as the payload for your request.
const receiptXml=receiptData;
  // Sign and encrypt the receipt
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
    Client: 'webapi',
    Authorization: `Bearer ${accessToken}`,
  };

  // Send receipt to TRA
  try {
    const response = await axios.post(
      'https://vfdtest.tra.go.tz/api/efdmsrctinfo',
      signedReceipt,
      { headers }
    );

    const parser = new xml2js.Parser();
    const responseXml = response.data;

    const result = await parser.parseStringPromise(responseXml);
    const ackCode = result.EFDMS.RCTACK[0].ACKCODE[0];
    // Extract the TIME value
const timeValue = result.EFDMS.RCTACK[0].TIME[0];

// Remove the colons from the TIME value
const new_current_time = timeValue.replace(/:/g, '');
    console.log('TRA response received:', response.data);
    console.log('the first time response is:', response);

    // Insert receipt into receipt_que
    if(ackCode=='0'){
      await new Promise<void>((resolve, reject) => {
        db.run(
          `INSERT INTO receipt_que (sale_id, receipt, status, gc, rctnum, dc, znum, receiptCode, customer_name, sanitizedPhone, totalTaxExcl, totalTaxIncl, TotalTax, invoice_number)
          VALUES (?, ?, "success", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sale_id,
            signedReceipt,
            gc,
            rctnum,
            dc,
            todayZNUM,
            tra.receiptCode,
            customer_name,
            sanitizedPhone,
            totalTaxExcl,
            totalTaxIncl,
            totalTax,
            invoice_number,
          ],
          function (err) {
            if (err) {
              console.error('Error inserting into receipt_que:', err.message);
              return reject(err);
            } else {
              const receiptId = this.lastID;
              // Insert items into receipt_items table
              const itemInsertPromises = data.products.map((product: Product) => {
                return new Promise<void>((resolveItem, rejectItem) => {
                  db.run(
                    'INSERT INTO receipt_items (receipt_id, product_name, quantity, amount, tax_code) VALUES (?, ?, ?, ?, ?)',
                    [
                      receiptId,
                      product.product_name,
                      product.sold_quantity,
                      product.selling_price,
                      product.tax_codeValue,
                    ],
                    (err) => {
                      if (err) {
                        console.error('Error inserting into receipt_items:', err.message);
                        return rejectItem(err);
                      } else {
                        resolveItem();
                      }
                    }
                  );
                });
              });

              Promise.all(itemInsertPromises)
                .then(() => resolve())
                .catch((err) => reject(err));
            }
          }
        );
      });
      //then update the status to success also
      await new Promise<void>((resolve, reject) => {
        db.run(
          'UPDATE Sales SET status = ? WHERE id = ?',
          ['success', sale_id],
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          },
        );
      });
      const currentTime = new Date()
      .toLocaleTimeString('en-GB', { hour12: false })
      .replace(/:/g, '');
    const receiptCode = `https://virtual.tra.go.tz/efdmsRctVerify/${tra.receiptCode}${gc}_${new_current_time}`;
    const qrCodeImage = await QRCode.toDataURL(receiptCode, {
      type: 'image/png',
    });
    await insertInvoiceDetails(sale_id, invoice_number, qrCodeImage);


    }else{
      //write the logic here now...
    }


  } catch (error) {
    console.error('Error while sending receipt to TRA:', error);
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO receipt_que (sale_id, receipt, status, gc, rctnum, dc, znum, receiptCode, customer_name, sanitizedPhone, totalTaxExcl, totalTaxIncl, TotalTax, invoice_number)
        VALUES (?, ?, "progress", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sale_id,
          signedReceipt,
          gc,
          rctnum,
          dc,
          todayZNUM,
          tra.receiptCode,
          customer_name,
          sanitizedPhone,
          totalTaxExcl,
          totalTaxIncl,
          totalTax,
          invoice_number,
        ],
        function (err) {
          if (err) {
            console.error('Error inserting into receipt_que:', err.message);
            return reject(err);
          } else {
            const receiptId = this.lastID;
            // Insert items into receipt_items table
            const itemInsertPromises = data.products.map((product: Product) => {
              return new Promise<void>((resolveItem, rejectItem) => {
                db.run(
                  'INSERT INTO receipt_items (receipt_id, product_name, quantity, amount, tax_code) VALUES (?, ?, ?, ?, ?)',
                  [
                    receiptId,
                    product.product_name,
                    product.sold_quantity,
                    product.selling_price,
                    product.tax_codeValue,
                  ],
                  (err) => {
                    if (err) {
                      console.error('Error inserting into receipt_items:', err.message);
                      return rejectItem(err);
                    } else {
                      resolveItem();
                    }
                  }
                );
              });
            });

            Promise.all(itemInsertPromises)
              .then(() => resolve())
              .catch((err) => reject(err));
          }
        }
      );
    });

          await new Promise<void>((resolve, reject) => {
            db.run(
              'UPDATE Sales SET status = ? WHERE id = ?',
              ['progress', sale_id],
              (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              },
            );
          });

  }
}

async function handleReceiptData(receiptData: {
  receipt: string;
  rctnum: string;
  gc: string;
  dc: string;
  znum: string;
  receiptCode: string;
  customer_name: string;
  sanitizedPhone: string;
  totalTaxExcl: number;
  totalTaxIncl: number;
  invoice_number: string;
  totalTax: number;
  sale_id: number; // Ensure sale_id is included
}) {
  try {
    console.log("receipt Data is",receiptData);
    // Validate receipt data
    if (!receiptData || !receiptData.receipt) {
      throw new Error('Invalid receipt data');
    }

    // Process the receipt data (example: logging or modifying the XML)
    console.log('Handling receipt data:', receiptData);

    // Example: Perform some operations with receiptData
    const modifiedReceipt = receiptData.receipt.replace(/somePattern/g, 'replacement');
    console.log('Modified Receipt XML:', modifiedReceipt);

    // Define the headers with your specific values
    const { privateKey, serialNumber } = await getPrivateKeyAndSerialNumber();
    const accessToken = await fetchTokenFromDatabase();
    if (!accessToken) {
      throw new Error('Access token not found');
    }

    const headers = {
      'Content-Type': 'application/xml',
      'Routing-Key': 'vfdrct',
      'Cert-Serial': Buffer.from(serialNumber).toString('base64'),
      Client: 'webapi',
      Authorization: `Bearer ${accessToken}`,
    };

    // Send the modified receipt to the external service
    const response = await axios.post(
      'https://vfdtest.tra.go.tz/api/efdmsrctinfo',
      modifiedReceipt,
      { headers }
    );

    // Parse the XML response from the external service
    const parser = new xml2js.Parser();
    const responseXml = response.data;
    const result = await parser.parseStringPromise(responseXml);
    const ackCode = result.EFDMS.RCTACK[0].ACKCODE[0];
    const timeValue = result.EFDMS.RCTACK[0].TIME[0];

// Remove the colons from the TIME value
const new_current_time = timeValue.replace(/:/g, '');
    console.log('TRA response received:', response.data);
      // Fetch TRA details
  const tra: TRA | undefined = await new Promise((resolve, reject) => {
    db.get<TRA>('SELECT * FROM TRA LIMIT 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

    // Check if the response is successful (based on your criteria)
    if (ackCode === '0') {
      // Update receipt status to "success"
      const currentTime = new Date()
      .toLocaleTimeString('en-GB', { hour12: false })
      .replace(/:/g, '');
    const receiptCode = `https://virtual.tra.go.tz/efdmsRctVerify/${tra.receiptCode}${receiptData.gc}_${new_current_time}`;
    const qrCodeImage = await QRCode.toDataURL(receiptCode, {
      type: 'image/png',
    });
    await insertInvoiceDetails(receiptData.sale_id, receiptData.invoice_number, qrCodeImage);

      await new Promise<void>((resolve, reject) => {
        db.run(
          `UPDATE receipt_que SET status = "success" WHERE rctnum = ?`,
          [receiptData.rctnum],
          (err) => {
            if (err) {
              console.error('Error updating receipt status to success:', err.message);
              return reject(err);
            }
            resolve();
          }
        );
      });


      // Also update the sale status to "success"
      await new Promise<void>((resolve, reject) => {
        db.run(
          `UPDATE sales SET status = "success" WHERE id = ?`,
          [receiptData.sale_id],
          (err) => {
            if (err) {
              console.error('Error updating sale status to success:', err.message);
              return reject(err);
            }
            resolve();
          }
        );
      });

      console.log(`Receipt ${receiptData.rctnum} and Sale ${receiptData.sale_id} processed successfully.`);
    } else {
      console.error(`Failed to process receipt ${receiptData.rctnum}. ACKCODE: ${ackCode}`);

      // Update receipt status to "progress" and sale status to "progress"
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          db.run(
            `UPDATE receipt_que SET status = "progress" WHERE rctnum = ?`,
            [receiptData.rctnum],
            (err) => {
              if (err) {
                console.error('Error updating receipt status to progress:', err.message);
                return reject(err);
              }
              resolve();
            }
          );
        }),
        new Promise<void>((resolve, reject) => {
          db.run(
            `UPDATE sales SET status = "progress" WHERE id = ?`,
            [receiptData.sale_id],
            (err) => {
              if (err) {
                console.error('Error updating sale status to progress:', err.message);
                return reject(err);
              }
              resolve();
            }
          );
        })
      ]);

      console.log(`Receipt ${receiptData.rctnum} failed. Sale ${receiptData.sale_id} status updated to progress.`);
    }
  } catch (error) {
    console.error(`Error handling receipt ${receiptData.rctnum}:`, error);

    // Ensure that in case of any unexpected error, receipt status is updated to "progress" and sale status to "progress"
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        db.run(
          `UPDATE receipt_que SET status = "progress" WHERE rctnum = ?`,
          [receiptData.rctnum],
          (err) => {
            if (err) {
              console.error('Error updating receipt status to progress:', err.message);
              return reject(err);
            }
            resolve();
          }
        );
      }),
      new Promise<void>((resolve, reject) => {
        db.run(
          `UPDATE sales SET status = "progress" WHERE id = ?`,
          [receiptData.sale_id],
          (err) => {
            if (err) {
              console.error('Error updating sale status to progress:', err.message);
              return reject(err);
            }
            resolve();
          }
        );
      })
    ]);
  }
}
const BATCH_SIZE = 10; // Define the number of receipts to process in each batch

export async function retryFailedReceipts(): Promise<void> {
  // Function to process a batch of receipts
  async function processBatch(receipts: any[]): Promise<void> {
    console.log("the new receipts are now",receipts);

    const retryPromises = receipts.map(async (receipt) => {
      try {
        // Reconstruct the data object for retry
        const receiptData = {
          receipt: receipt.receipt, // Directly use the XML string as receipt data
          rctnum: receipt.rctnum,
          gc: receipt.gc,
          dc: receipt.dc,
          znum: receipt.znum,
          receiptCode: receipt.receiptCode,
          customer_name: receipt.customer_name,
          sanitizedPhone: receipt.sanitizedPhone,
          totalTaxExcl: receipt.totalTaxExcl,
          totalTaxIncl: receipt.totalTaxIncl,
          invoice_number: receipt.invoice_number,
          totalTax: receipt.totalTax,
          sale_id:receipt.sale_id,
        };

        // Resend the receipt
        await  handleReceiptData(receiptData);
        // console.log("the receipt id is  ",receipt.id);

        // Mark the receipt as success upon successful retry
        // await new Promise<void>((resolve, reject) => {
        //   db.run(
        //     `UPDATE receipt_que SET status = "success" WHERE id = ?`,
        //     [receipt.id],
        //     (err) => {
        //       if (err) {
        //         console.error('Error updating receipt to success:', err.message);
        //         return reject(err);
        //       }
        //       resolve();
        //     }
        //   );
        // });
        //after then insert it into the invoice details one


        console.log(`Receipt ${receipt.id} retried successfully.`);
      } catch (error) {
        console.error(`Error retrying receipt ${receipt.id}:`, error);
        // Keep the status as "progress" for future retries
      }
    });

    // Wait for all retries to finish
    await Promise.all(retryPromises);
  }

  // Fetch receipts with 'progress' status in batches
  let offset = 0;

  while (true) {
    // Fetch a batch of receipts
    const pendingReceipts = await new Promise<any[]>((resolve, reject) => {
      db.all(
        'SELECT * FROM receipt_que WHERE status = "progress" LIMIT ? OFFSET ?',
        [BATCH_SIZE, offset],
        (err, rows) => {
          if (err) {
            console.error('Error fetching pending receipts:', err.message);
            return reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });

    if (pendingReceipts.length === 0) {
      console.log('No more pending receipts to retry.');
      break;
    }

    // Process the current batch of receipts
    await processBatch(pendingReceipts);

    // Move the offset for the next batch
    offset += BATCH_SIZE;
  }
}

// Periodically run the retry function
setInterval(async () => {
  try {
    console.log('Retrying failed receipts...');
    await retryFailedReceipts();
  } catch (error) {
    console.error('Error during batch retry:', error);
  }
},60000); // Retry every 60 seconds (adjust as needed)
// 120000
// 60000


ipcMain.handle('send-receipt', async (event, data) => {
  try {
    const response = await sendReceiptToTRA(data);
    return { success: true, data: response };
  } catch (error: any) {
    console.error('Error handling send-receipt:', error);
    return { success: false, error: error.message };
  }
});

// Fetch the latest GC, RCTNUM, and DC from the database

//initialization ,first to the database

