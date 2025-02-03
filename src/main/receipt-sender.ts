// Import your retry logic (adjust the path to your actual retry module)
import { retryFailedReceipts } from '../../database/crudes/sendTra';
import { handleUnsentReceipts } from '../../database/crudes/report'; // Adjust the path to the report function

// Function to start retrying failed receipts
const startRetryProcess = (): void => {
  // Retry receipts immediately when the process starts
  console.log('Retrying failed receipts on startup...');
  retryFailedReceipts().catch((error) => {
    console.error('Error during receipt retry on startup:', error);
  });

  // Periodically retry failed receipts every 60 seconds (adjust as needed)
  setInterval(async () => {
    try {
      console.log('Retrying failed receipts periodically...');
      await retryFailedReceipts();
    } catch (error) {
      console.error('Error during periodic receipt retry:', error);
    }
  }, 60000); // Retry every 60 seconds
};

// Function to handle sending reports for unsent receipts
const startReportProcess = (): void => {
  // Handle unsent receipts immediately on startup
  console.log('Checking for unsent reports on startup...');
  handleUnsentReceipts().catch((error) => {
    console.error('Error handling unsent reports on startup:', error);
  });

  // Periodically check and send reports for unsent receipts every 60 seconds
  setInterval(async () => {
    try {
      console.log('Checking for unsent reports periodically...');
      await handleUnsentReceipts();
    } catch (error) {
      console.error('Error during periodic report handling:', error);
    }
  }, 60000); // Check for unsent reports every 60 seconds
};

// Start both processes (retry failed receipts and handle unsent reports)
const startBackgroundProcesses = (): void => {
  startRetryProcess(); // Start the receipt retry process
  startReportProcess(); // Start the report handling process
};

// Start the background processes when this script is run
startBackgroundProcesses();
