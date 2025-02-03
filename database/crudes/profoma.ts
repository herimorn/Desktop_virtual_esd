import { ipcMain } from 'electron';

import {connectToDatabase } from '../../src/main/database';
const db=connectToDatabase();
interface Product {
  product_id: number;
  product_name: string;
  itemCode: string;
  selling_price: number;
}
interface ProfomaDetails {
  profoma_id: number;
  date: string;
  total_amount: number;
  customer_name: string;
  products: Product[];
}
interface ProfomaDetail {
  sale_id: number;
  date: string;
  total_amount: number;
  customer_name: string;
  products: Product[];
}
ipcMain.handle('add-profoma', async (event, profoma) => {
  const { customer_id, transaction_status, transaction_type, products, total, total_tax, invoice_note } = profoma;

  console.log('Adding profoma:', profoma);

  return new Promise(async (resolve, reject) => {
    try {
      // Helper function to generate the profoma number
      const generateProfomaNumber = (invoiceString: string, invoiceNumber: number, isProforma: boolean) => {
        if (isProforma) {
          return `${invoiceString}PO${invoiceNumber}`; // Changed to 'po'
        }
        return `${invoiceString}${invoiceNumber}`; // Default for sales
      };

      // Function to get the starting invoice details
      const getStartingInvoiceDetails = () => {
        return new Promise((resolve, reject) => {
          db.get('SELECT invoice_string, invoice_number FROM Invoices LIMIT 1', (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            if (row) {
              resolve(row);
            } else {
              resolve({ invoice_string: 'ADV', invoice_number: 100 });
            }
          });
        });

      };

      // Function to get the maximum numeric part from the existing profoma numbers
      const getMaxNumericPartFromProfoma = () => {
        return new Promise((resolve, reject) => {
          db.get('SELECT profoma_number FROM profoma ORDER BY profoma_number DESC LIMIT 1', (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            if (row && row.profoma_number) {
              const match = row.profoma_number.match(/\d+$/);
              const maxNumericPart = match ? parseInt(match[0], 10) : null;
              resolve(isNaN(maxNumericPart) ? null : maxNumericPart);
            } else {
              resolve(null);
            }
          });
        });
      };

      // Retrieve starting invoice details and maximum numeric part
      const startingInvoiceDetails = await getStartingInvoiceDetails();
      const maxNumericPart = await getMaxNumericPartFromProfoma();

      // Determine the new invoice number
      const nextInvoiceNumber = maxNumericPart !== null ? maxNumericPart + 1 : startingInvoiceDetails.invoice_number;
      const invoiceString = startingInvoiceDetails.invoice_string;
      const newProfomaNumber = generateProfomaNumber(invoiceString, nextInvoiceNumber, true);

      // Insert new profoma record
      db.run(
        `INSERT INTO profoma (customer_id, date, total_amount, transaction_status, transaction_type, profoma_number, total_tax, invoice_description) VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)`,
        [customer_id, total, transaction_status, transaction_type, newProfomaNumber, total_tax, invoice_note],
        function (err) {
          if (err) {
            reject(err);
            return;
          }

          const saleId = this.lastID;

          db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            const insertSalesItem = db.prepare(`
              INSERT INTO profomaItems (profoma_id, product_id, quantity, price, tax)
              VALUES (?, ?, ?, ?, ?)
            `);

            products.forEach((product) => {
              const { product_id, quantity, price, tax } = product;
              insertSalesItem.run(saleId, product_id, quantity, price, tax);
            });

            insertSalesItem.finalize((err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
              } else {
                db.run('COMMIT');
                resolve({ id: saleId });
              }
            });
          });
        }
      );
    } catch (error) {
      reject(error);
    }
  });
});

// //display
ipcMain.handle('fetch-profomas', async () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT s.id AS profoma_id, s.profoma_number AS profoma_number,s.date, s.total_amount, c.name AS customer_name,s.converted_to_sale AS converted_to_sale,
  si.product_id, p.name AS product_name,p.description AS product_description, p.itemCode,p.itemType AS itemType,
      si.price AS selling_price
FROM profoma s
JOIN profomaItems si ON s.id = si.profoma_id
JOIN Products p ON si.product_id = p.id
JOIN Customers c ON s.customer_id = c.id
ORDER BY s.date DESC`,
      (err, rows) => {
        console.log("praforma rows is",rows)
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
});





ipcMain.handle('fetch-profomasDetails', async (event): Promise<ProfomaDetails[]> => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
    s.id AS profoma_id,
    s.profoma_number AS profoma_number,
    s.date,
    s.total_amount,
    c.name AS customer_name,
    c.tin AS customer_tin,
    c.address AS customer_address,
    c.phone AS customer_phone,
    c.email AS customer_email,
    c.vrn AS customer_vrn,
    si.product_id,
    p.name AS product_name,
    p.itemCode,
    p.itemType AS product_type,
    p.description AS description,
    si.quantity AS sold_quantity,
    si.price AS selling_price,
    t.codeType AS tax_codeType,
    t.codeValue AS tax_codeValue,
    t.id AS tax_id,
    CASE 
        WHEN p.itemType = 'Product' THEN pi.price 
        ELSE NULL 
    END AS buying_price,
    CASE 
        WHEN p.itemType = 'Product' THEN (si.quantity * si.price) - (si.quantity * pi.price) 
        ELSE NULL 
    END AS profit
FROM profoma s
JOIN profomaitems si ON s.id = si.profoma_id
JOIN Products p ON si.product_id = p.id
LEFT JOIN Tax t ON p.tax_id = t.id
LEFT JOIN PurchaseItems pi ON p.id = pi.product_id AND p.itemType = 'Product'
JOIN Customers c ON s.customer_id = c.id
ORDER BY s.date DESC;

    `, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const proformaDetails = rows.reduce((acc: { [key: number]: ProfomaDetail }, row) => {
          const { profoma_id, profoma_number, date, total_amount, customer_name, customer_phone, customer_address, customer_email, customer_tin,
                  product_id, product_name, itemCode, product_type, sold_quantity, selling_price, buying_price, profit,description,customer_vrn,
                  tax_codeValue,tax_codeType,tax_id} = row;

          if (!acc[profoma_id]) {
            acc[profoma_id] = {
              profoma_id,
              profoma_number,
              date,
              tax_codeValue,
              tax_codeType,
              tax_id,
              total_amount,
              customer_name,
              customer_phone,
              customer_address,
              customer_email,
              customer_tin,
              customer_vrn,
              description,
              products: [],
            };
          }

          acc[profoma_id].products.push({
            product_id,
            product_name,
            itemCode,
            profoma_number,
            tax_codeValue,
            tax_codeType,
            tax_id,
            description,
            sold_quantity,
            selling_price,
            buying_price: product_type === 'Product' ? buying_price : null,
            profit: product_type === 'Product' ? profit : null,
          });

          return acc;
        }, {});

        resolve(Object.values(proformaDetails));
      }
    });
  });
});

// Add this new handler for proforma conversion
ipcMain.handle('convert-proforma-to-invoice', async (event, proformaId: number) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // First, get the proforma details
      db.get(
        `SELECT p.*, c.name as customer_name
         FROM profoma p
         JOIN Customers c ON p.customer_id = c.id
         WHERE p.id = ?`,
        [proformaId],
        (err, proforma) => {
          if (err) {
            db.run('ROLLBACK');
            console.error('Error fetching proforma:', err);
            reject(err);
            return;
          }

          if (!proforma) {
            db.run('ROLLBACK');
            console.error('Proforma not found for ID:', proformaId);
            reject(new Error('Proforma not found'));
            return;
          }

          console.log('Proforma details:', proforma); // Log proforma details

          // Check if already converted
          if (proforma.converted_to_sale) {
            db.run('ROLLBACK');
            console.error('Proforma has already been converted to an invoice:', proformaId);
            reject(new Error('Proforma has already been converted to an invoice.'));
            return;
          }

          // Generate a unique invoice number
          generateUniqueInvoiceNumber()
            .then(newInvoiceNumber => {
              // Insert into Sales table
              db.run(
                `INSERT INTO Sales (
                  customer_id,
                  proforma_id,
                  date,
                  total_amount,
                  transaction_type,
                  transaction_status,
                  invoice_number,
                  status,
                  invoice_description
                ) VALUES (?, ?, datetime('now'), ?, ?, ?, ?, 'pending', ?)`,
                [
                  proforma.customer_id,
                  proformaId,
                  proforma.total_amount,
                  proforma.transaction_type,
                  proforma.transaction_status,
                  newInvoiceNumber,
                  proforma.invoice_description
                ],
                function(err) {
                  if (err) {
                    db.run('ROLLBACK');
                    console.error('Error inserting sale:', err);
                    reject(err);
                    return;
                  }

                  const newSaleId = this.lastID; // Capture the new sale ID
                  console.log('New sale inserted with ID:', newSaleId); // Log new sale ID

                  // Insert sale items from the proformaItems table
                  db.all(
                    `SELECT * FROM profomaItems WHERE profoma_id = ?`,
                    [proformaId],
                    (err, items) => {
                      if (err) {
                        db.run('ROLLBACK');
                        console.error('Error fetching proforma items:', err);
                        reject(err);
                        return;
                      }

                      const insertSalesItem = db.prepare(
                        `INSERT INTO SalesItems (
                          sale_id,
                          product_id,
                          quantity,
                          price
                        ) VALUES (?, ?, ?, ?)`
                      );

                      items.forEach(item => {
                        insertSalesItem.run(
                          newSaleId,
                          item.product_id,
                          item.quantity,
                          item.price
                        );
                      });

                      insertSalesItem.finalize(err => {
                        if (err) {
                          db.run('ROLLBACK');
                          console.error('Error finalizing sales item insertion:', err);
                          reject(err);
                          return;
                        }

                        // Update proforma status
                        db.run(
                          `UPDATE profoma
                           SET converted_to_sale = 1,
                               sale_id = ?
                           WHERE id = ?`,
                          [newSaleId, proformaId],
                          err => {
                            if (err) {
                              db.run('ROLLBACK');
                              console.error('Error updating proforma status:', err);
                              reject(err);
                              return;
                            }

                            db.run('COMMIT');
                            resolve({
                              success: true,
                              saleId: newSaleId,
                              invoiceNumber: newInvoiceNumber
                            });
                          }
                        );
                      });
                    }
                  );
                }
              );
            })
            .catch(err => {
              db.run('ROLLBACK');
              console.error('Error generating unique invoice number:', err);
              reject(err);
            });
        }
      );
    });
  });
});

// Function to generate a unique invoice number
const generateUniqueInvoiceNumber = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const baseInvoiceNumber = 'ADV'; // Adjust prefix as needed
    let newInvoiceNumber: string | PromiseLike<string>;
    let attempt = 0;

    const checkInvoiceNumber = () => {
      const invoiceSuffix = attempt > 0 ? (100 + attempt).toString() : '100'; // Start from 100
      newInvoiceNumber = `${baseInvoiceNumber}${invoiceSuffix}`;

      db.get(
        'SELECT COUNT(*) as count FROM Sales WHERE invoice_number = ?',
        [newInvoiceNumber],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row.count > 0) {
            attempt++;
            checkInvoiceNumber(); // Try the next number
          } else {
            resolve(newInvoiceNumber); // Unique invoice number found
          }
        }
      );
    };

    checkInvoiceNumber(); // Start checking
  });
};
