import { ipcMain } from 'electron';
import { connectToDatabase } from '../RegistrationTRA';

const db = connectToDatabase();

interface Product {
  product_id: number;
  product_name: string;
  itemCode: string;
  sold_quantity: number;
  selling_price: number;
  buying_price: number;
  profit: number;
}

interface SaleDetail {
  sale_id: number;
  date: string;
  total_amount: number;
  customer_name: string;
  products: Product[];
}

// Helper function to generate a new invoice number
const generateInvoiceNumber = (
  invoiceString: string,
  invoiceNumber: number,
): string => `${invoiceString}${invoiceNumber}`;

// Fetch the starting invoice details
const getStartingInvoiceDetails = async () => {
  return new Promise<{ invoice_string: string; invoice_number: number }>(
    (resolve, reject) => {
      db.get(
        'SELECT invoice_string, invoice_number FROM Invoices LIMIT 1',
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
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

// Fetch the maximum numeric part of the invoice number from the Sales table
const getMaxNumericPartFromSales = async () => {
  return new Promise<number | null>((resolve, reject) => {
    db.get(
      'SELECT invoice_number FROM Sales ORDER BY invoice_number DESC LIMIT 1',
      (err, row) => {
        if (err) {
          reject(err);
        } else if (row && row.invoice_number) {
          const match = row.invoice_number.match(/\d+$/);
          const maxNumericPart = match ? parseInt(match[0], 10) : null;
          resolve(maxNumericPart || null);
        } else {
          resolve(null);
        }
      },
    );
  });
};

// Fetch sale details by ID
ipcMain.handle(
  'fetch-sale-by-id',
  async (event, saleId: number): Promise<SaleDetail> => {
    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT s.id AS sale_id, s.date, s.total_amount, c.name AS customer_name, s.status,
               si.product_id, p.name AS product_name, p.itemCode, si.quantity AS sold_quantity,
               si.price AS selling_price, pi.price AS buying_price,
               (si.quantity * si.price) - (pi.quantity * pi.price) AS profit
        FROM Sales s
        JOIN SalesItems si ON s.id = si.sale_id
        JOIN Products p ON si.product_id = p.id
        JOIN PurchaseItems pi ON p.id = pi.product_id
        JOIN Customers c ON s.customer_id = c.id
        WHERE s.id = ?
        ORDER BY s.date DESC
        `,
        [saleId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else if (rows.length) {
            const saleDetails: SaleDetail = {
              sale_id: rows[0].sale_id,
              date: rows[0].date,
              total_amount: rows[0].total_amount,
              customer_name: rows[0].customer_name,
              products: rows.map((row) => ({
                product_id: row.product_id,
                product_name: row.product_name,
                itemCode: row.itemCode,
                sold_quantity: row.sold_quantity,
                selling_price: row.selling_price,
                buying_price: row.buying_price,
                profit: row.profit,
              })),
            };
            resolve(saleDetails);
          } else {
            reject(new Error('Sale not found'));
          }
        },
      );
    });
  },
);

// Fetch all sales with detailed information
ipcMain.handle('fetch-sales-details', async (): Promise<SaleDetail[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `
        SELECT s.id AS sale_id, s.date, s.invoice_description AS invoice_description,
               s.total_amount, s.invoice_number, s.status, c.name AS customer_name,
               c.address, c.phone, c.tin, c.email, si.product_id, p.name AS product_name,
               p.itemCode, si.quantity AS sold_quantity, si.price AS selling_price,
               pi.price AS buying_price, (si.quantity * si.price) -
               (pi.quantity * pi.price) AS profit, t.codeType AS tax_codeType,
               t.codeValue AS tax_codeValue
        FROM Sales s
        JOIN SalesItems si ON s.id = si.sale_id
        JOIN Products p ON si.product_id = p.id
        JOIN PurchaseItems pi ON p.id = pi.product_id
        JOIN Customers c ON s.customer_id = c.id
        LEFT JOIN Tax t ON p.tax_id = t.id
        ORDER BY s.date DESC
      `,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const salesDetails = rows.reduce((acc: { [key: number]: SaleDetail }, row) => {
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
                total_amount,
                invoice_number,
                customer_name,
                address,
                invoice_description,
                tin,
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
              itemCode,
              sold_quantity,
              selling_price,
              buying_price,
              profit,
            });

            return acc;
          }, {});

          resolve(Object.values(salesDetails));
        }
      },
    );
  });
});

// Fetch products for sales
ipcMain.handle('fetch-products_sales', async (): Promise<any[]> => {
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
ipcMain.handle('fetch-product-details', async (event, productId: number): Promise<any> => {
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
});

// Fetch all sales
ipcMain.handle('fetch-sales', async (): Promise<any[]> => {
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

// Add a new sale
ipcMain.handle('add-sale', async (event, sale): Promise<{ id: number }> => {
  const { customer_id, transaction_status, transaction_type, products, total, invoice_note } =
    sale;

  return new Promise(async (resolve, reject) => {
    try {
      // Get the starting invoice details and max numeric part of invoice number
      const startingInvoiceDetails = await getStartingInvoiceDetails();
      const maxNumericPart = await getMaxNumericPartFromSales();

      const invoiceNumber = maxNumericPart !== null
        ? maxNumericPart + 1
        : startingInvoiceDetails.invoice_number;
      const invoiceString = startingInvoiceDetails.invoice_string;

      const newInvoiceNumber = generateInvoiceNumber(invoiceString, invoiceNumber);

      // Insert the sale with the new invoice number
      db.run(
        `
        INSERT INTO Sales (customer_id, date, total_amount, transaction_status,
                           transaction_type, invoice_number, status, invoice_description)
        VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
      `,
        [
          customer_id,
          total,
          transaction_status,
          transaction_type,
          newInvoiceNumber,
          'Draft',
          invoice_note,
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            const saleId = this.lastID;

            // Update product stock and insert sales items in a transaction
            db.serialize(() => {
              db.run('BEGIN TRANSACTION');

              for (const product of products) {
                db.run(
                  `
                  INSERT INTO SalesItems (sale_id, product_id, quantity, price)
                  VALUES (?, ?, ?, ?)
                `,
                  [saleId, product.id, product.quantity, product.price],
                );

                db.run(
                  `
                  UPDATE Stock
                  SET stock = stock - ?, sold_item = sold_item + ?
                  WHERE product_id = ?
                `,
                  [product.quantity, product.quantity, product.id],
                );
              }

              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  db.run('ROLLBACK');
                  reject(commitErr);
                } else {
                  resolve({ id: saleId });
                }
              });
            });
          }
        },
      );
    } catch (err) {
      reject(err);
    }
  });
});

// Delete a sale by ID
ipcMain.handle('delete-sale', async (event, saleId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM Sales WHERE id = ?', [saleId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

// Update a sale
ipcMain.handle('update-sale', async (event, updatedSale): Promise<void> => {
  const { id, customer_id, transaction_status, transaction_type, total } = updatedSale;

  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE Sales
      SET customer_id = ?, total_amount = ?, transaction_status = ?, transaction_type = ?
      WHERE id = ?
    `,
      [customer_id, total, transaction_status, transaction_type, id],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
});
