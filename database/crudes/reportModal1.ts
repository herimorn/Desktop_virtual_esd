import axios from 'axios';
import { ipcMain } from 'electron';
import { Database } from 'sqlite3';

// Initialize SQLite database
const db = new Database('your-database-file.db');

// Function to get unsent receipts and generate the report payload
async function generateReportPayload(date: string, time: string) {
  return new Promise<string>((resolve, reject) => {
    db.all(
      `SELECT * FROM receipt WHERE rct_date = ? AND sent = FALSE`,
      [date],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          let dailyTotalAmount = 0;
          let grossAmount = 0;
          let taxAmount = 0;
          const receipts = rows.map((row:any) => {
            dailyTotalAmount += row.daily_total_amount;
            grossAmount += row.gross_amount;
            taxAmount += row.tax_amount;
            return row;
          });

          // Construct the report payload
          const reportPayload =
            `<ZREPORT>` +
            `<DATE>${date}</DATE>` +
            `<TIME>${time}</TIME>` +
            `<HEADER>` +
            `<LINE>ADVATECH OFFICE SUPPLIES LIMITED </LINE>` +
            `<LINE>LIBYA PLOT NO. 815/8221</LINE>` +
            `<LINE>MOBILE +255 658 956 525</LINE>` +
            `<LINE>DAR ES SALAAM,TANZANIA</LINE>` +
            `</HEADER>` +
            `<VRN>40005334W</VRN>` +
            `<TIN>109272930</TIN>` +
            `<TAXOFFICE>Tax Office Ilala</TAXOFFICE>` +
            `<REGID>TZ0100559122</REGID>` +
            `<ZNUMBER>${new Date().toISOString().split('T')[0].replace(/-/g, '')}</ZNUMBER>` +
            `<EFDSERIAL>10TZ101167</EFDSERIAL>` +
            `<REGISTRATIONDATE>2024-06-29</REGISTRATIONDATE>` +
            `<USER>ADVATECH OFFICE SUPPLIES LIMITED</USER>` +
            `<SIMIMSI>WEBAPI</SIMIMSI>` +
            `<TOTALS>` +
            `<DAILYTOTALAMOUNT>${dailyTotalAmount.toFixed(2)}</DAILYTOTALAMOUNT>` +
            `<GROSS>${grossAmount.toFixed(2)}</GROSS>` +
            `<CORRECTIONS>0</CORRECTIONS>` +
            `<DISCOUNTS>0</DISCOUNTS>` +
            `<SURCHARGES>0</SURCHARGES>` +
            `<TICKETSVOID>0</TICKETSVOID>` +
            `<TICKETSVOIDTOTAL>0</TICKETSVOIDTOTAL>` +
            `<TICKETSFISCAL>${receipts.length}</TICKETSFISCAL>` +
            `<TICKETSNONFISCAL>0</TICKETSNONFISCAL>` +
            `</TOTALS>` +
            `<VATTOTALS>` +
            `<VATRATE>A-18</VATRATE>` +
            `<NETTAMOUNT>0</NETTAMOUNT>` +
            `<TAXAMOUNT>${taxAmount.toFixed(2)}</TAXAMOUNT>` +
            `<!-- Add more VAT rates as needed -->` +
            `</VATTOTALS>` +
            `<PAYMENTS>` +
            `<PMTTYPE>CASH</PMTTYPE>` +
            `<PMTAMOUNT>0</PMTAMOUNT>` +
            `<PMTTYPE>CCARD</PMTTYPE>` +
            `<PMTAMOUNT>0</PMTAMOUNT>` +
            `<PMTTYPE>EMONEY</PMTTYPE>` +
            `<PMTAMOUNT>0</PMTAMOUNT>` +
            `<PMTTYPE>INVOICE</PMTTYPE>` +
            `<PMTAMOUNT>0</PMTAMOUNT>` +
            `</PAYMENTS>` +
            `<CHANGES>` +
            `<VATCHANGENUM>0</VATCHANGENUM>` +
            `<HEADCHANGENUM>0</HEADCHANGENUM>` +
            `</CHANGES>` +
            `<ERRORS></ERRORS>` +
            `<FWVERSION>3.0</FWVERSION>` +
            `<FWCHECKSUM>WEBAPI</FWCHECKSUM>` +
            `</ZREPORT>`;

          resolve(reportPayload);
        }
      }
    );
  });
}

// Function to send the report
async function sendReport() {
  const currentDate = new Date();
  const date = currentDate.toISOString().split('T')[0];
  const time = currentDate.toTimeString().split(' ')[0];

  try {
    const reportPayload = await generateReportPayload(date, time);
    const { privateKey, serialNumber } = await getPrivateKeyAndSerialNumber();
    const accessToken = await fetchTokenFromDatabase();
    const reportSignature = await encryptAndSignData(reportPayload, privateKey);

    const signedReport = `<?xml version="1.0" encoding="UTF-8"?>
<EFDMS>
  ${reportPayload}
  <EFDMSSIGNATURE>${reportSignature}</EFDMSSIGNATURE>
</EFDMS>`;

    const headers = {
      'Content-Type': 'application/xml',
      'Routing-Key': 'vfdzreport',
      'Cert-Serial': Buffer.from(serialNumber).toString('base64'),
      'Client': 'webapi',
      'Authorization': `Bearer ${accessToken}`,
    };

    const response = await axios.post('https://vfdtest.tra.go.tz/api/efdmszreport', signedReport, { headers });

    // Mark all sent receipts as sent
    db.run(
      `UPDATE receipt SET sent = TRUE WHERE rct_date = ?`,
      [date],
      (err) => {
        if (err) {
          console.error('Error updating receipts as sent:', err);
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending report:', error);
    throw new Error('Report sending failed');
  }
}

// Function to handle unsent receipts on application startup
async function handleUnsentReceipts() {
  const currentDate = new Date();
  const date = currentDate.toISOString().split('T')[0];

  try {
    // Send unsent receipts from previous days
    const reportPayload = await generateReportPayload(date, new Date().toTimeString().split(' ')[0]);
    if (reportPayload.includes('<ZREPORT>')) {
      await sendReport();
    }
  } catch (error) {
    console.error('Error handling unsent receipts:', error);
  }
}

// Function to schedule and send the report daily
function scheduleReport() {
  const now = new Date();
  let timeUntilReport = new Date(now.setHours(23, 50, 0, 0)).getTime() - Date.now();

  if (timeUntilReport < 0) {
    timeUntilReport += 24 * 60 * 60 * 1000; // Add one day if the time is in the past
  }
  setTimeout(async () => {
    try {
      // Send the report
      await sendReport();
    } catch (error) {
      console.error('Error in scheduled report:', error);
    }

    // Schedule the next report
    scheduleReport();
  }, timeUntilReport);
}

// Initialize application
async function initialize() {
  await handleUnsentReceipts(); // Handle unsent receipts on startup
  scheduleReport(); // Schedule daily report
}

// Initialize application on startup
initialize();

// IPC handler for manual report sending
ipcMain.handle('send-report', async () => {
  try {
    const response = await sendReport();
    console.log('Report response: ' + response);
    return response;
  } catch (error) {
    console.error('Error in sending report:', error);
    throw error;
  }
});
function fetchTokenFromDatabase() {
  throw new Error('Function not implemented.');
}

function getPrivateKeyAndSerialNumber(): { privateKey: any; serialNumber: any; } | PromiseLike<{ privateKey: any; serialNumber: any; }> {
  throw new Error('Function not implemented.');
}

function encryptAndSignData(reportPayload: string, privateKey: any) {
  throw new Error('Function not implemented.');
}

