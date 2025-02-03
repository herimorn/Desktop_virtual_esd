import {connectToDatabase } from '../../src/main/database';

const { ipcMain } = require('electron');

const db=connectToDatabase();
ipcMain.handle('getCustomersCount', async () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS count FROM Customers', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count);
      }
    });
  });
});

ipcMain.handle('getProductsCount', async () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS count FROM Products', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count);
      }
    });
  });
});

ipcMain.handle('getSuppliersCount', async () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS count FROM Suppliers', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count);
      }
    });
  });
});

ipcMain.handle('getTotalSales', async () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT SUM(total_amount) AS total FROM Sales', [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.total);
      }
    });
  });
});

// Example of handling chart data
// ipcMain.handle('getCustomersChartData', async () => {
//   // Replace with actual SQL queries and data manipulation to return chart data
//   const chartData = {
//     labels: ['January', 'February', 'March', 'April', 'May'],
//     datasets: [
//       {
//         label: 'Customers',
//         data: [12, 19, 3, 5, 2],
//         backgroundColor: 'rgba(75, 192, 192, 0.6)',
//         borderColor: 'rgba(75, 192, 192, 1)',
//         borderWidth: 1,
//       },
//     ],
//   };
//   return chartData;
// });
ipcMain.handle('getCustomersChartData', async () => {
  try {
    // Fetch customer data grouped by month
    const data = await new Promise((resolve, reject) => {
      db.all(
        'SELECT strftime("%Y-%m", date) AS month, COUNT(*) AS count FROM Customers GROUP BY strftime("%Y-%m", date)',
        (err, rows) => {
          // console.log("The customer data is:", rows);
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });

    // Map data to labels and values for charting
    const labels = data.map((row: { month: any; }) => row.month);
    const values = data.map((row: { count: any; }) => row.count);

    // Return chart data object
    return {
      labels,
      datasets: [{
        label: 'Customers',
        data: values,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 1,
      }],
    };
  } catch (error) {
    // console.error('Error fetching customer chart data:', error);
    throw error;  // This will be caught in the renderer process
  }
});




ipcMain.handle('getSuppliersPieData', (event) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT name, COUNT(*) AS count FROM Suppliers GROUP BY name', (err, data) => {
      if (err) {
        // console.log('Error fetching supplier data:', err);
        reject(err);
      } else {
        // console.log('The supplier data is:', data);


        const labels = data.map(row => row.name);
        const values = data.map(row => row.count);

        resolve({
          labels,
          datasets: [{
            label: 'Suppliers',
            data: values,
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#FF6384'],
          }],
        });
      }
    });
  });
});


ipcMain.handle('getProfitLossData', async () => {
  // Replace with actual SQL queries and data manipulation to return line chart data
  const lineData = {
    labels: ['January', 'February', 'March', 'April', 'May'],
    datasets: [
      {
        label: 'Profit',
        data: [10, 20, 15, 30, 25],
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
      },
      {
        label: 'Loss',
        data: [5, 10, 5, 15, 10],
        fill: false,
        borderColor: 'rgba(255, 99, 132, 1)',
        tension: 0.1,
      },
    ],
  };
  return lineData;
});
