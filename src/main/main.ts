import path from 'path';
import { app, BrowserWindow,dialog, shell, ipcMain, Tray, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import {LoginUser, checkIfTableIsEmpty,EditUser,FetchUser, VerifyEmail, resetPassword, registerUser } from '../../database/Connectionmgr';
import { handlePfxUpload } from './pfxHandler';
import { getSerialNumberById, getPrivateKeyById, insertTRAData, getAllTRAData,insertTaxData, fetchTaxCodes} from '../../database/RegistrationTRA'; // Import functions to get serial number and private key
import { registerToTRA } from '../main/TraRegister';
import xml2js from 'xml2js';
import axios from 'axios';
import qs from 'qs';
import "../../database/crudes/product";
import "../../database/crudes/customer";
import "../../database/crudes/supplier";
import "../../database/crudes/purchase";
import "../../database/crudes/purchaseitems"
import "../../database/crudes/expense";
import "../../database/crudes/stock"
import "../../database/crudes/sales"
import "../../database/crudes/invoice"
import "../../database/crudes/dashboard"
import "../../database/crudes/barcode"
import "../../database/crudes/profoma"
import "../../database/crudes/styles";
import "../../database/crudes/report";
import "../../database/crudes/all-report";
import "../../database/crudes/all-receipt";
import "../../database/crudes/sendTra";
import backupDatabase from '../../database/crudes/backup';
import "../../database/crudes/customStyles";
import "../../database/crudes/tra_backend";
import "../../database/crudes/all-receipt";
const { sendEmail } = require("../../database/crudes/mail")
// import { handleDatabaseImport } from '../../database/crudes/import';

import "../../database/crudes/import";
import { connectToDatabase, createTables } from './database';
import { LoginUser } from '../../database/Connectionmgr';
import "../../database/crudes/checking";
const { sendReceiptToTRA } = require("../../database/crudes/sendTra");
import { insertDemoData } from './demo';
import  fs = require('fs');
// const appLauncher = require('app-launcher');



ipcMain.handle('save-file', async (event, fileName, data) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: fileName,
        filters: [
            { name: 'CSV Files', extensions: ['csv'] }
        ]
    });

    if (!canceled && filePath) {
        fs.writeFileSync(filePath, data, 'utf-8');
    }
});

// Initialize the database
const db=connectToDatabase();
// Function to get token
const getToken = async (username: string, password: string): Promise<string> => {
  const tokenUrl = "https://vfdtest.tra.go.tz/vfdtoken";

  const tokenData = {
    username,
    password,
    grant_type: 'password',
  };

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const response = await axios.post(tokenUrl, qs.stringify(tokenData), { headers });
  console.log(response);
  const accessToken: string = response.data.access_token;
  const expiration: number = response.data.expires_in;
  insertOrUpdateToken(accessToken, expiration);
  return accessToken;
};

// Function to insert or update token


ipcMain.on('download-excel', (event) => {
  dialog.showSaveDialog({
    title: 'Save CSV File',
    defaultPath: 'Products.csv',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  }).then((file) => {
    if (!file.canceled) {
      const filePath = file.filePath.toString();

      // Assuming the CSV file is in the public directory
      fs.copyFileSync('public/excel/Products.csv', filePath);

      event.sender.send('download-success', 'File saved successfully!');
    }
  }).catch(err => {
    console.log(err);
  });
});

function insertOrUpdateToken(token: string, expiration: number): void {
  db.get('SELECT * FROM token ORDER BY id DESC LIMIT 1', [], (err, row) => {
    if (err) {
      console.error('Error fetching token:', err.message);
      return;
    }

    if (row) {
      // Token exists, check if it's expired
      if (tokenExpired(new Date(row.expiration))) {
        db.run(
          'UPDATE token SET token = ?, expiration = ? WHERE id = ?',
          [token, expiration, row.id],
          (updateErr) => {
            if (updateErr) {
              console.error('Error updating token:', updateErr.message);
            } else {
              console.log('Token updated successfully.');
            }
          }
        );
      } else {
        console.log('Token exists but not expired, skipping update.');
      }
    } else {
      // No token found, insert a new one
      db.run(
        'INSERT INTO token (token, expiration) VALUES (?, ?)',
        [token, expiration],
        (insertErr) => {
          if (insertErr) {
            console.error('Error inserting token:', insertErr.message);
          } else {
            console.log('Token inserted successfully.');
          }
        }
      );
    }
  });
}

// Interface for token status response from database
interface TokenRow {
  id: number;
  token: string;
  expiration: number;
}

// Interface for token status response
interface TokenStatusResponse {
  token: string | null;
  status: 'valid' | 'expired';
}

// Function to fetch token status
function fetchTokenStatus(): TokenStatusResponse {
  try {
    // Fetch the most recent token
    const row = db.prepare('SELECT * FROM token ORDER BY id DESC LIMIT 1').get();

    if (row) {
      if (!tokenExpired(new Date(row.expiration))) {
        return { token: row.token, status: 'valid' };
      } else {
        return { token: null, status: 'expired' };
      }
    } else {
      return { token: null, status: 'expired' };
    }
  } catch (err) {
    console.error('Error fetching token status:', err.message);
    throw err; // Re-throw the error to handle it upstream if needed
  }
}

// Mock implementation of tokenExpired function for illustration
function tokenExpired(expiration: Date): boolean {
  return expiration < new Date();
}

class AppUpdater {

  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}
//handling tax codes
ipcMain.handle('fetch-tax-codes', async () => {
  try {
    return new Promise((resolve, reject) => {
      // Execute the SQL query asynchronously
      db.all('SELECT id, codeType, codeValue FROM Tax', [], (err, rows) => {
        if (err) {
          console.error('Error fetching tax codes:', err.message);
          reject(err); // Reject the promise in case of error
        } else {
          console.log('Fetched tax codes:', rows);
          resolve(rows); // Resolve the promise with the fetched rows
        }
      });
    });
  } catch (err) {
    console.error('Error occurred:', err.message);
    throw err; // Re-throw the error to handle it upstream if needed
  }
});

let mainWindow: BrowserWindow | null = null;
let hasReloaded = false
let tray: Tray | null;
let isQuitting = false; // Define isQuitting as a global variable

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    titleBarStyle: 'default', // Ensure title bar is not hidden
    height: process.platform === 'win32' ? 826 : 800,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

// Set up the system tray
tray = new Tray(getAssetPath('icon.png')); // Path to tray icon


const contextMenu = Menu.buildFromTemplate([
  { label: 'Show App', click: () => mainWindow?.show() },
  { label: 'Exit', click: () => {
    isQuitting = true; // Set isQuitting to true when quitting from tray
    app.quit();
  }},
]);
tray.setToolTip('App run at the background');
tray.setContextMenu(contextMenu);

// When the tray icon is clicked, show the main window
tray.on('click', () => {
  mainWindow?.show();
});

// Handle minimize to tray instead of closing
mainWindow.on('minimize', (event:any) => {
  event.preventDefault();
  mainWindow?.hide(); // Hide window when minimized
});

// Handle close event
mainWindow.on('close', (event) => {
  if (!isQuitting) {
    event.preventDefault();
    mainWindow?.hide(); // Hide window on close if not actually quitting
  }
});


  checkIfTableIsEmpty();

  async function checkIfTableIsEmpty(mainWindow: BrowserWindow) {
    try {
      const redirectToLogin = await new Promise<boolean>((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
          if (err) {
            console.error('Error checking users table:', err.message);
            reject(err);
          } else {
            // Redirect to login if there are users (count > 0)
            const shouldRedirectToLogin = row.count > 0;
            console.log('Users count:', row.count);
            console.log('Redirect to login:', shouldRedirectToLogin);

            // Send the result to the renderer process
            if (mainWindow) {
              mainWindow.webContents.send('redirect-to-login', shouldRedirectToLogin);

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
            resolve(shouldRedirectToLogin);
          }
        });
      });

      return redirectToLogin;
    } catch (error) {
      console.error('Error during check:', error);
      return false; // Default to false in case of error
    }
  }
// IPC handler for checking table status
// appLauncher.launchOnStartup({ appName: 'Virtual_esd' });
ipcMain.handle('check-users-table', async () => {
  return await checkIfTableIsEmpty();
});

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');

    }
    if (process.env.START_MINIMIZED) {
      // checkIfTableIsEmpty(mainWindow);
      mainWindow.minimize();
      // mainWindow.reload();
      createTables();
      // insertDemoData(); //should be commented
    } else {
      if (!hasReloaded) {
        // mainWindow.reload();
        hasReloaded = true;  // Update the reload flag
      }
      mainWindow.show();


      // Start processing the receipt queue every 50 seconds
      // setInterval(() => {
      //   processReceiptQueue();
      // }, 50000); // 50,000 milliseconds = 50 seconds

      // You can call it immediately if you want the first execution right away
      // processReceiptQueue();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide(); // Hide window on close if not actually quitting
    }
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow) {
      // checkIfTableIsEmpty(mainWindow);
    }
  });

  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', async () => {

  // Set the app to launch on startup (Windows and macOS only)
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true, // Open minimized
  });


  await createWindow();

    setInterval(requestToken, 10 * 60 * 1000); // 10 minutes in milliseconds
 setInterval(() => {
  console.log('Running scheduled backup...');
  backupDatabase();
}, 3600000); // 1 hour
  // setInterval(requestToken,60*1000);
});

// Register IPC event listeners
LoginUser();
registerUser();
VerifyEmail();
resetPassword();
EditUser();
FetchUser();
ipcMain.on('upload-pfx', async (event, data) => {
  try {
    const response = await handlePfxUpload(data);
    log.info("the upload response data is",response);
    event.reply('upload-pfx-response', response);
  } catch (error: any) {
    event.reply('upload-pfx-response', { error: error.message });
    log.error('upload-pfx-response',error.message);
  }
});

//the function for handling uploading to pdf

ipcMain.handle('calculate-profit-loss', async (_, filters) => {
  try {
    const { calculateProfitLoss } = require('./../../database/crudes/profit');
    return await calculateProfitLoss(filters);
  } catch (error) {
    console.error('Error calculating profit/loss:', error);
    throw error;
  }
})
ipcMain.handle("fetch-accounts", async (event, filters) => {
  return new Promise((resolve, reject) => {
    const { startDate = "", endDate = "", month = "", year = "" } = filters || {};

    let whereClauses = [];
    let params = [];

    if (startDate && endDate) {
      whereClauses.push(`date BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }

    if (month) {
      whereClauses.push(`strftime('%m', date) = ?`);
      params.push(month.padStart(2, "0"));
    }

    if (year) {
      whereClauses.push(`strftime('%Y', date) = ?`);
      params.push(year);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Sales Query (Revenue)
    const salesQuery = `
      SELECT
        s.id AS id,
        s.date AS date,
        'Sale' AS type,
        SUM(si.quantity * si.price) AS amount,
        NULL AS category
      FROM Sales s
      JOIN SalesItems si ON s.id = si.sale_id
      ${whereClause}
      GROUP BY s.id
    `;

    // COGS Query: Corrected to use quantity from SalesItems
    const cogsQuery = `
      SELECT
        si.sale_id AS id,
        p.date AS date,
        'COGS' AS type,
        SUM(si.quantity * pi.price) AS amount,  -- Multiply sold quantity with purchase price
        NULL AS category
      FROM SalesItems si
      JOIN PurchaseItems pi ON si.product_id = pi.product_id
      JOIN Purchases p ON p.id = pi.purchase_id
      WHERE si.quantity > 0
      ${whereClause}
      GROUP BY si.sale_id
    `;

    // Purchases Query (Total Purchases)
    const purchasesQuery = `
      SELECT
        p.id AS id,
        p.date AS date,
        'Purchase' AS type,
        SUM(pi.quantity * pi.price) AS amount,
        NULL AS category
      FROM Purchases p
      JOIN PurchaseItems pi ON p.id = pi.purchase_id
      ${whereClause}
      GROUP BY p.id
    `;

    // Expenses Query (Total Expenses)
    const expensesQuery = `
      SELECT
        e.id AS id,
        e.date AS date,
        'Expense' AS type,
        SUM(ep.amount) AS amount,
        e.category AS category
      FROM Expenses e
      JOIN ExpensePurchase ep ON e.id = ep.expense_id
      ${whereClause}
      GROUP BY e.id
    `;

    // Combining all queries
    const combinedQuery = `
      ${salesQuery}
      UNION ALL
      ${cogsQuery}
      UNION ALL
      ${purchasesQuery}
      UNION ALL
      ${expensesQuery}
      ORDER BY date DESC
    `;

    db.all(combinedQuery, params, (err, rows) => {
      if (err) {
        console.error("Error fetching accounts:", err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});



ipcMain.handle('save-and-send-invoice', async (event, { email, pdfBlob }) => {
  try {
    // Use app.getPath('userData') for production to store invoices in the user's application data directory
    const baseDir = process.env.NODE_ENV === 'production'
      ? app.getPath('userData')
      : __dirname;

    const invoicesDir = path.join(baseDir, 'invoices');

    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true }); // Create invoices directory if it doesn't exist
    }

    // Set a fixed filename based on customer email
    const pdfPath = path.join(invoicesDir, `invoice_${email}.pdf`);

    // Overwrite the existing invoice file
    fs.writeFileSync(pdfPath, Buffer.from(pdfBlob));

    console.log(`Invoice saved at: ${pdfPath}`);

    // Send the email with the saved PDF attached
    const subject = 'Your Invoice';
    const body = 'Please find your latest invoice attached.';

    const response = await sendEmail(email, subject, body, pdfPath);

    return response;
  } catch (error) {
    console.error('Error saving/sending invoice:', error);
    return { success: false, error: error.message };
  }
});
// Insert or update email configuration
export const addOrUpdateEmailConfiguration = (email: string, password: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO email_configuration (email, password)
       VALUES (?, ?)
       ON CONFLICT(email) DO UPDATE SET password = ?`,
      [email, password, password], // The last ? is for the updated password value
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};



// Fetch email configuration
export const fetchEmailConfiguration = (): Promise<{ email: string; password: string } | null> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT email, password FROM email_configuration LIMIT 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
};

ipcMain.handle('add-or-update-email-configuration', async (_, email, password) => {
  return await addOrUpdateEmailConfiguration(email, password);
});

ipcMain.handle('register-to-tra', async (event, tin, certKey) => {
  try {
    const serialNumber = await  getSerialNumberById(1);
    const privateKey = await getPrivateKeyById(1);
    if (serialNumber && privateKey) {
      console.log("the tin,cert key,serial Number are",serialNumber,privateKey)
      const response = await registerToTRA(tin, certKey, serialNumber, privateKey);
      console.log('sending registration response is',response)

      const parser = new xml2js.Parser();
      parser.parseString(response, async (err, result) => {
        if (err) {
          throw new Error('Error parsing XML response');
        }

        const responseData = result.EFDMS.EFDMSRESP[0];

        const dataToInsert = {
          tin:responseData.TIN[0],
          certKey,
          regId: responseData.REGID[0],
          username: responseData.USERNAME[0],
          password: responseData.PASSWORD[0],
          gc: responseData.GC[0],
          receiptCode: responseData.RECEIPTCODE[0],
          mobile: responseData.MOBILE[0],
          vrn: responseData.VRN[0],
          tax_office: responseData.TAXOFFICE[0],
          user: responseData.NAME[0],
          street: responseData.STREET ? responseData.STREET[0] : "", // Default to empty if not provided
          city: responseData.CITY ? responseData.CITY[0] : "",       // Default to empty if not provided
          registrationDate: responseData.REGISTRATIONDATE ? responseData.REGISTRATIONDATE[0] : new Date().toISOString().split("T")[0] // Default to today's date if not provided
        };


        // Insert data into TRA table
        // Check if all required values are populated
        const isValidData = Object.values(dataToInsert).every(value => value !== undefined && value !== null && value !== "");

        if (isValidData) {
          // Insert data into TRA table only if all fields are populated
          console.log('Payload data to insert is', dataToInsert);
          insertTRAData(dataToInsert);
        } else {
          console.log("Data validation failed: Not all required fields have values", dataToInsert);
        }

        // Insert data into Tax table
        const taxCodes = {
          codeA: responseData.TAXCODES[0].CODEA[0],
          codeB: responseData.TAXCODES[0].CODEB[0],
          codeC: responseData.TAXCODES[0].CODEC[0],
          codeD: responseData.TAXCODES[0].CODED[0], // Added this assuming the exempted code needs to be handled as well
        };
        await insertTaxData(taxCodes);
      });

      return response;
    } else {
      throw new Error('Serial number or private key not found');
    }
  } catch (error: any) {
    console.error('Error during registration:', error.message);
    throw error;
  }
});

// IPC event to handle token request
const requestToken = async () => {
  try {
    const traData = await getAllTRAData();
    if (traData.length > 0) {
      const { username, password } = traData[0];
      // console.log(username,password) // Assuming we use the first entry
      await getToken(username, password);
    } else {
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('token-response', { success: false, message: 'No TRA data found' });
      });
    }
  } catch (error: any) {
    console.error('Error getting token:', error);
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('token-response', { success: false, message: 'An error occurred while obtaining the token' });
    });
  }
};

// ipcMain.handle('check-pfx-exists', () => {
//   try {
//     // Prepare and execute the query to check if any PFX records exist
//     const row = db.prepare('SELECT id FROM pfx LIMIT 1').get();
//     return !!row; // Return true if row exists, otherwise false
//   } catch (err:any) {
//     console.error('Error checking PFX data:', err.message);
//     throw err; // Re-throw the error to handle it upstream if needed
//   }
// });

// //handling register to Tra
// ipcMain.handle('check-register-tra', () => {
//   try {
//     // Prepare and execute the query to check if any TRA records exist
//     const row = db.prepare('SELECT id FROM TRA LIMIT 1').get();
//     return !!row; // Return true if row exists, otherwise false
//   } catch (err) {
//     console.error('Error checking registration data:', err.message);
//     throw err; // Re-throw the error to handle it upstream if needed
//   }
// });

// Handle the 'fetch-user-data' request
ipcMain.handle('fetch-user-data', async () => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM users LIMIT 1';

    // Run the query
    db.get(query, (err, row) => {
      if (err) {
        console.error('Error fetching user data:', err.message);
        reject(err); // Reject the promise if there's an error
      } else {
        console.log('Fetched user data:', row);
        resolve(row); // Resolve the promise with the fetched row
      }
    });
  });
});
//query for sending receipt to the TRA



// ipcMain.handle('send-sale-data-to-tra', async (event, receiptData) => {
//   try {
//     // Validate and process receipt data
//     console.log('Received receipt data:', receiptData);

//     // Send receipt to TRA
//     const response = await sendReceiptToTRA(receiptData);

//     // Log and return the response
//     console.log('TRA Response:', response);
//     return response;
//   } catch (error) {
//     console.error('Error in sending receipt to TRA:', error);

//     // Handle the error and return a response back to the renderer process
//     return { success: false, message: error.message || 'An error occurred while sending receipt to TRA' };
//   }
// // });
// function sendToTRA(saleData: any) {
//   throw new Error('Function not implemented.');
// }



// Add this handler to fetch customizations
