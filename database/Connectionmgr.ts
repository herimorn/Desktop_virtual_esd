/* eslint-disable prettier/prettier */
import { ipcMain, IpcMainEvent, BrowserWindow} from 'electron';
import bcrypt from 'bcryptjs';
import sqlite3, { Database, RunResult, Statement } from 'sqlite3';
import fs from 'fs';
import path from 'path';
import {connectToDatabase } from '../src/main/database'; // Adjust path based on actual file location

// import { connectToDatabase } from 'main/database';
// import { connectToDatabase } from 'main/database';
const db=connectToDatabase();

// Define the formData interface with profilePicture as a base64 string
interface formData {
  id:number;
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  currency: string;
  bankName: string;
  chartOfAccounts: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  serialNumber: string;
  password: string;
  profilePicture: string; // Base64 string of the profile picture
}
function registerUser() {

  ipcMain.on('register', async (event: IpcMainEvent, arg: { formData: FormData }) => {
    // console.log('')
    const { formData } = arg;
    // console.log('Registering user with:', formData);
    try {
      const hashedPassword = await bcrypt.hash(formData.password, 10);
      const stmt: Statement = db.prepare(`
        INSERT INTO users (
          companyName, fullName, email, country, currency, bankName, chartOfAccounts,
          fiscalYearStart, fiscalYearEnd, serialNumber, password,profile,phone,address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)
      `);

      stmt.run(
        formData.companyName, formData.fullName, formData.email, formData.country, formData.currency,
        formData.bankName, formData.chartOfAccounts, formData.fiscalYearStart, formData.fiscalYearEnd,
        formData.serialNumber, hashedPassword,formData.profilePicture,formData.phone,formData.address,
        function (this: RunResult, err: Error | null) {
          if (err) {
            event.reply('register-response', { success: false, message: err.message });
          } else {
            event.reply('register-response', { success: true, message: 'Registration successful!' });
          }
        }
      );

      stmt.finalize();
    } catch (error:any) {
      event.reply('register-response', { success: false, message: error.message });
    }
  });
}

// Edit Profile
function FetchUser() {
  ipcMain.handle('getCompanyById', (event, id) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Query the database for the user with the specific ID
        const user = await db.get('SELECT * FROM users ');
        console.log('Fetched User:', user); // Log the fetched user for debugging

        // Check if the user was found and resolve the result
        if (user) {
          resolve({ data: user }); // Resolve with the found user data
        } else {
          resolve({ error: 'User not found.' }); // Handle case where user doesn't exist
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        reject({ error: 'Failed to fetch user data.' }); // Reject with an error message
      }
    });
  });
}

// EditUser Function (Backend)

function EditUser() {
  // Listen for the 'update' event from the renderer process
  ipcMain.on('update', async (event: IpcMainEvent, arg: { formData: any }) => {
    const { formData } = arg;

    try {
      const query = `
        UPDATE users
        SET
          companyName = ?,
          fullName = ?,
          email = ?,
          phone = ?,
          address = ?
        WHERE id = ?
      `;

      db.run(
        query,
        [
          formData.companyName,
          formData.fullName,
          formData.email,
          formData.phone,
          formData.address,
          formData.id,
        ],
        function (err: Error | null) {
          if (err) {
            console.error('Error updating user:', err);
            event.reply('edit-response', { success: false, message: err.message });
          } else {
            console.log(`Rows updated: ${this.changes}`);
            event.reply('edit-response', {
              success: true,
              message: 'Update successful!',
            });
          }
        }
      );
    } catch (error: any) {
      console.error('Unexpected error:', error);
      event.reply('edit-response', { success: false, message: error.message });
    }
  });
}
interface LoginArg {
  serial: string;
  password: string;
}

function LoginUser() {
  ipcMain.on('login', async (event: IpcMainEvent, arg: LoginArg) => {
    const { serial, password } = arg;

    try {
      db.get(
        `SELECT * FROM users WHERE serialNumber = ?`,
        [serial],
        async (err: Error | null, row: any) => {
          if (err) {
            event.reply('login-response', { success: false, message: err.message });
          } else if (row) {
            const isPasswordMatch = await bcrypt.compare(password, row.password);
            if (isPasswordMatch) {
              event.reply('login-response', { success: true, message: 'Login successful!' });
            } else {
              event.reply('login-response', { success: false, message: 'Invalid serial Number or password.' });
            }
          } else {
            event.reply('login-response', { success: false, message: 'Invalid serial Number or password.' });
          }
        }
      );
    } catch (error:any) {
      event.reply('login-response', { success: false, message: error.message });
    }
  });
}
let hasReloaded = false; // Flag to ensure reload happens only once

function checkIfTableIsEmpty(mainWindow: BrowserWindow) {
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) {
      console.error('Error checking users table:', err.message);
      return;
    }

    // Set redirectToLogin to true if count is 1 or 0
    const redirectToLogin = row.count <= 1;

    // console.log('Users count:', row.count);
    // console.log('Redirect to login:', redirectToLogin);

    // Send the result to the renderer process
    if (mainWindow) {
      mainWindow.webContents.send('redirect-to-login', redirectToLogin);

      // Reload the window after 3 seconds only if it hasn't been reloaded already
      if (!hasReloaded) {
        setTimeout(() => {
          if (mainWindow) {
            mainWindow.reload();
            hasReloaded = true; // Set the flag to true to prevent further reloads
          }
        }, 3000); // Adjust the delay as needed
      }
    }
  });
}

// verify email

interface SerialVerifyArg {
  serial: string;
}
let verifiedSerial: string | undefined; // Declare it at a higher scope

function VerifyEmail() {
  ipcMain.on('emailVerify', async (event: IpcMainEvent, arg: SerialVerifyArg) => {
    const { serial } = arg;
    // console.log(serial); // Logging the serial for debugging

    try {
      db.get(
        'SELECT * FROM users WHERE serialNumber = ?',
        [serial],
        (err: Error | null, row: any) => {
          if (err) {
            console.error(err); // Log the error for debugging
            event.reply('email-response', { success: false, message: err.message });
          } else {
            if (row) {
              // console.log('Serial number found:', serial); // Log when serial is found
              verifiedSerial = serial;
              event.reply('email-response', { success: true, message: 'Serial number found.' });
            } else {
              // console.log('Serial number not found:', serial); // Log when serial is not found
              event.reply('email-response', { success: false, message: 'Serial number not found.' });
            }
          }
        }
      );
    } catch (error:any) {
      console.error(error); // Log any unexpected errors
      event.reply('email-response', { success: false, message: error.message });
    }
  });
}

// Reset password function
function resetPassword() {
  ipcMain.on('set-password', async (event: IpcMainEvent, arg: { newPassword: string }) => {
    const { newPassword } = arg;
    // console.log("Resetting password for serial:", verifiedSerial);

    if (!verifiedSerial) {
      event.reply('set-password-response', { success: false, message: 'Serial number not verified.' });
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run(
        'UPDATE users SET password = ? WHERE serialNumber = ?',
        [hashedPassword, verifiedSerial],
        function (this: RunResult, err: Error | null) {
          if (err) {
            event.reply('set-password-response', { success: false, message: err.message });
          } else {
            event.reply('set-password-response', { success: true, message: 'Password updated successfully!' });
            verifiedSerial = null; // Clear the verified serial after reset
          }
        }
      );
    } catch (error:any) {
      event.reply('set-password-response', { success: false, message: error.message });
    }
  });
}



export { db, registerUser,EditUser,FetchUser, LoginUser, checkIfTableIsEmpty, VerifyEmail, resetPassword };
