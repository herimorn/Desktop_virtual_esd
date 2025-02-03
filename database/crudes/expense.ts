import {connectToDatabase } from '../../src/main/database';


const { ipcMain } = require('electron');

const db=connectToDatabase();
// ipcMain.handle('fetch-expenses', async (event) => {
//   return new Promise((resolve, reject) => {
//     db.all('SELECT * FROM Expenses', [], (err, rows) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(rows);
//       }
//     });
//   });
// });

ipcMain.handle('add-expense', async (event, expense) => {
  const {category} = expense;
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO Expenses (category) VALUES (?)',
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

ipcMain.handle('update-expense', async (event, expense) => {
  const { id,category } = expense;
  return new Promise((resolve, reject) => {
    db.run('UPDATE Expenses SET  category = ? WHERE id = ?',
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

ipcMain.handle('delete-expense', async (event, id) => {
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
