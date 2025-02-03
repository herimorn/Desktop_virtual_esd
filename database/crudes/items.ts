
import {connectToDatabase } from '../../src/main/database';


const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const sqlite3 = require('sqlite3').verbose();

const db=connectToDatabase();

ipcMain.handle('fetchExpenses', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM Expenses ORDER BY id DESC', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('addPurchase', async (event, purchase) => {
  const { supplier_id, date, payment_type, items, expenses, total_amount } = purchase;
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO Purchases (supplier_id, date, payment_type, total_amount) VALUES (?, ?, ?, ?)',
      [supplier_id, date, payment_type, total_amount],
      function (err) {
        if (err) {
          reject(err);
        } else {
          const purchaseId = this.lastID;

          // Insert items
          const itemPromises = items.map((item) =>
            new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO PurchaseItems (purchase_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [purchaseId, item.product_id, item.quantity, item.price],
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                }
              );
            })
          );

          // Insert expenses
          const expensePromises = expenses.map((expense) =>
            new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO PurchaseExpenses (purchase_id, expense_id, amount) VALUES (?, ?, ?)',
                [purchaseId, expense.expense_id, expense.amount],
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                }
              );
            })
          );

          Promise.all([...itemPromises, ...expensePromises])
            .then(() => resolve({ id: purchaseId }))
            .catch(reject);
        }
      }
    );
  });
});
