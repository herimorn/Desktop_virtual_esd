
import { app, BrowserWindow, ipcMain } from 'electron';
import {connectToDatabase } from '../../src/main/database';

// Create the database connection
const db = connectToDatabase(); // Use const instead of let

// Function to check if PFX exists
ipcMain.handle('check-pfx-exists', async () => {
  try {
    const row = await new Promise<any>((resolve, reject) => {
      db.get('SELECT * FROM pfx LIMIT 1', (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (row) {
      // console.log('PFX Data:', row);
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error('Error checking PFX table:', err);
    return false;
  }
});

// Function to check if TRA registration exists
ipcMain.handle('check-register-tra', async () => {
  try {
    const row = await new Promise<any>((resolve, reject) => {
      db.get('SELECT * FROM TRA LIMIT 1', (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (row) {
      // console.log('TRA Data:', row);
      return true;
    } else {
      return false;
    }
  } catch (err) {
    // console.error('Error checking TRA table:', err);
    return false;
  }
});
