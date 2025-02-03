import { ipcMain } from 'electron';
import { connectToDatabase } from 'main/database';


const db = connectToDatabase();
ipcMain.handle('fetch-purchases', async () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        p.id,
        p.supplier_id,
        p.date,
        p.total_amount,
        p.payment_type,
        p.outstanding_amount,
        s.name as supplier_name
      FROM Purchases p
      LEFT JOIN Suppliers s ON p.supplier_id = s.id
    `;

   // console.log('Executing purchase query:', query);

    db.all(query, (err, purchases) => {
      if (err) {
        console.error('Error fetching purchases:', err);
        reject(err);
      } else {
        // console.log('Fetched purchases:', purchases);

        const purchaseItemsQuery = `
        SELECT
          pi.id,
          pi.purchase_id,
          pi.product_id,
          pi.quantity,
          pi.price,
          pr.name as product_name,
          t.codeValue as tax_rate
        FROM PurchaseItems pi
        LEFT JOIN Products pr ON pi.product_id = pr.id
        LEFT JOIN Tax t ON pr.tax_id = t.id
      `;


        // console.log('Executing purchase items query:', purchaseItemsQuery);

        db.all(purchaseItemsQuery, (err, items) => {
          if (err) {
            console.error('Error fetching purchase items:', err);
            reject(err);
          } else {
            // console.log('Fetched purchase items:', items);

            const purchasesWithItems = purchases.map(purchase => {
              const itemsForPurchase = items.filter(item => item.purchase_id === purchase.id);
              const totalTax = itemsForPurchase.reduce((sum, item) => sum + (item.price * item.quantity * (parseFloat(item.tax_rate) / 100)), 0);
              return {
                ...purchase,
                items: itemsForPurchase,
                total_tax: totalTax
              };
            });

            // console.log('Processed purchases with items:', purchasesWithItems);
            resolve(purchasesWithItems);
          }
        });
      }
    });
  });
});


ipcMain.handle('add-purchase', async (event, purchase) => {
  return new Promise((resolve, reject) => {
    const { supplier_id, date, items,paymentType } = purchase;
    let totalAmount = 0;
    let totalTax = 0;

    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;
      totalTax += itemTotal * (parseFloat(item.tax_rate) / 100);
    });

    db.run(
      'INSERT INTO Purchases (supplier_id, date, total_amount, payment_type,outstanding_amount) VALUES (?, ?, ?, ?,?)',
      [supplier_id, date, totalAmount,paymentType, totalTax],
      function (err) {
        if (err) {
          reject(err);
          return;
        }
        const purchaseId = this.lastID;
        const itemInserts = items.map(item => {
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO PurchaseItems (purchase_id, product_id, quantity, price, tax_id) VALUES (?, ?, ?, ?, ?)',
              [purchaseId, item.product_id, item.quantity, item.price, item.tax_id],
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
        Promise.all(itemInserts)
          .then(() => resolve(purchaseId))
          .catch(reject);
      }
    );
  });
});

ipcMain.handle('update-purchase', async (event, purchase) => {
  return new Promise<void>((resolve, reject) => {
    const { id, supplier_id, date, items } = purchase;
    let totalAmount = 0;
    let totalTax = 0;

    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;
      totalTax += itemTotal * (parseFloat(item.tax_rate) / 100);
    });

    db.run(
      'UPDATE Purchases SET supplier_id = ?, date = ?, total_amount = ?, outstanding_amount = ? WHERE id = ?',
      [supplier_id, date, totalAmount, totalTax, id],
      function (err) {
        if (err) {
          reject(err);
        } else {
          const deleteOldItems = new Promise<void>((resolve, reject) => {
            db.run('DELETE FROM PurchaseItems WHERE purchase_id = ?', [id], function (err) {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });

          deleteOldItems.then(() => {
            const itemInserts = items.map(item => {
              return new Promise((resolve, reject) => {
                db.run(
                  'INSERT INTO PurchaseItems (purchase_id, product_id, quantity, price, tax_id) VALUES (?, ?, ?, ?, ?)',
                  [id, item.product_id, item.quantity, item.price, item.tax_id],
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
            Promise.all(itemInserts)
              .then(() => resolve())
              .catch(reject);
          }).catch(reject);
        }
      }
    );
  });
});


ipcMain.handle('delete-purchase', async (event, id) => {
  // console.log('id')
  return new Promise<void>((resolve, reject) => {
    db.run('DELETE FROM Purchases WHERE id = ?', [id], function (err) {
      if (err) {
        reject(err);
      } else {
        db.run('DELETE FROM PurchaseItems WHERE purchase_id = ?', [id], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
});

ipcMain.handle('update-purchase-items', async (event, purchaseId, items) => {
  return new Promise<void>((resolve, reject) => {
    const deleteOldItems = new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM PurchaseItems WHERE purchase_id = ?', [purchaseId], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    deleteOldItems.then(() => {
      const itemInserts = items.map(item => {
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO PurchaseItems (purchase_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [purchaseId, item.product_id, item.quantity, item.price],
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

      Promise.all(itemInserts)
        .then(() => resolve())
        .catch(reject);
    }).catch(reject);
  });
});

//fetching tax to be used in the purchase
ipcMain.handle('fetch-taxes', async () => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT id, codeType, codeValue FROM Tax';
    db.all(query, (err, rows) => {
      if (err) {
        reject(err);
        // console.log(errors)
      } else {
        resolve(rows);
        // console.log(rows)
      }
    });
  });
});

