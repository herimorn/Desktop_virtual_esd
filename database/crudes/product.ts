import { ipcMain } from 'electron';

import {connectToDatabase } from '../../src/main/database';


const db =connectToDatabase();

ipcMain.handle('fetch-products', async () => {
  return new Promise((resolve, reject) => {
    // Query to fetch products and their associated tax codes in descending order
    const query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.quantity,
        p.unit,
        p.country,
        p.itemType,
        p.packagingUnit,
        p.quantityUnit,
        p.paymentType,
        p.itemCode,
        p.tax_id,
        t.codeType,
        t.codeValue
      FROM Products p
      LEFT JOIN Tax t ON p.tax_id = t.id
      ORDER BY p.id DESC
    `;

    db.all(query, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});


ipcMain.handle('add-product', async (event, product) => {
  return new Promise((resolve, reject) => {
    const { name, description, price, quantity, tax, unit, county, itemType, packagingUnit, quantityUnit,paymentType,itemCode } = product;
    // console.log(product);

    // Insert the new product into the database
    db.run(
      `INSERT INTO products
       (name, description, price, quantity, tax_id, unit, country, itemType, packagingUnit, quantityUnit,paymentType,itemCode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)`,
      [name, description, price, quantity, tax, unit, county, itemType, packagingUnit, quantityUnit,paymentType,itemCode],
      function (err) {
        if (err) {
          reject(err);
          return;
        }

        // Query to fetch the last inserted product ordered by id in descending order
        db.get(
          'SELECT * FROM products ORDER BY id DESC LIMIT 1',
          (err, row) => {
            if (err) {
              reject(err);
            } else {
              resolve(row); // Resolve with the last inserted product
            }
          }
        );

      }
    );
  });
});

ipcMain.handle('update-product', async (event, product) => {
  return new Promise<void>((resolve, reject) => {
    const { id, name, description, price, quantity, tax, unit, county, itemType, packagingUnit, quantityUnit,paymentType,itemCode} = product;

    db.run(
      `UPDATE Products
       SET name = ?, description = ?, price = ?, quantity = ?, tax_id = ?, unit = ?, country = ?, itemType = ?, packagingUnit = ?, quantityUnit = ?,
       paymentType =?, itemCode =?
       WHERE id = ?`,
      [name, description, price, quantity, tax, unit, county, itemType, packagingUnit, quantityUnit,paymentType,itemCode,id],
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

ipcMain.handle('delete-product', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
});


ipcMain.handle('fetch-service-products', async () => {
  return new Promise((resolve, reject) => {
    // Query to fetch products where itemType is not 'service' and their associated tax codes in descending order
    const query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.quantity,
        p.unit,
        p.country,
        p.itemType,
        p.packagingUnit,
        p.quantityUnit,
        p.paymentType,
        p.itemCode,
        p.tax_id,
        t.codeType,
        t.codeValue
      FROM Products p
      LEFT JOIN Tax t ON p.tax_id = t.id
      WHERE p.itemType != 'Service'
      ORDER BY p.id DESC
    `;

    db.all(query, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

