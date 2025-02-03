import path from 'path';
import { spawn } from 'child_process';

const installAndRunService = (): void => {
  const serviceScriptPath = path.join(__dirname, 'install-service.ts');
  const npxPath = 'C:\\Users\\herimorn\\AppData\\Roaming\\npm\\npx.cmd'; // Ensure this path is correct

  console.log(`Using npx from: ${npxPath}`); // Debugging line

  const process = spawn(npxPath, ['ts-node', serviceScriptPath], {
    stdio: 'inherit', // Use 'inherit' to see output directly
    shell: true, // Use a shell to execute the command
  });

  process.on('error', (error) => {
    console.error(`Error installing or running service: ${error.message}`);
  });

  process.on('exit', (code) => {
    console.log(`Service exited with code ${code}`);
  });
};

// Call the function to install and run the service
installAndRunService();
