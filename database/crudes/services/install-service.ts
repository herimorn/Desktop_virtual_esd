import { Service } from 'node-windows';
import path from 'path';

// Create a new service object
const svc = new Service({
  name: 'ReceiptSenderService', // Name of the service
  description: 'A service to send receipts in the background.',
  script: path.join(__dirname, 'receipt-sender.ts'), // Path to the receipt-sender script
  nodeOptions: [
    '--harmony', '--max_old_space_size=4096' // Optional Node.js options
  ]
});

// Automatically install and start the service if it's not already installed
svc.on('install', function () {
  svc.start();
  console.log('Service installed and started automatically.');
});

// Check if the service is already installed
svc.on('alreadyinstalled', function () {
  console.log('Service is already installed.');
  svc.start(); // Start the service if it's already installed
});

// Log when the service is started
svc.on('start', function () {
  console.log('Service started successfully.');
});

// Handle errors during service installation or start
svc.on('error', function (err: any) {
  console.error('Service installation or start failed:', err);
});

// Check if the service exists and install it if not
svc.exists((exists: boolean) => {
  if (!exists) {
    svc.install(); // Install the service if not already installed
  } else {
    svc.start(); // Start the service if already installed
  }
});
