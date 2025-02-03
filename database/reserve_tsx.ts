/* eslint-disable prettier/prettier */
import { ipcMain, IpcMainEvent, BrowserWindow} from 'electron';
import bcrypt from 'bcrypt';
import sqlite3, { Database, RunResult, Statement } from 'sqlite3';
import fs from 'fs';
import path from 'path';

const sqlite3Verbose = sqlite3.verbose();
let db: Database;
let verifiedSerial: string | null = null;

function initialize() {
  db = new sqlite3Verbose.Database('virtual_sd.db', (err: Error | null) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          companyName TEXT,
          fullName TEXT,
          email TEXT UNIQUE,
          country TEXT,
          address TEXT,
          currency TEXT,
          bankName TEXT,
          phone TEXT,
          chartOfAccounts TEXT,
          fiscalYearStart TEXT,
          fiscalYearEnd TEXT,
          serialNumber TEXT,
          password TEXT,
          profile TEXT
        )
      `);
    }
  });
}

// Define the formData interface with profilePicture as a base64 string
interface formData {
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
async function saveProfilePicture(base64Data:any) {
  const dir = path.join(__dirname, 'profile_pictures'); // Define the directory where pictures will be saved
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir); // Create the directory if it doesn't exist
  }

  const fileName = `profile-${Date.now()}.png`; // Generate a unique file name
  const filePath = path.join(dir, fileName);

  // Save the Base64 data to a file
  fs.writeFileSync(filePath, base64Data, 'base64');

  return filePath;
}
// Function to register a user
function registerUser() {
  ipcMain.handle('register', async (event, formData) => {
    console.log("Received formData:", formData); // Log the entire formData object

    try {
      const {
        companyName,
        fullName,
        email,
        phone,
        address,
        country,
        currency,
        bankName,
        chartOfAccounts,
        fiscalYearStart,
        fiscalYearEnd,
        serialNumber,
        password,
        profilePicture,
      } = formData;
      console.log('form data of profile is  ')
      console.log("Received formData: u=in try block", formData.profilePicture);

      let profilePicturePath = null;
      if (profilePicture) {
        console.log("Profile picture data received"); // Log if profile picture data is present
        const base64Data = profilePicture.replace(/^data:image\/\w+;base64,/, '');
        profilePicturePath = await saveProfilePicture(base64Data);
        console.log("Profile picture saved at:", profilePicturePath); // Log where the profile picture is saved
      } else {
        console.log("No profile picture data provided"); // Log if no profile picture data is provided
      }

      // Insert the data into the SQLite database
      const insertUser = () => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO users (
              companyName, fullName, email, phone, address, country, currency, bankName,
              chartOfAccounts, fiscalYearStart, fiscalYearEnd, serialNumber, password, profile
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              companyName, fullName, email, phone, address, country, currency, bankName,
              chartOfAccounts, fiscalYearStart, fiscalYearEnd, serialNumber, password, profilePicturePath
            ],
            function (err) {
              if (err) {
                console.error(`Database insertion error: ${err.message}`);
                reject(new Error(`Failed to register user: ${err.message}`));
              } else {
                console.log("User registered successfully");
                resolve({ success: true, message: 'Registration successful!' });
              }
            }
          );
        });
      };

      const result = await insertUser();
      event.reply('register-response', result);
    } catch (error) {
      console.error(`Error during registration: ${error.message}`);
      event.reply('register-response', { success: false, message: error.message });
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
// Function to check if the users table is empty
function checkIfTableIsEmpty(mainWindow: BrowserWindow) {
  db.get(`SELECT COUNT(*) as count FROM users`, (err, row: any) => {
    if (err) {
      console.error('Error checking users table:', err.message);
      return;
    }

    // Determine if we should redirect to login
    const redirectToLogin = row.count > 0; // If there are users, redirect to login

    console.log('Users count:', row.count);
    console.log('Redirect to login:', redirectToLogin);

    // Send the result to the renderer process
    mainWindow.webContents.send('redirect-to-login', redirectToLogin);
  });
}



// verify email

interface SerialVerifyArg {
  serial: string;
}

function VerifyEmail() {
  ipcMain.on('emailVerify', async (event: IpcMainEvent, arg: SerialVerifyArg) => {
    const { serial } = arg;
    console.log(serial); // Logging the serial for debugging

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
              console.log('Serial number found:', serial); // Log when serial is found
              verifiedSerial = serial;
              event.reply('email-response', { success: true, message: 'Serial number found.' });
            } else {
              console.log('Serial number not found:', serial); // Log when serial is not found
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
    console.log("Resetting password for serial:", verifiedSerial);

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


initialize();

export { initialize, db, registerUser, LoginUser, checkIfTableIsEmpty, VerifyEmail, resetPassword };
