

const { ipcMain } = require('electron');

import {connectToDatabase } from '../../src/main/database';
const db=connectToDatabase();

ipcMain.handle('fetch-invoice', async (event) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM Invoices ORDER BY id DESC LIMIT 1', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
});

ipcMain.handle('add-or-update-invoice', async (event, invoice) => {
  const { invoice_number, invoice_string } = invoice;
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM Invoices LIMIT 1', [], (err, row) => {
      if (err) {
        reject(err);
      } else if (row) {
        // Update existing invoice
        db.run(
          'UPDATE Invoices SET invoice_number = ?, invoice_string = ? WHERE id = ?',
          [invoice_number, invoice_string, row.id],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: row.id, updated: true });
            }
          }
        );
      } else {
        // Add new invoice
        db.run(
          'INSERT INTO Invoices (invoice_number, invoice_string) VALUES (?, ?)',
          [invoice_number, invoice_string],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: this.lastID, updated: false });
            }
          }
        );
      }
    });
  });
});
