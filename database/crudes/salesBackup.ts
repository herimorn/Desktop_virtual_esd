import { ipcMain } from 'electron';
import { connectToDatabase } from '../../src/main/database';

const db=connectToDatabase();
interface Product {
  id: number;
  product_id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  tax_id: number;
  country: string;
  itemType: string;
  packagingUnit: string | null;
  quantityUnit: string | null;
  productNumber: number;
  itemCode: string | null;
  paymentType: string | null;
  unit: string | null;
  stock: number;
  VRN:number;
  buying_price: number;
}

interface SaleDetail {
  sale_id: number;
  date: string;
  total_amount: number;
  customer_name: string;
  products: Product[];
}

// Fetch sale details by ID

ipcMain.handle(
  'fetch-sale-by-id',
  async (event, saleId: number): Promise<SaleDetail> => {
    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT
            s.id AS sale_id,
            s.date,
            s.total_amount,
            s.invoice_description,
            c.name AS customer_name,
            c.id AS customer_id,
            s.status,
            si.product_id,
            p.name AS product_name,
            p.itemCode,
            si.quantity AS sold_quantity,
            si.price AS selling_price,
            pi.price AS buying_price,
            (si.quantity * si.price) - (pi.quantity * pi.price) AS profit,
            t.codeType AS tax_codeType,
            t.codeValue AS tax_codeValue
        FROM
            Sales s
        JOIN
            SalesItems si ON s.id = si.sale_id
        JOIN
            Products p ON si.product_id = p.id
        JOIN
            PurchaseItems pi ON p.id = pi.product_id
        JOIN
            Customers c ON s.customer_id = c.id
        LEFT JOIN
            Tax t ON p.tax_id = t.id
        WHERE
            s.id = ?
        ORDER BY
            s.date DESC
        `,
        [saleId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const saleDetails: SaleDetail = {
              sale_id: rows[0].sale_id,
              date: rows[0].date,
              status: rows[0].status,
              invoice_note: rows[0].invoice_description,
              total_amount: rows[0].total_amount,
              customer_name: rows[0].customer_name,
              customer_id: rows[0].customer_id,
              products: rows.map((row) => ({
                product_id: row.product_id,
                product_name: row.product_name,
                itemCode: row.itemCode,
                tax_codeType: row.tax_codeType,
                tax_codeValue: row.tax_codeValue,
                sold_quantity: row.sold_quantity,
                selling_price: row.selling_price,
                buying_price: row.buying_price,
                profit: row.profit,
              })),
            };
            resolve(saleDetails);
          }
        },
      );
    });
  },
);

// fetch-service-details

ipcMain.handle('fetch-service-details', async (event): Promise<SaleDetail[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT s.id AS sale_id, s.date, s.invoice_description AS invoice_description,
             s.total_amount, s.invoice_number, s.status,
             c.name AS customer_name, c.address, c.phone, c.tin, c.email, c.VRN,p.tax_id as tax_id,
             si.product_id, p.name AS product_name, p.itemCode, si.quantity AS sold_quantity,
             si.price AS selling_price,
             t.codeType AS tax_codeType, t.codeValue AS tax_codeValue
      FROM Sales s
      JOIN SalesItems si ON s.id = si.sale_id
      JOIN Products p ON si.product_id = p.id
      JOIN Customers c ON s.customer_id = c.id
      LEFT JOIN Tax t ON p.tax_id = t.id

      ORDER BY s.id DESC
    `,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const salesDetails = rows.reduce(
            (acc: { [key: number]: SaleDetail }, row) => {
              const {
                sale_id,
                date,
                total_amount,
                invoice_number,
                customer_name,
                tax_id,
                product_id,
                product_name,
                itemCode,
                sold_quantity,
                selling_price,
                address,
                tin,
                VRN,
                email,
                status,
                tax_codeValue,
                tax_codeType,
                phone,
                invoice_description,
              } = row;

              if (!acc[sale_id]) {
                acc[sale_id] = {
                  sale_id,
                  date,
                  tax_id,
                  total_amount,
                  invoice_number,
                  customer_name,
                  address,
                  invoice_description,
                  tin,
                  VRN,
                  email,
                  status,
                  tax_codeType,
                  tax_codeValue,
                  phone,
                  products: [],
                };
              }

              acc[sale_id].products.push({
                product_id,
                product_name,
                tax_id,
                itemCode,
                sold_quantity,
                selling_price,
                tax_codeType,
                tax_codeValue,
              });

              return acc;
            },
            {},
          );

          resolve(Object.values(salesDetails));
        }
      },
    );
  });
});


// Fetch all sales with detailed information
ipcMain.handle('fetch-sales-details', async (event): Promise<SaleDetail[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT s.id AS sale_id, s.date,s.invoice_description AS invoice_description,s.total_amount,s.invoice_number,s.status,c.name AS customer_name,c.address,c.phone,c.tin,c.email,c.VRN,
             si.product_id, p.name AS product_name, p.itemCode,p.tax_id As tax_id,si.quantity AS sold_quantity,
             si.price AS selling_price, pi.price AS buying_price,
             (si.quantity * si.price) - (pi.quantity * pi.price) AS profit,
            t.codeType AS tax_codeType, t.codeValue AS tax_codeValue
      FROM Sales s
      JOIN SalesItems si ON s.id = si.sale_id
      JOIN Products p ON si.product_id = p.id
      JOIN PurchaseItems pi ON p.id = pi.product_id
      JOIN Customers c ON s.customer_id = c.id
      LEFT JOIN Tax t ON p.tax_id = t.id
      ORDER BY s.id DESC
    `,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const salesDetails = rows.reduce(
            (acc: { [key: number]: SaleDetail }, row) => {
              const {
                sale_id,
                date,
                total_amount,
                invoice_number,
                customer_name,
                product_id,
                product_name,
                itemCode,
                sold_quantity,
                selling_price,
                buying_price,
                profit,
                address,
                tin,
                VRN,
                email,
                status,
                tax_codeValue,
                tax_codeType,
                tax_id,
                phone,
                invoice_description,
              } = row;

              if (!acc[sale_id]) {
                acc[sale_id] = {
                  sale_id,
                  date,
                  total_amount,
                  invoice_number,
                  customer_name,
                  address,
                  invoice_description,
                  tin,
                  VRN,
                  email,
                  tax_id,
                  status,
                  tax_codeType,
                  tax_codeValue,
                  phone,
                  products: [],
                };
              }

              acc[sale_id].products.push({
                product_id,
                product_name,
                itemCode,
                sold_quantity,
                selling_price,
                buying_price,
                tax_codeType,
                tax_codeValue,
                tax_id,
                profit,
              });

              return acc;
            },
            {},
          );

          resolve(Object.values(salesDetails));
        }
      },
    );
  });
});




// Fetch products for sales
ipcMain.handle('fetch-products_sales', async (event): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT p.id, p.name, p.description, p.price, p.itemCode,
             SUM(s.stock) AS stock, SUM(s.sold_item) AS sold_item,
             SUM(s.stock_amount) AS stock_amount, s.buying_price,
             SUM(s.sold_amount) AS sold_amount,
             t.codeType AS tax_codeType, t.codeValue AS tax_codeValue
      FROM Products p
      LEFT JOIN Stock s ON p.id = s.product_id
      LEFT JOIN Tax t ON p.tax_id = t.id
      GROUP BY p.id, s.buying_price
      ORDER BY p.id DESC
    `,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      },
    );
  });
});

// Fetch product details
ipcMain.handle(
  'fetch-product-details',
  async (event, productId: number): Promise<any> => {
    return new Promise((resolve, reject) => {
      db.get(
        `
      SELECT p.id, p.name, p.description, p.price, p.itemCode,
             SUM(s.stock) AS stock, SUM(s.sold_item) AS sold_item,
             SUM(s.stock_amount) AS stock_amount, s.buying_price,
             SUM(s.sold_amount) AS sold_amount
      FROM Products p
      LEFT JOIN Stock s ON p.id = s.product_id
      WHERE p.id = ?
      GROUP BY p.id, s.buying_price
      ORDER BY p.id DESC
    `,
        [productId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        },
      );
    });
  },
);

// Fetch all sales
ipcMain.handle('fetch-sales', async (event): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM Sales ORDER BY date DESC', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('fetch-sales-non-service', async (event) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT s.*, si.product_id, p.name AS product_name, p.itemType
      FROM Sales s
      JOIN SalesItems si ON s.id = si.sale_id
      JOIN Products p ON si.product_id = p.id

      ORDER BY s.date DESC
    `, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('fetch-sales-service', async (event) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT s.*, si.product_id, p.name AS product_name, p.itemType
      FROM Sales s
      JOIN SalesItems si ON s.id = si.sale_id
      JOIN Products p ON si.product_id = p.id
      ORDER BY s.date DESC
    `, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

//new added code
ipcMain.handle('add-sale', async (event, sale): Promise<{ id: number }> => {
  const {
    customer_id,
    transaction_status,
    transaction_type,
    products,
    total,
    invoice_note,
  } = sale;

  return new Promise(async (resolve, reject) => {
    try {
      // Helper function to generate a new invoice number
      const generateInvoiceNumber = (
        invoiceString: string,
        invoiceNumber: number,
      ): string => {
        return `${invoiceString}${invoiceNumber}`;
      };

      // Function to get the starting invoice details
      const getStartingInvoiceDetails = () => {
        return new Promise<{ invoice_string: string; invoice_number: number }>(
          (resolve, reject) => {
            db.get(
              'SELECT invoice_string, invoice_number FROM Invoices LIMIT 1',
              (err, row) => {
                if (err) {
                  reject(err);
                  return;
                }
                if (row) {
                  resolve(row);
                } else {
                  // Default values if no invoice details found
                  resolve({ invoice_string: 'ADVTC', invoice_number: 100 });
                }
              },
            );
          },
        );
      };

      // Function to get the maximum numeric part of the invoice number from the Sales table
      const getMaxNumericPartFromSales = () => {
        return new Promise<number>((resolve, reject) => {
          db.get(
            'SELECT invoice_number FROM Sales ORDER BY invoice_number DESC LIMIT 1',
            (err, row) => {
              if (err) {
                reject(err);
                return;
              }
              if (row && row.invoice_number) {
                // Extract numeric part from invoice_number
                const match = row.invoice_number.match(/\d+$/);
                const maxNumericPart = match ? parseInt(match[0], 10) : null;
                resolve(isNaN(maxNumericPart) ? null : maxNumericPart);
              } else {
                resolve(null);
              }
            },
          );
        });
      };

      // Determine the correct invoice number
      const startingInvoiceDetails = await getStartingInvoiceDetails();
      const maxNumericPart = await getMaxNumericPartFromSales();
      const invoiceNumber =
        maxNumericPart !== null
          ? maxNumericPart + 1
          : startingInvoiceDetails.invoice_number;
      const invoiceString = startingInvoiceDetails.invoice_string;

      const newInvoiceNumber = generateInvoiceNumber(
        invoiceString,
        invoiceNumber,
      );

      // Insert the sale with the new invoice number
      db.run(
        `
        INSERT INTO Sales (customer_id, date, total_amount, transaction_status, transaction_type, invoice_number,status,invoice_description)
        VALUES (?, datetime('now'), ?, ?, ?, ?,?,?)
      `,
        [
          customer_id,
          total,
          transaction_status,
          transaction_type,
          newInvoiceNumber,
          'pending',
          invoice_note,
        ],
        function (err) {
          if (err) {
            reject(err);
            return;
          }

          const saleId = this.lastID;

          db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            const insertSalesItem = db.prepare(`
            INSERT INTO SalesItems (sale_id, product_id, quantity, price)
            VALUES (?, ?, ?, ?)
          `);

            products.forEach(
              (product: {
                product_id: number;
                quantity: number;
                price: number;
              }) => {
                const { product_id, quantity, price } = product;
                insertSalesItem.run(saleId, product_id, quantity, price);
              },
            );

            insertSalesItem.finalize((err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              const updateStock = db.prepare(`
              UPDATE Stock
              SET stock = stock - ?, sold_item = sold_item + ?, stock_amount = stock_amount + ?, sold_amount = sold_amount + ?
              WHERE product_id = ? AND buying_price = ?
            `);

              products.forEach(
                (product: {
                  product_id: number;
                  quantity: number;
                  price: number;
                  buying_price: number;
                }) => {
                  const { product_id, quantity, price, buying_price } = product;
                  updateStock.run(
                    quantity,
                    quantity,
                    buying_price * quantity,
                    price * quantity,
                    product_id,
                    buying_price,
                    (err: any) => {
                      if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                      }
                    },
                  );
                },
              );

              updateStock.finalize((err) => {
                if (err) {
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                db.run('COMMIT', async (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }

                  // Emit the 'stock-updated' event with updated stock data
                  db.all(
                    `
                  SELECT p.id, p.name, p.description, p.price, p.itemCode,
                         SUM(s.stock) AS stock, SUM(s.sold_item) AS sold_item,
                         SUM(s.stock_amount) AS stock_amount, s.buying_price,
                         SUM(s.sold_amount) AS sold_amount
                  FROM Products p
                  LEFT JOIN Stock s ON p.id = s.product_id
                  GROUP BY p.id, s.buying_price
                  ORDER BY p.id DESC
                `,
                    [],
                    (err, rows) => {
                      if (err) {
                        reject(err);
                      } else {
                        event.sender.send('stock-updated', rows);
                      }
                    },
                  );

                  resolve({ id: saleId });
                });
              });
            });
          });
        },
      );
    } catch (error) {
      reject(error);
    }
  });
});
// Edit product by ID
ipcMain.handle(
  'edit-product',
  async (
    event,
    product: Product,
  ): Promise<{ success: boolean; message: string }> => {
    const {
      product_id,
      name,
      description,
      price,
      quantity,
      tax_id,
      country,
      itemType,
      packagingUnit,
      quantityUnit,
      productNumber,
      itemCode,
      paymentType,
      unit,
      stock,
      buying_price,
    } = product;

    return new Promise((resolve, reject) => {
      // Update product details in the Products table
      db.run(
        `
        UPDATE Products
        SET name = ?, description = ?, price = ?, quantity = ?, tax_id = ?,
            country = ?, itemType = ?, packagingUnit = ?, quantityUnit = ?,
            productNumber = ?, itemCode = ?, paymentType = ?, unit = ?
        WHERE id = ?
      `,
        [
          name,
          description,
          price,
          quantity,
          tax_id,
          country,
          itemType,
          packagingUnit,
          quantityUnit,
          productNumber,
          itemCode,
          paymentType,
          unit,
          id,
        ],
        (err) => {
          if (err) {
            reject({ success: false, message: 'Failed to update product.' });
            return;
          }

          // Update stock details in the Stock table
          db.run(
            `
            UPDATE Stock
            SET stock = ?, buying_price = ?
            WHERE product_id = ?
          `,
            [stock, buying_price, id],
            (err) => {
              if (err) {
                reject({
                  success: false,
                  message: 'Failed to update stock details.',
                });
                return;
              }

              // If everything went well, resolve with success message
              resolve({
                success: true,
                message: 'Product updated successfully.',
              });

              // Emit 'stock-updated' event to update the frontend stock data
              db.all(
                `
                SELECT p.id, p.name, p.description, p.price, p.itemCode,
                       SUM(s.stock) AS stock, SUM(s.sold_item) AS sold_item,
                       SUM(s.stock_amount) AS stock_amount, s.buying_price,
                       SUM(s.sold_amount) AS sold_amount
                FROM Products p
                LEFT JOIN Stock s ON p.id = s.product_id
                GROUP BY p.id, s.buying_price
                ORDER BY p.id DESC
              `,
                [],
                (err, rows) => {
                  // console.log('Stock updated successfully.', rows);
                  if (err) {
                    reject(err);
                  } else {
                    event.sender.send('stock-updated', rows);
                  }
                },
              );
            },
          );
        },
      );
    });
  },
);

ipcMain.handle('update-sale', async (event,saleId,updatedSale) => {
  const {
    customer_id,
    transaction_status,
    transaction_type,
    products,
    total,
    invoice_note,
    total_tax,
  } = updatedSale;
  // console.log("the updated sale are",event,updatedSale,saleId,products)

  return new Promise((resolve, reject) => {
    // const db = require('./db'); // Adjust according to your DB import

    try {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(err);
            return;
          }

          db.run(
            `UPDATE Sales
             SET customer_id = ?, transaction_status = ?, transaction_type = ?, total_amount = ?, invoice_description = ?
             WHERE id = ?`,
            [
              customer_id,
              transaction_status,
              transaction_type,
              total,
              invoice_note,
              saleId,
            ],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              db.run(
                `DELETE FROM SalesItems WHERE sale_id = ?`,
                [saleId],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                  }

                  const insertSalesItem = db.prepare(`
                    INSERT INTO SalesItems (sale_id, product_id, quantity, price)
                    VALUES (?, ?, ?, ?)
                  `);

                  updatedSale.products.forEach((product: { product_id: any; quantity: any; price: any; }) => {
                    insertSalesItem.run(
                      saleId,
                      product.product_id,
                      product.quantity,
                      product.price,
                    );
                  });

                  insertSalesItem.finalize((err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      reject(err);
                      return;
                    }

                    const updateStock = db.prepare(`
                      UPDATE Stock
                      SET stock = stock - ?, sold_item = sold_item + ?, stock_amount = stock_amount + ?, sold_amount = sold_amount + ?
                      WHERE product_id = ? AND buying_price = ?
                    `);

                    products.forEach((product: { quantity: number; buying_price: number; price: number; product_id: any; }) => {
                      updateStock.run(
                        product.quantity,
                        product.quantity,
                        product.buying_price * product.quantity,
                        product.price * product.quantity,
                        product.product_id,
                        product.buying_price,
                        (err: any) => {
                          if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                          }
                        },
                      );
                    });

                    updateStock.finalize((err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                      }

                      db.run('COMMIT', async (err) => {
                        if (err) {
                          reject(err);
                          return;
                        }

                        db.all(
                          `
                          SELECT p.id, p.name, p.description, p.price, p.itemCode,
                                 SUM(s.stock) AS stock, SUM(s.sold_item) AS sold_item,
                                 SUM(s.stock_amount) AS stock_amount, s.buying_price,
                                 SUM(s.sold_amount) AS sold_amount
                          FROM Products p
                          LEFT JOIN Stock s ON p.id = s.product_id
                          GROUP BY p.id, s.buying_price
                          ORDER BY p.id DESC
                        `,
                          [],
                          (err, rows) => {
                            if (err) {
                              reject(err);
                            } else {
                              event.sender.send('stock-updated', rows);
                            }
                          },
                        );

                        resolve({ id: saleId });
                      });
                    });
                  });
                },
              );
            },
          );
        });
      });
    } catch (error) {
      reject(error);
    }
  });
});
