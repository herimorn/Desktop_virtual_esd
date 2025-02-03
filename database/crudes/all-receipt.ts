
import { connectToDatabase } from '../../src/main/database';
import { ipcMain } from 'electron';

const db = connectToDatabase();
ipcMain.handle('AllReceipt', async () => {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT
        rq.id AS receipt_id,
        rq.sale_id,
        rq.receiptCode,
        rq.dc,
        rq.gc,
        rq.status,
        -- Aggregate product information into JSON format
        json_group_array(
          json_object(
            'product_name', ri.product_name,
            'quantity', ri.quantity,
            'amount', ri.amount
          )
        ) AS items
      FROM receipt_que rq
      JOIN receipt_items ri ON rq.id = ri.receipt_id
      GROUP BY rq.id;
      `,
      [],
      (err, rows) => {
        if (err) {
          console.error('Error fetching receipts:', err.message);
          reject(err); // Reject the promise on error
        } else {
          resolve(rows); // Resolve the promise with the fetched rows
        }
      }
    );
  });
});



ipcMain.handle('CountAllReceipts', async () => {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT COUNT(*) AS total_receipts
      FROM receipt_que;
      `,
      [],
      (err, row) => {
        if (err) {
          console.error('Error counting all receipts:', err.message);
          reject(err); // Reject the promise on error
        } else {
          resolve(row.total_receipts); // Return the total receipt count
        }
      }
    );
  });
});

ipcMain.handle('CountPendingReceipts', async () => {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT COUNT(*) AS pending_receipts
      FROM receipt_que
      WHERE status = 'pending';
      `,
      [],
      (err, row) => {
        if (err) {
          console.error('Error counting pending receipts:', err.message);
          reject(err); // Reject the promise on error
        } else {
          resolve(row.pending_receipts); // Return the pending receipt count
        }
      }
    );
  });
});


ipcMain.handle('CountProcessingReceipts', async () => {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT COUNT(*) AS processing_receipts
      FROM receipt_que
      WHERE status = 'progress';
      `,
      [],
      (err, row) => {
        if (err) {
          console.error('Error counting processing receipts:', err.message);
          reject(err); // Reject the promise on error
        } else {
          resolve(row.processing_receipts); // Return the processing receipt count
        }
      }
    );
  });
});


ipcMain.handle('CountSuccessReceipts', async () => {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT COUNT(*) AS success_receipts
      FROM receipt_que
      WHERE status = 'success' OR status='sent'
      `,
      [],
      (err, row) => {
        if (err) {
          console.error('Error counting processing receipts:', err.message);
          reject(err); // Reject the promise on error
        } else {
          resolve(row.success_receipts); // Return the processing receipt count
        }
      }
    );
  });
});


