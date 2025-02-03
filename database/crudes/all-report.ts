import { connectToDatabase } from '../../src/main/database';
import { ipcMain } from 'electron';

const db = connectToDatabase();

ipcMain.handle('ReportsAll', async () => {
    return new Promise((resolve, reject) => {
        db.all(
            `
           SELECT
                rq.customer_name,
                rq.status,
                ri.product_name,
                rq.totalTaxExcl,
                rq.totalTaxIncl,
                rq.totalTax,
                r.report_date,
                r.totalReceipts,
                r.totalExclTax,
                r.totalInclTax,
                r.totalTax AS report_total_tax
           FROM receipt_que rq
           JOIN receipt_items ri ON rq.id = ri.receipt_id
           JOIN report r ON DATE(rq.created_at) = r.report_date
        `,
            [],
            (err, rows) => {
              // console.log(rows)
                if (err) {
                    console.error('Error fetching report:', err.message);
                    reject(err); // Rejects the promise on error
                } else {
                    resolve(rows); // Resolves with the rows if no error
                }
            }
        );
    });
});

// Pending receipt count
ipcMain.handle('pendingReceipt', async () => {
  return new Promise((resolve, reject) => {
      db.all(
          `
          SELECT COUNT(*) AS pending_count
          FROM receipt_que
          WHERE status = 'pending';
          `,
          [],
          (err, rows) => {
              if (err) {
                  console.error('Error fetching pending receipts:', err.message);
                  reject(err);
              } else {
                  // Return the count value directly
                  resolve(rows[0].pending_count);
              }
          }
      );
  });
});

// Success receipt count
ipcMain.handle('successReceipt', async () => {
  return new Promise((resolve, reject) => {
      db.all(
          `
          SELECT COUNT(*) AS success_count
          FROM receipt_que
          WHERE status = 'sent';
          `,
          [],
          (err, rows) => {
              if (err) {
                  console.error('Error fetching success receipts:', err.message);
                  reject(err);
              } else {
                  // Return the count value directly
                  resolve(rows[0].success_count);
                  // console.log('haya onyesha',...rows[0].success_count);
              }
          }
      );
  });
});

// Process receipt count
ipcMain.handle('processReceipt', async () => {
  return new Promise((resolve, reject) => {
      db.all(
          `
          SELECT COUNT(*) AS process_count
          FROM receipt_que
          WHERE status = 'process';
          `,
          [],
          (err, rows) => {
              if (err) {
                  console.error('Error fetching process receipts:', err.message);
                  reject(err);
              } else {
                  // Return the count value directly
                  resolve(rows[0].process_count);
              }
          }
      );
  });
});
