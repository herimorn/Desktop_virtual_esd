import fs from 'fs';
import path from 'path';
import axios from 'axios';  // Ensure axios is installed via `yarn add axios`
import { app } from 'electron';
import webpackPaths from '../../.erb/configs/webpack.paths';  // Import the function
import { connectToDatabase } from '../../src/main/database';
import FormData from 'form-data';  // Import form-data

const db = connectToDatabase();

// Access webpack paths for development
const databaseName = "virtual_esd.sqlite3";
const sqlPath_dev = path.join(webpackPaths.appPath, 'sql', databaseName);  // Development path
const sqlPath_prod = path.join(app.getPath('userData'), databaseName);      // Production path

// Determine the active database path based on environment
const sqlPath = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'
  ? sqlPath_dev
  : sqlPath_prod;

// Backup directory paths (ensure this is consistent in both environments)
const backupDir = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'
  ? path.resolve('release', 'app', 'sql')   // Development backup directory
  : app.getPath('userData');                // Production backup directory

// Function to create a backup based on the serial number
export function getSerialNumber(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT certKey FROM TRA LIMIT 1`, (err, row) => {
      if (err) {
        console.error('Error fetching serial number:', err.message);
        reject(err);
      } else {
        resolve(row ? row.certKey : null);
      }
    });
  });
}

const backupDatabase = async (): Promise<void> => {
  try {
    // Fetch the serial number
    const serialNumber = await getSerialNumber();

    if (!serialNumber) {
      console.error('Serial number not found.');
      return;
    }

    // Debugging: Log the paths being used
    // console.log('Database Path:', sqlPath);
    // console.log('Backup Directory:', backupDir);

    // Ensure the backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Check if the database file exists
    if (!fs.existsSync(sqlPath)) {
      console.error('Database file does not exist:', sqlPath);
      return;
    }

    // Use the serial number as the backup file name
    const backupFileName = `${serialNumber}-backup.sqlite3`;
    const backupPath = path.join(backupDir, backupFileName);

    // Copy the database file to the backup path (replace if exists)
    fs.copyFile(sqlPath, backupPath, fs.constants.COPYFILE_FICLONE, (err) => {
      if (err) {
        console.error('Error backing up the database:', err);
      } else {
        // console.log('Database backup created successfully:', backupPath);

        // After backup, upload the file to the server
        uploadBackupToServer(backupPath);
      }
    });
  } catch (error) {
    console.error('Error creating database backup:', error);
  }
};

// Function to upload the backup file to the server
const uploadBackupToServer = async (backupFilePath: string): Promise<void> => {
  const serverUrl = 'http://192.168.43.250:8080/upload';  // Replace with your actual server URL

  try {
    // Read the backup file
    const backupFile = fs.createReadStream(backupFilePath);

    // Prepare the form-data
    const formData = new FormData();
    formData.append('file', backupFile);

    // Send the HTTP POST request to upload the file (replace if exists)
    const response = await axios.post(serverUrl, formData, {
      headers: {
        ...formData.getHeaders(),  // Set correct headers
      },
    });

    // console.log('File uploaded successfully:', response.data);
  } catch (error) {
    // console.error('Error uploading backup file:', error);
  }
};

// Export the backup function
export default backupDatabase;
