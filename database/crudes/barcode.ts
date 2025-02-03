import { app, BrowserWindow, ipcMain } from 'electron';
import {connectToDatabase } from '../../src/main/database';
import path from 'path';
import sqlite3 from 'sqlite3';


// Initialize database pat
const db=connectToDatabase();

function fetchInvoiceDetails(saleId: number, invoiceNumber: string) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM InvoiceDetails WHERE sale_id = ? AND invoice_number = ? LIMIT 1`,
      [saleId, invoiceNumber],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }

      }
    );
  });
}

// Listen for fetch invoice details request
ipcMain.handle('fetch-bar-code', async (event, saleId: number, invoiceNumber: string) => {
  try {
    const invoiceDetails = await fetchInvoiceDetails(saleId, invoiceNumber);
    return invoiceDetails;
  } catch (error) {
    console.error('Error fetching backode  details:', error);
    throw error;
  }
});

// Additional setup code for Electron (e.g., createWindow, etc.)
