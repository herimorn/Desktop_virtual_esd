import { Buffer } from 'buffer';
import { BrowserWindow, ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { extractPfxData, storePfxData } from '../../database/RegistrationTRA';
import log from 'electron-log'; // Import electron-log for logging

interface UploadData {
  fileData: ArrayBuffer | string | null;
  password: string;
}

export async function handlePfxUpload(data: UploadData): Promise<{ message?: string; error?: string }> {
  const mainWindow = BrowserWindow.getAllWindows()[0];

  return new Promise((resolve, reject) => {
    const { fileData, password } = data;

    if (!fileData) {
      const errorMessage = 'File data is undefined.';
      console.error(errorMessage);
      log.error(errorMessage);
      mainWindow.webContents.send('pfx-upload-error', errorMessage); // Sending error message to renderer
      return reject(new Error(errorMessage));
    }

    console.log('Handling PFX upload...');
    log.info('Handling PFX upload...');
    mainWindow.webContents.send('pfx-upload-progress', 'Handling PFX upload...'); // Sending progress message to renderer

    const buffer = Buffer.from(fileData);

    // Determine the file path based on environment (development or production)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const filePath = isDevelopment
      ? path.join(__dirname, 'temp.pfx')
      : path.join(app.getPath('userData'), 'temp.pfx');

    fs.writeFileSync(filePath, buffer);

    const pfxData = extractPfxData(filePath, password);

    if (!pfxData) {
      const errorMessage = 'Failed to extract PFX data.';
      console.error(errorMessage);
      log.error(errorMessage);
      mainWindow.webContents.send('pfx-upload-error', errorMessage); // Sending error message to renderer
      return reject(new Error(errorMessage));
    }

    storePfxData(password, pfxData.serialNumber, pfxData.signature, pfxData.privateKey, (err: Error | null) => {
      if (err) {
        console.error('Error storing PFX data:', err.message);
        log.error('Error storing PFX data:', err.message);
        mainWindow.webContents.send('pfx-upload-error', `Error storing PFX data: ${err.message}`); // Sending error message to renderer
        return reject(new Error(err.message));
      } else {
        console.log('PFX file uploaded and data extracted successfully.');
        log.info('PFX file uploaded and data extracted successfully.');
        mainWindow.webContents.send('pfx-upload-success', 'PFX file uploaded and data extracted successfully.'); // Sending success message to renderer
        return resolve({ message: 'PFX file uploaded and data extracted successfully.' });
      }
    });
  });
}
