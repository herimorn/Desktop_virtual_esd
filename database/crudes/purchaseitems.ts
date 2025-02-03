import { ipcMain } from 'electron';

import {connectToDatabase } from '../../src/main/database';

const db=connectToDatabase();

// Fetch all purchase items for a specific purchase
ipcMain.handle('fetch-purchase-items', async (event, purchaseId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        pi.id,
        pi.purchase_id,
        pi.product_id,
        pi.quantity,
        pi.price,
        p.name
      FROM PurchaseItems pi
      LEFT JOIN Products p ON pi.product_id = p.id
      WHERE pi.purchase_id = ?
    `;

    db.all(query, [purchaseId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // console.log(rows)
        resolve(rows);
      }
    });
  });
});


ipcMain.handle('addPurchaseItem', async (event, item) => {
  return new Promise((resolve, reject) => {
    const { purchase_id, product_id, quantity, price } = item;
    db.run(
      `INSERT INTO PurchaseItems (purchase_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
      [purchase_id, product_id, quantity, price],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
});
// Update an existing purchase item
ipcMain.handle('update-purchase-item', async (event, purchaseItem) => {
  return new Promise<void>((resolve, reject) => {
    const { id, purchase_id, product_id, quantity, price } = purchaseItem;
    // console.log("the purchase items is ",purchaseItem)

    db.run(
      'UPDATE PurchaseItems SET purchase_id = ?, product_id = ?, quantity = ?, price = ? WHERE id = ? ORDER BY  id  DESC',
      [purchase_id, product_id, quantity, price, id],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
});

// Delete a purchase item
ipcMain.handle('delete-purchase-item', async (event, id) => {
  return new Promise<void>((resolve, reject) => {
    db.run('DELETE FROM PurchaseItems WHERE id = ?', [id], function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

