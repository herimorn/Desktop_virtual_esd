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
  const db = connectToDatabase();
  // console.log('the send to tra is data is', data);

  // Acquire lock for the sale_id
  const lockAcquired = await acquireLock(data.sale_id);
  if (!lockAcquired) {
    throw new Error('Failed to acquire lock for sale_id: ' + data.sale_id);
  }

  try {
    // Check if there's a receipt in progress for this sale
    const processingReceipt = await new Promise<boolean>((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) AS count FROM receipt_que WHERE sale_id = ? AND status = "progress"',
        [data.sale_id],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row.count > 0);
          }
        },
      );
    });

    if (processingReceipt) {
      throw new Error(
        'Another receipt is currently being processed for this sale. Please wait until it completes.',
      );
    }

    // Update sale status to "in_progress"
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE Sales SET status = ? WHERE id = ?',
        ['processing', data.sale_id],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });

    const { sale_id, tin, customer_name, phone, invoice_number } = data;
    const sanitizedPhone = phone.replace('+', '');

    try {
      const sale: Sale | undefined = await new Promise((resolve, reject) => {
        db.get<Sale>(
          'SELECT * FROM Sales WHERE id = ?',
          [sale_id],
          (err, row) => {
            if (err) {
              reject(err);
            } else {
              resolve(row);
            }
          },
        );
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
      const currentZNUM = `${currentDate.getFullYear()}${(currentDate.getMonth() + 1).toString().padStart(2, '0')}${currentDate.getDate().toString().padStart(2, '0')}`;
      const currentTime = currentDate.toTimeString().split(' ')[0];

      if (currentZNUM !== ZNUM) {
        DC = 1;
        ZNUM = currentZNUM;

        await new Promise<void>((resolve, reject) => {
          db.run(
            'UPDATE reportCredential SET znum = ?, dc = ?, time = ?, rct_date = ?',
            [ZNUM, DC, currentTime, new Date().toISOString()],
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

      let ackCode: string | undefined;
      let retry = true;

      while (retry) {
        let totalTax = 0;
        let totalTaxExcl = 0;
        let totalTaxIncl = 0;
        data.products.forEach((product: Product) => {
          const productTotalExcl =
            product.sold_quantity * product.selling_price;
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
        // console.log('the receipt xml is: ' + receiptXml);

        const { privateKey, serialNumber } =
          await getPrivateKeyAndSerialNumber();
        const payloadDataSignature = await encryptAndSignData(
          receiptXml,
          privateKey,
        );

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

        try {
          const response = await axios.post(
            'https://vfdtest.tra.go.tz/api/efdmsrctinfo',
            signedReceipt,
            {
              headers,
            },
          );

          const parser = new xml2js.Parser();
          const responseXml = response.data;

          const result = await parser.parseStringPromise(responseXml);
          ackCode = result.EFDMS.RCTACK[0].ACKCODE[0];
          // console.log('the response receipt is', response);
          // console.log('ACKCODE:', ackCode);

          if (ackCode === '0') {
            // Update the queue status to "completed"
            await new Promise<void>((resolve, reject) => {
              db.run(
                'UPDATE receipt_que SET status = "success", gc = ?, rctnum = ?, dc = ?, znum = ?, receiptCode = ?, customer_name = ?, sanitizedPhone = ?, totalTaxExcl = ?, totalTaxIncl = ?, TotalTax = ? WHERE sale_id = ?',
                [
                  GC,
                  RCTNUM,
                  DC,
                  ZNUM,
                  tra.receiptCode,
                  customer_name,
                  sanitizedPhone,
                  totalTaxExcl,
                  totalTaxIncl,
                  totalTax,
                  data.sale_id,
                ],
                function (err) {
                  if (err) {
                    console.error(
                      'Error updating receipt_que status to success:',
                      err.message,
                    ); // Log the error
                    reject(err);
                  } else {
                    // console.log(
                    //   'Updated receipt_que status to success for sale_id:',
                    //   data.sale_id,
                    // ); // Log successful update
                    resolve();
                  }
                },
              );
            });
            // Update sale status to "in_progress"
            await new Promise<void>((resolve, reject) => {
              db.run(
                'UPDATE Sales SET status = ? WHERE id = ?',
                ['success', data.sale_id],
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                },
              );
            });

            GC++;
            RCTNUM++;
            DC++;

            const currentTime = new Date()
              .toLocaleTimeString('en-GB', { hour12: false })
              .replace(/:/g, '');
            const receiptCode = `https://virtual.tra.go.tz/efdmsRctVerify/${tra.receiptCode}${GC}_${currentTime}`;
            const qrCodeImage = await QRCode.toDataURL(receiptCode, {
              type: 'image/png',
            });
            await insertInvoiceDetails(sale_id, invoice_number, qrCodeImage);

            // Update reportCredential with new GC, RCTNUM, and DC
            await new Promise<void>((resolve, reject) => {
              db.run(
                'UPDATE reportCredential SET gc = ?, rctnum = ?, dc = ?',
                [GC, RCTNUM, DC],
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                },
              );
            });

            //insert the receipt in que putting the status of success !!!!
            await new Promise<void>((resolve, reject) => {
              db.run(
                'INSERT INTO receipt_que (sale_id, receipt, status, gc, rctnum, dc, znum, receiptCode, customer_name, sanitizedPhone, totalTaxExcl, totalTaxIncl, TotalTax, invoice_number) VALUES (?, ?, "success", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  data.sale_id,
                  '',
                  GC,
                  RCTNUM,
                  DC,
                  ZNUM,
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
                    // console.log('Inserted into receipt_que with id:', this.lastID);
                    const receiptId = this.lastID; // Get the last inserted ID

                    // Map through the products to insert them as receipt items
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
                              // console.log('Inserted item:', product.product_name);
                              resolveItem();
                            }
                          }
                        );
                      });
                    });

                    // Handle all the item insertions and resolve the main promise when done
                    Promise.all(itemInsertPromises)
                      .then(() => resolve())
                      .catch((itemErr) => {
                        console.error('Error with item inserts:', itemErr.message);
                        reject(itemErr);
                      });
                  }
                }
              );
            })
              .then(() => {
                // console.log('All receipt items have been inserted successfully');
              })
              .catch((error) => {
                console.error('Unexpected error:', error.message);
              });


            const successMessage = {
              receiptNumber: `${RCTNUM}`,
              date: `${new Date().toISOString().split('T')[0]}`,
              time: `${new Date().toISOString().split('T')[1].split('.')[0]}`,
              tin: `${tra.tin}`,
              customerId: `${data.tin}`,
              customerName: `${data.customer_name}`,
              vrn: `${tra.receiptCode}`,
              items: [
                {
                  item: `${data.products[0].product_name}`,
                  quantity: `${data.products[0].sold_quantity}`,
                  unitPrice: `${data.products[0].selling_price}`,
                  total: `${data.products[0].sold_quantity * data.products[0].selling_price}`,
                },
              ],
              totalExcludingTax: `${totalTaxExcl.toFixed(2)}`,
              totalIncludingTax: `${totalTaxIncl.toFixed(2)}`,
              discount: '0',
              taxTotal: `${totalTax.toFixed(2)}`,
              qrCode: qrCodeImage,
            };

            // console.log('success message', successMessage);

            return successMessage;


            //insert data

          } else {
            retry = true;
            // console.log('ACKCODE not 0, retrying...');
          }
        } catch (error) {
          console.error('Error while sending receipt to TRA:', error.message);
          retry = false;

          // Insert new receipt into queue with status "progress"
          // Insert new receipt into the queue with status "progress"
          await new Promise<void>(async (resolve, reject) => {
            try {
              // Check if GC, DC, and RCTNUM exist in the receipt_que table
              const query =
                'SELECT MAX(gc) as lastGC, MAX(dc) as lastDC, MAX(rctnum) as lastRCTNUM FROM receipt_que';

              db.get(query, [], async (err, row) => {
                if (err) {
                  console.error('Error querying receipt_que:', err.message);
                  return reject(err);
                }

                // Increment GC, DC, and RCTNUM if they exist, otherwise use the original values
                // Calculate New_GC
                const lastGC = row.lastGC ? parseInt(row.lastGC, 10) : GC;
                const New_GC = !isNaN(lastGC) ? lastGC + 1 : GC;

                // Calculate New_DC
                const lastDC = row.lastDC ? parseInt(row.lastDC, 10) : DC;
                const New_DC = !isNaN(lastDC) ? lastDC + 1 : DC;

                // Calculate New_RCTNUM
                const lastRCTNUM = row.lastRCTNUM
                  ? parseInt(row.lastRCTNUM, 10)
                  : RCTNUM;
                const New_RCTNUM = !isNaN(lastRCTNUM) ? lastRCTNUM + 1 : RCTNUM;

                // Now insert the new receipt into receipt_que
                db.run(
                  'INSERT INTO receipt_que (sale_id, receipt, status, gc, rctnum, dc, znum, receiptCode, customer_name, sanitizedPhone, totalTaxExcl, totalTaxIncl, TotalTax, invoice_number) VALUES (?, ?, "progress", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                  [
                    data.sale_id,
                    '',
                    New_GC,
                    New_RCTNUM,
                    New_DC,
                    ZNUM,
                    tra.receiptCode,
                    customer_name,
                    sanitizedPhone,
                    totalTaxExcl,
                    totalTaxIncl,
                    totalTax,
                    invoice_number,
                  ],
                  async function (err) {
                    if (err) {
                      console.error(
                        'Error inserting into receipt_que:',
                        err.message,
                      ); // Log the error
                      return reject(err);
                    } else {
                      // console.log(
                      //   'Inserted into receipt_que with id:',
                      //   this.lastID,
                      // ); // Log successful insertion
                      const receiptId = this.lastID; // Get the last inserted ID for the receipt_que entry

                      try {
                        // Insert items associated with this receipt
                        const itemInsertPromises = data.products.map(
                          (product: Product) => {
                            return new Promise<void>(
                              (resolveItem, rejectItem) => {
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
                                      console.error(
                                        'Error inserting into receipt_items:',
                                        err.message,
                                      ); // Log the error
                                      return rejectItem(err);
                                    } else {
                                      // console.log(
                                      //   'Inserted item:',
                                      //   product.product_name,
                                      // );
                                      // Log successful insertion
                                      resolveItem();
                                    }
                                  },
                                );
                              },
                            );
                          },
                        );

                        // Handle all item inserts and resolve the main promise when done
                        await Promise.all(itemInsertPromises);
                        resolve();
                      } catch (itemErr) {
                        console.error(
                          'Error with item inserts:',
                          itemErr.message,
                        ); // Log any errors from item inserts
                        reject(itemErr);
                      }
                    }
                  },
                );
              });
            } catch (error) {
              console.error('Unexpected error:', error.message);
              reject(error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error:', error.message);
      throw error;
    } finally {
      // Release lock for the sale_id
      await releaseLock(data.sale_id);
    }
  } catch (error) {
    console.error('Error acquiring lock:', error.message);
    throw error;
  }
}
const INITIAL_RETRY_DELAY_MS = 1000; // Initial delay of 1 second
const MAX_RETRY_DELAY_MS = 110000;

export async function processReceiptQueue() {
  const db = connectToDatabase();

  while (true) {
    const receipt = await new Promise<any>((resolve, reject) => {
      db.all(
        `SELECT
          receipt_que.*,
          receipt_items.product_name,
          receipt_items.quantity,
          receipt_items.amount,
          receipt_items.tax_code
        FROM
          receipt_que
        LEFT JOIN
          receipt_items
        ON
          receipt_que.id = receipt_items.receipt_id
        WHERE
          receipt_que.status = "progress"
        ORDER BY
          receipt_que.created_at ASC
        LIMIT 1`,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        },
      );
    });

    if (receipt && receipt.length > 0) {
      const receiptData = receipt[0];
      const receiptId = receiptData.id;
      let success = false;
      let retryDelay = INITIAL_RETRY_DELAY_MS;

      while (!success) {
        try {
          await handleReceiptProcessing(receiptData);
          // console.log('Processed receipt:', receiptData);
          success = true; // Exit retry loop on success
        } catch (error) {
          console.error('Error processing receipt, retrying:', error);
          await updateReceiptStatus(receiptId, 'progress'); // Mark as failed if desired
          await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait before retrying
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS); // Exponential backoff
        }
      }
    } else {
      // No receipts to process, wait before checking again
      await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 60 seconds
    }
  }
}

// Function for handling processing receipts
async function handleReceiptProcessing(receipt: any) {
  const receiptId = receipt.id;
  const receiptData = {
    products: [
      {
        // Replace with actual mapping
        product_name: receipt.product_name,
        sold_quantity: receipt.quantity,
        selling_price: receipt.amount,
        tax_codeValue: receipt.tax_code,
      },
    ],
    sale_id: receipt.sale_id,
    customerId: '', // Populate these fields
    customerName: receipt.customer_name,
    customerMobile: receipt.sanitizedPhone,
    totalTaxExcl: receipt.totalTaxExcl,
    totalTaxIncl: receipt.totalTaxIncl,
    Mobile: receipt.sanitizedPhone,
    totalTax: receipt.totalTax,
    rctnum: receipt.rctnum,
    gc: receipt.gc,
    dc: receipt.dc,
    znum: receipt.znum,
    receiptCode: receipt.receiptCode,
    invoice_number: receipt.invoice_number,
    description: '',
    quantity: 0, // Calculate or populate this
    amount: 0, // Calculate or populate this
    customer_name: receipt.customer_name,
    tin: 0, // Populate this field
    phone: receipt.sanitizedPhone,
  };

  try {
    const xmlData = await prepareReceiptData(receiptData);
    const receiptXml = removeXmlDecLine(xmlData);
    const { privateKey, serialNumber } = await getPrivateKeyAndSerialNumber();
    const payloadDataSignature = await encryptAndSignData(
      receiptXml,
      privateKey,
    );

    const signedReceipt = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<EFDMS>
${receiptXml}
<EFDMSSIGNATURE>${payloadDataSignature}</EFDMSSIGNATURE>
</EFDMS>`;
    // console.log('The receipt data in prepareReceiptData is:', receiptData);
    // console.log('The send XML data is:', signedReceipt);

    const accessToken = await fetchTokenFromDatabase();
    const headers = {
      'Content-Type': 'application/xml',
      'Routing-Key': 'vfdrct',
      'Cert-Serial': Buffer.from(serialNumber).toString('base64'),
      Client: 'webapi',
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await axios.post(
      'https://vfdtest.tra.go.tz/api/efdmsrctinfo',
      signedReceipt,
      { headers },
    );
    // console.log('New TRA response:', response.data);
    const parser = new xml2js.Parser();
    const responseXml = response.data;
    const result = await parser.parseStringPromise(responseXml);
    const ackCode = result.EFDMS.RCTACK[0].ACKCODE[0];
    // console.log('New TRA response:', response.data);
    // console.log('ACKCODE:', ackCode);

    if (ackCode === '0') {
      // If ACKCODE is 0, update the status to success
      await updateReceiptStatus(receiptId, 'success');
      const db = connectToDatabase();

      // Further processing
      const currentTime = new Date()
        .toLocaleTimeString('en-GB', { hour12: false })
        .replace(/:/g, '');
      const receiptCode = `https://virtual.tra.go.tz/efdmsRctVerify/${receiptData.receiptCode}${receiptData.gc}_${currentTime}`;
      const qrCodeImage = await QRCode.toDataURL(receiptCode);

      const {
        sale_id,
        totalTaxExcl,
        totalTaxIncl,
        totalTax,
        rctnum,
        dc,
        gc,
        znum,
      } = receiptData;
      // console.log('this is the data for the ', receiptData);
      //the problem there is no invoice number but the invoice number is just come from sale
      await insertInvoiceDetails(
        sale_id,
        receiptData.invoice_number,
        qrCodeImage,
      );

      await new Promise<void>((resolve, reject) => {
        db.run(
          `UPDATE reportCredential SET rctnum = ?, dc = ?, gc = ?, rct_date = ?, znum = ?, time = ?`,
          [
            rctnum,
            dc,
            gc,
            new Date().toISOString(),
            receiptData.znum,
            currentTime,
          ],
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          },
        );
      });

      // await new Promise<void>((resolve, reject) => {
      //   const formattedDate = getFormattedDate(new Date());
      //   db.run(
      //     `INSERT INTO receipt (rctnum, dc, gc, rct_date, znum, time, daily_total_amount, gross_amount, tax_amount)
      //      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      //     [rctnum, dc, gc, formattedDate, receiptData.znum, currentTime, totalTaxExcl, totalTaxIncl, totalTax],
      //     (err) => {
      //       if (err) {
      //         reject(err);
      //       } else {
      //         resolve();
      //       }
      //     }
      //   );
      // });
      // Update the status of the sale to success
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
    } else {
      // If ACKCODE is not 0, mark receipt as failed
      await updateReceiptStatus(receiptId, 'progress');
    }

    return response.data;
  } catch (error) {
    console.error('Error sending receipt to TRA:', error);
    await updateReceiptStatus(receiptId, 'progress'); // Optionally mark as failed if desired
    throw error; // Rethrow to allow retry loop in processReceiptQueue to handle it
  }
}

// Prepare receipt data
async function prepareReceiptData(data: {
  products: Product[];
  sale_id: number;
  customerId: string;
  customerName: string;
  customerMobile: string;
  invoiceNumber: string;
  description: string;
  quantity: number;
  amount: number;
  rctnum: number;
  gc: number;
  dc: number;
  receiptCode: string;
  znum: string;
  Mobile: string;
  totalTaxExcl: number;
  totalTaxIncl: number;
  customer_name: string;
  tin: number;
  invoice_number: string;
  totalTax: number;
  phone: string;
}) {
  const db = connectToDatabase();
  const sale: Sale | undefined = await new Promise((resolve, reject) => {
    db.get<Sale>(
      'SELECT * FROM Sales WHERE id = ?',
      [data.sale_id],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      },
    );
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
    .ele('CUSTID', 203456789)
    .up()
    .ele('CUSTNAME', data.customer_name)
    .up()
    .ele('MOBILENUM', data.customerMobile)
    .up()
    .ele('RCTNUM', data.rctnum)
    .up()
    .ele('DC', data.dc)
    .up()
    .ele('GC', data.gc)
    .up()
    .ele('ZNUM', data.znum)
    .up()
    .ele('RCTVNUM', data.receiptCode)
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
    .ele('TOTALTAXEXCL', data.totalTaxExcl.toFixed(2))
    .up()
    .ele('TOTALTAXINCL', data.totalTaxIncl.toFixed(2))
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
    .ele('TAXAMOUNT', data.totalTax.toFixed(2))
    .up()
    .up();
  return receiptData.end({ pretty: true });
}

async function updateReceiptStatus(receiptId: number, status: string) {
  const db = connectToDatabase();
  return new Promise<void>((resolve, reject) => {
    db.run(
      'UPDATE receipt_que SET status = ? WHERE id = ?',
      [status, receiptId],
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

// Start processing the queue
// processReceiptQueue();
// processReceiptQueue();

ipcMain.handle('send-receipt', async (event, data) => {
  try {
    const response = await sendReceiptToTRA(data);
    return { success: true, data: response };
  } catch (error: any) {
    console.error('Error handling send-receipt:', error);
    return { success: false, error: error.message };
  }
});
