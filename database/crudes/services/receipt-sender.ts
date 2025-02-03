// Import your retry logic (adjust the path to your actual retry module)
import { retryFailedReceipts } from '../sendTra';

// Function to start retrying failed receipts
const startRetryProcess = (): void => {
  // Retry immediately when the process starts
  console.log('Retrying failed receipts on startup...');
  retryFailedReceipts().catch((error) => {
    console.error('Error during receipt retry on startup:', error);
  });

  // Periodically retry every 60 seconds (adjust as needed)
  setInterval(async () => {
    try {
      console.log('Retrying failed receipts periodically...');
      await retryFailedReceipts();
    } catch (error) {
      console.error('Error during periodic retry:', error);
    }
  }, 60000); // Retry every 60 seconds
};

// Start the retry process
startRetryProcess();
