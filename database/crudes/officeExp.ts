import {connectToDatabase } from '../../src/main/database';
const { ipcMain } = require('electron');
const db = connectToDatabase();
ipcMain.handle('add-expense-office', async (event, expense) => {
  const {category} = expense;
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO Expenses (category,ammount) VALUES (?,?)',
      [category],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
  });
});

ipcMain.handle('update-expense-office', async (event, expense) => {
  const { id,category } = expense;
  return new Promise((resolve, reject) => {
    db.run('UPDATE Expenses SET  category = ?  ammount = ?  WHERE id = ?',
      [ category,id],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
  });
});
ipcMain.handle('delete-expense-office', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM Expenses WHERE id = ?', [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
});
