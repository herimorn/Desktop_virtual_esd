import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3'; // Assuming SQLite is already required in your project
import { app } from 'electron';
import webpackPaths from '../../.erb/configs/webpack.paths';  // Ensure app is available for production path handling

// Assuming webpackPaths.appPath is correctly configured in your webpack setup
const sqlite3Verbose = sqlite3.verbose();
let db: sqlite3.Database;

const databaseName = "virtual_esd.sqlite3";
const sqlPath_dev = path.join(webpackPaths.appPath, 'sql', databaseName);  // Development path
const sqlPath_prod = path.join(app.getPath('userData'), databaseName);      // Production path
const sqlPath = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'
  ? sqlPath_dev
  : sqlPath_prod;

const sqlPathsInfo = [sqlPath, sqlPath_dev, sqlPath_prod, process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'];

ipcMain.handle('import-database', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Database File',
    properties: ['openFile'],
    filters: [{ name: 'Database Files', extensions: ['sqlite3'] }],
  });

  if (canceled || filePaths.length === 0) {
    return { success: false };
  }

  const sourceFile = filePaths[0];
  
  // Use the correct destination path depending on the environment
  const destination = sqlPath;
  const totalSize = fs.statSync(sourceFile).size;

  return new Promise<{ success: boolean; progress: number }>((resolve) => {
    const readStream = fs.createReadStream(sourceFile);
    const writeStream = fs.createWriteStream(destination);

    let transferred = 0;

    readStream.on('data', (chunk) => {
      transferred += chunk.length;
      const progress = Math.round((transferred / totalSize) * 100);
      ipcMain.emit('import-progress', progress); // Emit progress events
    });

    readStream.pipe(writeStream);

    writeStream.on('finish', () => {
      resolve({ success: true, progress: 100 });
    });

    writeStream.on('error', () => {
      resolve({ success: false, progress: 0 });
    });
  });
});

// You can now use `sqlPath` to interact with your SQLite database using the correct path based on the environment.
