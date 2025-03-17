// import {connectToDatabase } from '../../src/main/database';


// const { ipcMain } = require('electron');

// const db=connectToDatabase();
// ipcMain.handle('select-serial', async (event) => {
//   return new Promise((resolve, reject) => {
//     db.all('SELECT  serial FROM check_serial', [], (err, rows) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(rows);
//       }
//     });
//   });
// });
// //  insert data

// ipcMain.handle('add-serial', async (event, FormData) => {
//   const {data} =FormData
//   console.log('the added serial number is',data);
//   return new Promise((resolve, reject) => {
//     db.run('INSERT INTO check_serial (serial,fullName)) VALUES (?,?)',
//       [data],
//       function(err) {
//         if (err) {
//           reject(err);
//         } else {
//           resolve({ id: this.lastID });
//         }
//       });
//   });
// });



