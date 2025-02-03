import { ipcMain } from 'electron';

import {connectToDatabase } from '../../src/main/database';

const db=connectToDatabase();

// Fetch all expenses
ipcMain.handle('fetch-expenses', async () => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT id, category FROM Expenses';
    db.all(query, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

// Fetch purchases, including their items, total tax, and expenses
ipcMain.handle('fetch-purchases', async () => {
  return new Promise((resolve, reject) => {
    const query = `
SELECT
    p.id,
    p.supplier_id,
    p.date,
    p.total_amount,
    p.outstanding_amount,
    p.payment_type,
    s.name as supplier_name
FROM Purchases p
LEFT JOIN Suppliers s ON p.supplier_id = s.id
ORDER BY p.id DESC;

    `;

    db.all(query, (err, purchases) => {
      if (err) {
        reject(err);
        return;
      }

      const purchaseItemsQuery = `
      SELECT
        pi.id,
        pi.purchase_id,
        pi.product_id,
        pi.quantity,
        pi.price,
        pr.name AS product_name,
        t.codeValue AS tax_rate
      FROM PurchaseItems pi
      LEFT JOIN Products pr ON pi.product_id = pr.id
      LEFT JOIN Tax t ON pr.tax_id = t.id
  `;
      const purchaseExpensesQuery = `
        SELECT
          pe.purchase_id,
          e.id,
          e.category,
          pe.amount
        FROM ExpensePurchase  pe
        LEFT JOIN Expenses e ON pe.expense_id = e.id
      `;

      db.all(purchaseItemsQuery, (err, items) => {
        if (err) {
          reject(err);
          return;
        }

        db.all(purchaseExpensesQuery, (err, expenses) => {
          if (err) {
            reject(err);
            return;
          }

          const purchasesWithDetails = purchases.map(purchase => ({
            ...purchase,
            items: items.filter(item => item.purchase_id === purchase.id),
            expenses: expenses.filter(expense => expense.purchase_id === purchase.id)
          }));

          resolve(purchasesWithDetails);
        });
      });
    });
  });
});
// Add purchase handler
ipcMain.handle('add-purchase', async (event, purchase) => {
  return new Promise((resolve, reject) => {
    const { supplier_id, date, items, expenses, payment_type } = purchase;
    let totalAmount = 0;
    let totalTax = 0;

    // Calculate total amount and tax
    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;
      totalTax += itemTotal * (parseFloat(item.tax_rate) / 100);
    });

    // Insert into Purchases table
    db.run(
      'INSERT INTO Purchases (supplier_id, date, total_amount, outstanding_amount, payment_type) VALUES (?, ?, ?, ?, ?)',
      [supplier_id, date, totalAmount, totalTax, payment_type],
      function (err) {
        if (err) {
          reject(err);
          return;
        }
        const purchaseId = this.lastID;

        // Insert items into PurchaseItems table
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

        // Insert expenses into ExpensePurchase table
        // console.log(expenses);
        const expenseInserts = expenses.map((expense: {
          id: any; expense_id: any; amount: any; item_id: any;
}) => {
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO ExpensePurchase (expense_id, amount, item_id, purchase_id) VALUES (?, ?, ?, ?)',
              [expense.id, expense.amount, expense.item_id, purchaseId],
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

        // Update or Insert into Stock table
        const stockUpdates = items.map(item => {
          return new Promise((resolve, reject) => {
            // Check if stock entry exists
            db.get('SELECT * FROM Stock WHERE product_id = ? AND buying_price = ? ORDER BY  id  DESC', [item.product_id, item.price], (err, row) => {
              if (err) {
                reject(err);
                return;
              }

              if (row) {
                // Update existing stock entry
                db.run(
                  'UPDATE Stock SET stock = stock + ?, stock_amount = stock_amount + ? WHERE product_id = ? AND buying_price = ?',
                  [item.quantity, item.price * item.quantity, item.product_id, item.price],
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
                  [item.product_id, item.quantity, item.price * item.quantity, item.price],
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
        });

        // Execute all insert and update operations
        Promise.all([...itemInserts, ...expenseInserts, ...stockUpdates])
          .then(() => resolve(purchaseId))
          .catch(reject);
      }
    );
  });
});

// Update an existing purchase, including items and stock

// Update an existing purchase, including items, expenses, and stock
ipcMain.handle('update-purchase', async (event, purchase) => {
  return new Promise<void>((resolve, reject) => {
    const { id, supplier_id, date, items, expenses } = purchase;
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

          const deleteOldExpenses = new Promise<void>((resolve, reject) => {
            db.run('DELETE FROM ExpensePurchase WHERE purchase_id = ?', [id], function (err) {
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

            const expenseInserts = expenses.map(expense => {
              return new Promise((resolve, reject) => {
                db.run(
                  'INSERT INTO ExpensePurchase (expense_id, amount, item_id, purchase_id) VALUES (?, ?, ?, ?)',
                  [expense.id, expense.amount, expense.item_id, id],
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

            const stockUpdates = items.map(item => {
              return new Promise((resolve, reject) => {
                db.get('SELECT * FROM Stock WHERE product_id = ? AND buying_price = ?', [item.product_id, item.price], (err, row) => {
                  if (err) {
                    reject(err);
                    return;
                  }

                  if (row) {
                    // Update existing stock entry
                    db.run(
                      'UPDATE Stock SET stock = stock + ?, stock_amount = stock_amount + ? WHERE product_id = ? AND buying_price = ?',
                      [item.quantity, item.price * item.quantity, item.product_id, item.price],
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
                      [item.product_id, item.quantity, item.price * item.quantity, item.price],
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
            });

            Promise.all([...itemInserts, ...expenseInserts, ...stockUpdates])
              .then(() => resolve())
              .catch(reject);
          }).catch(reject);
        }
      }
    );
  });
});


// Delete a purchase and update stock
ipcMain.handle('delete-purchase', async (event, id) => {
  return new Promise<void>((resolve, reject) => {
    // Fetch all items associated with the purchase
    db.all('SELECT product_id, quantity, price FROM PurchaseItems WHERE purchase_id = ?', [id], (err, items) => {
      if (err) {
        reject(err);
        return;
      }

      // Update stock based on the items in the purchase
      const stockUpdates = items.map(item => {
        return new Promise((resolve, reject) => {
          db.run(
            'UPDATE Stock SET stock = stock - ?, stock_amount = stock_amount - ? WHERE product_id = ? AND buying_price = ?',
            [item.quantity, item.price * item.quantity, item.product_id, item.price],
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

      // Delete the purchase items
      const deleteItems = new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM PurchaseItems WHERE purchase_id = ?', [id], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Delete the expenses associated with the purchase
      const deleteExpenses = new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM ExpensePurchase WHERE purchase_id = ?', [id], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Delete the purchase itself
      const deletePurchase = new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM Purchases WHERE id = ?', [id], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Execute all deletions and updates
      Promise.all([...stockUpdates, deleteItems, deleteExpenses, deletePurchase])
        .then(() => resolve())
        .catch(reject);
    });
  });
});
