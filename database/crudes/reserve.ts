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

// Fetch sale details by ID
ipcMain.handle('fetch-sale-by-id', async (event, saleId: number): Promise<SaleDetail> => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT s.id AS sale_id, s.date, s.total_amount, c.name AS customer_name,
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
    `, [saleId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const saleDetails: SaleDetail = {
          sale_id: rows[0].sale_id,
          date: rows[0].date,
          total_amount: rows[0].total_amount,
          customer_name: rows[0].customer_name,
          products: rows.map(row => ({
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
      }
    });
  });
});

// Fetch all sales with detailed information
ipcMain.handle('fetch-sales-details', async (event): Promise<SaleDetail[]> => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT s.id AS sale_id, s.date, s.total_amount, c.name AS customer_name,
             si.product_id, p.name AS product_name, p.itemCode, si.quantity AS sold_quantity,
             si.price AS selling_price, pi.price AS buying_price,
             (si.quantity * si.price) - (pi.quantity * pi.price) AS profit
      FROM Sales s
      JOIN SalesItems si ON s.id = si.sale_id
      JOIN Products p ON si.product_id = p.id
      JOIN PurchaseItems pi ON p.id = pi.product_id
      JOIN Customers c ON s.customer_id = c.id
      ORDER BY s.date DESC
    `, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const salesDetails = rows.reduce((acc: { [key: number]: SaleDetail }, row) => {
          const { sale_id, date, total_amount, customer_name, product_id, product_name, itemCode, sold_quantity, selling_price, buying_price, profit } = row;

          if (!acc[sale_id]) {
            acc[sale_id] = {
              sale_id,
              date,
              total_amount,
              customer_name,
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
    });
  });
});

// Fetch products for sales
ipcMain.handle('fetch-products_sales', async (event): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(`
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
    `, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

// Fetch product details
ipcMain.handle('fetch-product-details', async (event, productId: number): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT p.id, p.name, p.description, p.price, p.itemCode,
             SUM(s.stock) AS stock, SUM(s.sold_item) AS sold_item,
             SUM(s.stock_amount) AS stock_amount, s.buying_price,
             SUM(s.sold_amount) AS sold_amount
      FROM Products p
      LEFT JOIN Stock s ON p.id = s.product_id
      WHERE p.id = ?
      GROUP BY p.id, s.buying_price
      ORDER BY p.id DESC
    `, [productId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
});

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

// Add a new sale
ipcMain.handle('add-sale', async (event, sale): Promise<{ id: number }> => {
  const { customer_id, transaction_status, transaction_type, products, total } = sale;

  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO Sales (customer_id, date, total_amount, transaction_status, transaction_type)
      VALUES (?, datetime('now'), ?, ?, ?)
    `, [customer_id, total, transaction_status, transaction_type], function (err) {
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

        products.forEach((product: { product_id: number; quantity: number; price: number }) => {
          const { product_id, quantity, price } = product;
          console.log(`Inserting SalesItem with sale_id: ${saleId}, product_id: ${product_id}, quantity: ${quantity}, price: ${price}`);
          insertSalesItem.run(saleId, product_id, quantity, price);
        });

        insertSalesItem.finalize(err => {
          if (err) {
            console.error("Error finalizing SalesItem insert:", err);
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          const updateStock = db.prepare(`
            UPDATE Stock
            SET stock = stock - ?, sold_item = sold_item + ?, stock_amount = stock_amount + ?, sold_amount = sold_amount + ?
            WHERE product_id = ? AND buying_price = ?
          `);

          products.forEach((product: { product_id: number; quantity: number; price: number; buying_price: number }) => {
            const { product_id, quantity, price, buying_price } = product;
            console.log(`Updating Stock with product_id: ${product_id}, quantity: ${quantity}, sellingPrice: ${price}, buyingPrice: ${buying_price}`);
            updateStock.run(
              quantity,                           // Decrease stock
              quantity,                           // Increase sold_item
              (buying_price * quantity),          // Increase stock_amount (based on buying price)
              (price * quantity),                 // Increase sold_amount (based on selling price)
              product_id,
              buying_price,
              (err: any) => {
                if (err) {
                  console.error("Error updating Stock:", err);
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
              }
            );
          });

          updateStock.finalize(err => {
            if (err) {
              console.error("Error finalizing Stock update:", err);
              db.run('ROLLBACK');
              reject(err);
              return;
            }

            db.run('COMMIT', err => {
              if (err) {
                reject(err);
                return;
              }

              // Emit the 'stock-updated' event with updated stock data
              db.all(`
                SELECT p.id, p.name, p.description, p.price, p.itemCode,
                       SUM(s.stock) AS stock, SUM(s.sold_item) AS sold_item,
                       SUM(s.stock_amount) AS stock_amount, s.buying_price,
                       SUM(s.sold_amount) AS sold_amount
                FROM Products p
                LEFT JOIN Stock s ON p.id = s.product_id
                GROUP BY p.id, s.buying_price
                ORDER BY p.id DESC
              `, [], (err, rows) => {
                if (err) {
                  reject(err);
                } else {
                  event.sender.send('stock-updated', rows);
                }
              });

              resolve({ id: saleId });
            });
          });
        });
      });
    });
  });
});
