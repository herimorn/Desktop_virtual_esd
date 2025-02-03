import { ipcMain } from 'electron';
import { runQuery } from "../RegistrationTRA";
import { connectToDatabase } from '../../src/main/database';


const db=connectToDatabase();
ipcMain.handle('fetch-suppliers', async () => {
  return new Promise((resolve, reject) => {
    // Query to fetch products and their associated tax codes
    const query = "SELECT * FROM Suppliers ORDER BY  id  DESC";

    db.all(query, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // console.log(rows);
        resolve(rows);
      }
    });
  });
});
// Function to add a new supplier
ipcMain.handle('add-supplier', async (event, supplier) => {
  const query = `
    INSERT INTO Suppliers (name, address, phone, email,tin,tax_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [supplier.name, supplier.address, supplier.phone, supplier.email,supplier.tin,supplier.tax_id];
  return await runQuery(query, params);
});
// Function to update an existing supplier
ipcMain.handle('update-supplier', async (event, supplier) => {
  const query = `
    UPDATE Suppliers
    SET name = ?, address = ?, phone = ?, email = ?, tax_id = ?, tin = ?
    WHERE id = ?
  `;
  const params = [supplier.name, supplier.address, supplier.phone, supplier.email, supplier.tax_id,supplier.tin,supplier.id];
  return await runQuery(query, params);
});
// Function to delete a supplier
ipcMain.handle('delete-supplier', async (event, id) => {
  const query = 'DELETE FROM Suppliers WHERE id = ?';
  return await runQuery(query, [id]);
});
