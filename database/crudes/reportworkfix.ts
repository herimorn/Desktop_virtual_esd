import axios from 'axios';
import crypto from 'crypto';
import { connectToDatabase } from '../RegistrationTRA';
import { ipcMain } from 'electron';
import xml2js from 'xml2js';

const db = connectToDatabase();

// Function to get private key and serial number
async function getPrivateKeyAndSerialNumber(): Promise<{ privateKey: string; serialNumber: string }> {
  return new Promise((resolve, reject) => {
    db.get('SELECT privateKey, serialNumber FROM pfx LIMIT 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        if (row) {
          resolve({ privateKey: row.privateKey, serialNumber: row.serialNumber });
        } else {
          reject(new Error('Private key or serial number not found'));
        }
      }
    });
  });
}

// Function to encrypt and sign data
async function encryptAndSignData(data: string, privateKey: string): Promise<string> {
  const messageToSign = data.replace(/>\s+</g, "><").trim();
  const sign = crypto.createSign('RSA-SHA1');
  sign.update(messageToSign);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

// Function to fetch access token from the database
async function fetchTokenFromDatabase(): Promise<string> {
  return new Promise((resolve, reject) => {
    db.get('SELECT token FROM token ORDER BY id DESC LIMIT 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row?.token || '');
      }
    });
  });
}

// Function to get all TRA data
export function getAllTRAData(): Promise<{ user: string; mobile: string; vrn: string; tax_office: string; }[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT user, mobile, vrn, tax_office FROM TRA LIMIT 1`, (err, rows) => {
      if (err) {
        console.error('Error fetching all TRA data:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Function to generate report payload
async function generateReportPayload(date: string, time: string): Promise<{ payload: string; dailyTotalAmount: number; grossAmount: number; taxAmount: number; receiptIds: number[] }> {
  try {
    const TRAData = await getAllTRAData();
    const TRAInfo = TRAData[0]; // Assuming there's only one record, adjust if necessary

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(now.getDate()).padStart(2, '0');
    const currentZnum = `${year}${month}${day}`;

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM receipt_que WHERE znum = ? AND status = 'success'`,
        [currentZnum],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            let dailyTotalAmount = 0;
            let grossAmount = 0;
            let taxAmount = 0;
            const receiptIds: number[] = [];

            rows.forEach((row: any) => {
              dailyTotalAmount += row.totalTaxIncl;
              grossAmount += row.totalTaxExcl;
              taxAmount += row.totalTax;
              receiptIds.push(row.id);
            });

            // Construct the report payload
            const reportPayload =
              `<ZREPORT>` +
              `<DATE>${date}</DATE>` +
              `<TIME>${time}</TIME>` +
              `<HEADER>` +
              `<LINE>${TRAInfo.user}</LINE>` +
              `<LINE>${TRAInfo.tax_office}</LINE>` +
              `<LINE>${TRAInfo.mobile}</LINE>` +
              `<LINE>DAR ES SALAAM, TANZANIA</LINE>` +
              `</HEADER>` +
              `<VRN>${TRAInfo.vrn}</VRN>` +
              `<TIN>109272930</TIN>` +
              `<TAXOFFICE>Tax Office Ilala</TAXOFFICE>` +
              `<REGID>${TRAInfo.vrn}</REGID>` +
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
              `<TICKETSFISCAL>${rows.length}</TICKETSFISCAL>` +
              `<TICKETSNONFISCAL>0</TICKETSNONFISCAL>` +
              `</TOTALS>` +
              `<VATTOTALS>` +
              `<VATRATE>A-18</VATRATE>` +
              `<NETTAMOUNT>0</NETTAMOUNT>` +
              `<TAXAMOUNT>${taxAmount.toFixed(2)}</TAXAMOUNT>` +
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

            console.log("The payload of the report is", reportPayload);
            resolve({ payload: reportPayload, dailyTotalAmount, grossAmount, taxAmount, receiptIds });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error generating report payload:', error);
    throw error;
  }
}


// Function to store report and link receipts
async function storeReport(date: string, dailyTotalAmount: number, grossAmount: number, taxAmount: number, receiptIds: number[], status: number) {
  return new Promise<void>((resolve, reject) => {
    db.run(
      `INSERT INTO report (report_date, totalReceipts, totalExclTax, totalInclTax, totalTax, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [date, receiptIds.length, grossAmount, dailyTotalAmount, taxAmount, status],
      function (err) {
        if (err) {
          reject(err);
        } else {
          const reportId = this.lastID;
          const stmt = db.prepare(`INSERT INTO report_receipt (report_id, receipt_id) VALUES (?, ?)`);
          receiptIds.forEach((receiptId) => {
            stmt.run(reportId, receiptId);
          });
          stmt.finalize(resolve);
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
    const { payload: reportPayload, dailyTotalAmount, grossAmount, taxAmount, receiptIds } = await generateReportPayload(date, time);
    const { privateKey, serialNumber } = await getPrivateKeyAndSerialNumber();
    const accessToken = await fetchTokenFromDatabase();
    const reportSignature = await encryptAndSignData(reportPayload, privateKey);
    console.log("the report payload",reportPayload);

    const signedReport = `<?xml version="1.0" encoding="UTF-8"?>
<EFDMS>
  ${reportPayload}
  <EFDMSSIGNATURE>${reportSignature}</EFDMSSIGNATURE>
</EFDMS>`;

    console.log('Signed report:', signedReport);

    const headers = {
      'Content-Type': 'application/xml',
      'Routing-Key': 'vfdzreport',
      'Cert-Serial': Buffer.from(serialNumber).toString('base64'),
      'Client': 'webapi',
      'Authorization': `Bearer ${accessToken}`,
    };

    const response = await axios.post('https://vfdtest.tra.go.tz/api/efdmszreport', signedReport, { headers });
    console.log("the tra response for report is", response);

    const parser = new xml2js.Parser();
    const responseXml = response.data;
    console.log("the tra response xml is", responseXml);
    const result = await parser.parseStringPromise(responseXml);
    console.log('Parsed result:', result);
    const ackCode = result?.EFDMS?.ZACK?.[0]?.ACKCODE?.[0];
    console.log('the updated ackode ', ackCode);

    const status = ackCode === '0' ? 1 : 0;

    await storeReport(date, dailyTotalAmount, grossAmount, taxAmount, receiptIds, status);

    if (status === 1) {
      db.run(
        `UPDATE receipt_que SET status = 'sent' WHERE id IN (${receiptIds.join(',')})`,
        (err) => {
          if (err) {
            console.error('Error updating receipts as sent:', err);
          }
        }
      );
    }

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
    const reportPayload = await generateReportPayload(date, new Date().toTimeString().split(' ')[0]);
    if (reportPayload.payload.includes('<ZREPORT>')) {
      await sendReport();
    }
  } catch (error) {
    console.error('Error handling unsent receipts:', error);
  }
}

// Function to schedule and send the report daily
function scheduleReport() {
  const now = new Date();
  let timeUntilReport = new Date(now.setHours(2,2, 0, 0)) - Date.now();
  if (timeUntilReport < 0) {
    timeUntilReport += 24 * 60 * 60 * 1000; // Add one day if the time is in the past
  }

  setTimeout(async () => {
    try {
      await sendReport();
    } catch (error) {
      console.error('Error in scheduled report:', error);
    }
    scheduleReport();
  }, timeUntilReport);
}

// Graceful shutdown handling
function handleShutdown() {
  process.on('SIGINT', async () => {
    console.log('Graceful shutdown initiated...');
    await handleUnsentReceipts();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Graceful shutdown initiated...');
    await handleUnsentReceipts();
    process.exit(0);
  });
}

// Initialize application
async function initialize() {
  await handleUnsentReceipts();
  scheduleReport();
  handleShutdown();
}

// Initialize application on startup
initialize();

// IPC handler for manual report sending
ipcMain.handle('send-report', async () => {
  try {
    const response = await sendReport();
    return response;
  } catch (error) {
    console.error('Error in sending report:', error);
    throw error;
  }
});
