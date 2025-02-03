// install-service.ts
import { Service } from 'node-windows'; // Import the Service class from node-windows
import { exec } from 'child_process';
import path from 'path';
// import { Service } from 'node-windows';

const svcName = 'ReceiptReportSenderService'; // Your service name

// Create a new service object
const svc = new Service({
  name: svcName,
  description: 'A service to send receipts in the background.',
  script: path.join(__dirname, 'receipt-sender.ts'), // Ensure the path to your script is correct
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

// Automatically install and start the service if it's not already installed
svc.on('install', function () {
  svc.start();
  console.log('Service installed and started automatically.');
});

// Log when the service is already installed
svc.on('alreadyinstalled', function () {
  console.log('Service is already installed.');
  svc.start();
});

// Log when the service is started
svc.on('start', function () {
  console.log('Service started successfully.');
});

// Handle errors during service installation or start
svc.on('error', function (err: any) {
  console.error('Service installation or start failed:', err);
});

// Function to check if the service exists
function checkServiceExists(serviceName: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    exec(`sc query "${serviceName}"`, (error, stdout) => {
      if (error) {
        if (error.code === 1060) {
          // ERROR_SERVICE_DOES_NOT_EXIST
          resolve(false);
        } else {
          reject(`Failed to query service: ${error.message}`);
        }
      } else {
        resolve(true); // Service exists
      }
    });
  });
}

// Check if the service exists
checkServiceExists(svcName)
  .then((exists) => {
    if (!exists) {
      console.log('Service does not exist, installing...');
      svc.install(); // Install the service if it does not exist
    } else {
      console.log('Service already exists, starting the service...');
      svc.start(); // Start the service if already installed
    }
  })
  .catch((err) => {
    console.error('Error checking service:', err);
  });
