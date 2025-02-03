
import { ipcMain } from 'electron';
import { connectToDatabase } from '../../src/main/database';

// Fetch reports by date


const db=connectToDatabase();
ipcMain.handle('fetch-reports-by-date', (event, reportDate, reportMonth, reportYear) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT * FROM report WHERE 1=1`;
    const params = [];

    if (reportDate) {
      query += ` AND report_date = ?`;
      params.push(reportDate);
    }

    if (reportMonth && reportYear) {
      query += ` AND strftime('%Y-%m', report_date) = ?`;
      params.push(`${reportYear}-${reportMonth}`);
    } else if (reportYear) {
      query += ` AND strftime('%Y', report_date) = ?`;
      params.push(reportYear);
    }

    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});



// Fetch receipts by report
ipcMain.handle('fetch-receipts-by-report', (event, reportId: number) => {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT rq.id, rq.sale_id, rq.gc, rq.dc, rq.znum, rq.receiptCode, rq.customer_name,
             rq.sanitizedPhone, rq.totalTaxExcl, rq.totalTaxIncl, rq.invoice_number, rq.totalTax,
             rq.created_at, rq.updated_at
      FROM receipt_que rq
      INNER JOIN report_receipt rr ON rq.id = rr.receipt_id
      WHERE rr.report_id = ?
      `,
      [reportId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
});

// Fetch items by receipt
ipcMain.handle('fetch-receipt-items', (event, receiptId: number) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM receipt_items WHERE receipt_id = ?`,
      [receiptId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});
