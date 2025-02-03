import { Database } from 'sqlite3';
import { ipcMain } from 'electron';
import { connectToDatabase } from '../../src/main/database';

const db = connectToDatabase();

export const fetchAllStock = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT s.id, s.product_id, s.stock, s.sold_item, s.stock_amount, s.buying_price, s.sold_amount, p.name as product_name
       FROM Stock s
       JOIN Products p ON s.product_id = p.id`,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};

export const fetchSumStockGroupedByProduct = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT s.product_id, p.name as product_name, SUM(s.stock) as total_stock
       FROM Stock s
       JOIN Products p ON s.product_id = p.id
       GROUP BY s.product_id`,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};

// Add or update stock based on product ID and buying price
const addOrUpdateStock = (product_id: any, quantity: number, buying_price: number) => {
  return new Promise<void>((resolve, reject) => {
    db.get('SELECT * FROM Stock WHERE product_id = ? AND buying_price = ?', [product_id, buying_price], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row) {
        // Update existing stock entry
        db.run(
          'UPDATE Stock SET stock = stock + ?, stock_amount = stock_amount + ? WHERE product_id = ? AND buying_price = ?',
          [quantity, buying_price * quantity, product_id, buying_price],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      } else {
        // Insert new stock entry
        db.run(
          'INSERT INTO Stock (product_id, stock, stock_amount, buying_price) VALUES (?, ?, ?, ?)',
          [product_id, quantity, buying_price * quantity, buying_price],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      }
    });
  });
};

// IPC handlers
ipcMain.handle('fetch-all-stock', async () => {
  try {
    const result = await fetchAllStock();
    return result;
  } catch (error) {
    console.error('Error fetching all stock:', error);
    throw error;
  }
});

ipcMain.handle('fetch-sum-stock-grouped-by-product', async () => {
  try {
    const result = await fetchSumStockGroupedByProduct();
    return result;
  } catch (error) {
    console.error('Error fetching sum stock grouped by product:', error);
    throw error;
  }
});

// Add or update stock IPC handler
ipcMain.handle('add-or-update-stock', async (event, { product_id, quantity, buying_price }) => {
  try {
    await addOrUpdateStock(product_id, quantity, buying_price);
    return { success: true };
  } catch (error) {
    console.error('Error adding or updating stock:', error);
    throw error;
  }
});
