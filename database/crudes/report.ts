import axios from 'axios';
import crypto from 'crypto';
import {connectToDatabase } from '../../src/main/database';
import { ipcMain } from 'electron';
import xml2js from 'xml2js';
import { DOMParser } from 'xmldom';

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

// fetch report

export function getAllTRAData(): Promise<{
  certKey: any;
  street: string;
  user: string;
  mobile: string;
  vrn: string;
  tax_office: string;
  tin: string;
  registrationDate: string;
  regId: string;
  certkey: string;
  city: string;
}[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT user, vrn, tin, tax_office, mobile, street, city, registrationDate, regId,certkey FROM TRA LIMIT 1`, (err, rows) => {
      if (err) {
        reject(new Error(`Error fetching TRA data: ${err.message}`));
      } else {
        resolve(rows);
      }
    });
  });
}





async function generateReportPayload(date: string, time: string) {
  const TRAData = await getAllTRAData();
  if (!TRAData.length) {
    throw new Error('No TRA data available.');
  }

  const TRAInfo = TRAData[0];
  console.log("the tra info is",TRAInfo);
  const now = new Date();
  const currentZnum = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  return new Promise<{ payload: string; dailyTotalAmount: number; grossAmount: number; taxAmount: number; receiptIds: number[] }>((resolve, reject) => {
    db.all(`SELECT * FROM receipt_que WHERE znum = ? AND status = 'success'`, [currentZnum], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        let dailyTotalAmount = 0;
        let grossAmount = 0;
        let taxAmount = 0;
        const receiptIds = [];
        const vatTotals = {}; // To store VAT rate summaries

        if (rows.length === 0) {
          // No receipts for today, generate zero payload report

         const ReportPayload =
            `<ZREPORT>` +
            `<DATE>${date}</DATE>` +
            `<TIME>${time}</TIME>` +
            `<HEADER>` +
            `<LINE>${TRAInfo.user} </LINE>` +
            `<LINE>${TRAInfo.street}</LINE>` +
            `<LINE>MOBILE ${TRAInfo.tax_office}</LINE>` +
            `<LINE>${TRAInfo.certKey},TANZANIA</LINE>` +
            `</HEADER>` +
            `<VRN>${TRAInfo.mobile}</VRN>` +
            `<TIN>${TRAInfo.tin}</TIN>` +
            `<TAXOFFICE>${TRAInfo.tax_office}</TAXOFFICE>` +
            `<REGID>${TRAInfo.regId}</REGID>` +
            `<ZNUMBER>${new Date().toISOString().split('T')[0].replace(/-/g, '')}</ZNUMBER>` +
            `<EFDSERIAL>${TRAInfo.certKey}</EFDSERIAL>` +
            `<REGISTRATIONDATE>${TRAInfo.registrationDate}</REGISTRATIONDATE>` +
            `<USER>${TRAInfo.user}</USER>` +
            `<SIMIMSI>WEBAPI</SIMIMSI>` +
            `<TOTALS>` +
            `<DAILYTOTALAMOUNT>0</DAILYTOTALAMOUNT>` +
            `<GROSS>0</GROSS>` +
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
            `<TAXAMOUNT>0</TAXAMOUNT>` +
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

// console.log("the payload of the report is",ReportPayload)
          resolve({ payload: ReportPayload, dailyTotalAmount: 0, grossAmount: 0, taxAmount: 0, receiptIds: [] });
        } else {
          rows.forEach((row) => {
            const receiptXML = row.receipt; // Assume receipt XML is stored in `receipt` field
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(receiptXML, 'text/xml');

            // Extract VAT totals from the receipt XML
            const vatRateNodes = xmlDoc.getElementsByTagName('VATRATE');
            const netAmountNodes = xmlDoc.getElementsByTagName('NETTAMOUNT');
            const taxAmountNodes = xmlDoc.getElementsByTagName('TAXAMOUNT');

            for (let i = 0; i < vatRateNodes.length; i++) {
              const vatRate = vatRateNodes[i].textContent || 'UNKNOWN';
              const netAmount = parseFloat(netAmountNodes[i].textContent || '0');
              const taxAmt = parseFloat(taxAmountNodes[i].textContent || '0');

              if (!vatTotals[vatRate]) {
                vatTotals[vatRate] = { netAmount: 0, taxAmount: 0 };
              }
              vatTotals[vatRate].netAmount += netAmount;
              vatTotals[vatRate].taxAmount += taxAmt;
            }

            dailyTotalAmount += row.totalTaxIncl;
            grossAmount += row.totalTaxExcl;
            taxAmount += row.totalTax;
            receiptIds.push(row.id);
          });

          let vatTotalsXML = '';
          Object.keys(vatTotals).forEach((vatRate) => {
            vatTotalsXML +=
              `<VATRATE>${vatRate}</VATRATE>` +
              `<NETTAMOUNT>${vatTotals[vatRate].netAmount.toFixed(2)}</NETTAMOUNT>` +
              `<TAXAMOUNT>${vatTotals[vatRate].taxAmount.toFixed(2)}</TAXAMOUNT>`;
          });

          const reportPayload =
            `<ZREPORT>` +
            `<DATE>${date}</DATE>` +
            `<TIME>${time}</TIME>` +
            `<HEADER>` +
            `<LINE>${TRAInfo.user} </LINE>` +
            `<LINE>${TRAInfo.street}</LINE>` +
            `<LINE>MOBILE ${TRAInfo.tax_office}</LINE>` +
            `<LINE>${TRAInfo.city},TANZANIA</LINE>` +
            `</HEADER>` +
            `<VRN>${TRAInfo.mobile}</VRN>` +
            `<TIN>${TRAInfo.tin}</TIN>` +
            `<TAXOFFICE>${TRAInfo.user}</TAXOFFICE>` +
            `<REGID>${TRAInfo.regId}</REGID>` +
            `<ZNUMBER>${new Date().toISOString().split('T')[0].replace(/-/g, '')}</ZNUMBER>` +
            `<EFDSERIAL>${TRAInfo.certKey}</EFDSERIAL>` +
            `<REGISTRATIONDATE>${TRAInfo.registrationDate}</REGISTRATIONDATE>` +
            `<USER>${TRAInfo.user}</USER>` +
            `<SIMIMSI>WEBAPI</SIMIMSI>` +
            `<TOTALS>` +
            `<DAILYTOTALAMOUNT>${dailyTotalAmount}</DAILYTOTALAMOUNT>` +
            `<GROSS>${grossAmount}</GROSS>` +
            `<CORRECTIONS>0</CORRECTIONS>` +
            `<DISCOUNTS>0</DISCOUNTS>` +
            `<SURCHARGES>0</SURCHARGES>` +
            `<TICKETSVOID>0</TICKETSVOID>` +
            `<TICKETSVOIDTOTAL>0</TICKETSVOIDTOTAL>` +
            `<TICKETSFISCAL>${rows.length}</TICKETSFISCAL>` +
            `<TICKETSNONFISCAL>0</TICKETSNONFISCAL>` +
            `</TOTALS>` +
            `<VATTOTALS>${vatTotalsXML}</VATTOTALS>` +
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
// console.log("the payload of the report is",reportPayload)
          resolve({ payload: reportPayload, dailyTotalAmount, grossAmount, taxAmount, receiptIds });
        }
      }
    });
  });

}


// Function to store report and link receipts
async function storeReport(date: string, dailyTotalAmount: number, grossAmount: number, taxAmount: number, receiptIds: number[], status: number, reportPayload: string) {
  return new Promise<void>((resolve, reject) => {
    db.run(
      `INSERT INTO report (report_date,report_xml,totalReceipts, totalExclTax, totalInclTax, totalTax, status) VALUES (?, ?, ?, ?, ?, ?,?)`,
      [date,reportPayload,receiptIds.length, grossAmount, dailyTotalAmount, taxAmount, status],
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

async function sendReportForDay(date: string, time: string, znum: string) {
  try {
    console.log('Starting report generation for Z-Number:', znum);

    const { payload: reportPayload, dailyTotalAmount, grossAmount, taxAmount, receiptIds } = await generateReportPayload(date, time, znum);
    console.log('Report payload generated:', reportPayload);

    const { privateKey, serialNumber } = await getPrivateKeyAndSerialNumber();
    console.log('Private key and serial number retrieved');

    const accessToken = await fetchTokenFromDatabase();
    console.log('Access token fetched:', accessToken);

    const reportSignature = await encryptAndSignData(reportPayload, privateKey);
    console.log('Report signed successfully');

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

    console.log('Sending report to the API...');
    const response = await axios.post('https://vfdtest.tra.go.tz/api/efdmszreport', signedReport, { headers });
    console.log('Report sent successfully, response received:', response.data);

    const parser = new xml2js.Parser();
    const responseXml = response.data;
    const result = await parser.parseStringPromise(responseXml);

    const ackCode = result?.EFDMS?.ZACK?.[0]?.ACKCODE?.[0];
    console.log('Acknowledgement code received:', ackCode);

    const status = ackCode === '0' ? 1 : 0;
    await storeReport(date, dailyTotalAmount, grossAmount, taxAmount, receiptIds, status,reportPayload);

    if (status === 1) {
      db.run(
        `UPDATE receipt_que SET status = 'sent' WHERE id IN (${receiptIds.join(',')}) AND znum = ?`,
        [znum],
        (err) => {
          if (err) {
            console.error('Error updating receipts as sent:', err);
          }
        }
      );
    }

    return response.data;
  } catch (error) {
    console.error('Error sending report for Z-Number:', znum, 'Error:', error);
    throw new Error('Failed to send report');
  }
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
    // console.log("the report payload",reportPayload);

    const signedReport = `<?xml version="1.0" encoding="UTF-8"?>
<EFDMS>
  ${reportPayload}
  <EFDMSSIGNATURE>${reportSignature}</EFDMSSIGNATURE>
</EFDMS>`;

    // console.log('Signed report:', signedReport);

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
    // console.log('the updated ackode ', ackCode);

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



export async function handleUnsentReceipts() {
  const now = new Date();

  const TRAData = await getAllTRAData();
  if (!TRAData.length) {
    throw new Error('No TRA data available.');
  }

  const TRAInfo = TRAData[0];
  console.log("the tra info is ",TRAInfo);

  // Query to check for unsent receipts
  db.all(`SELECT DISTINCT znum FROM receipt_que WHERE status = 'success' AND status ='success' ORDER BY znum`, [], async (err, rows) => {
    if (err) {
      console.error('Error fetching unsent receipts:', err);
      return;
    }

    if (rows.length === 0) {
      console.log('No unsent receipts found.');
      return;
    }

    // Loop through each unsent day and send reports for them
    for (const row of rows) {
      const unsentZNum = row.znum;
      const unsentDate = new Date(`${unsentZNum.substring(0, 4)}-${unsentZNum.substring(4, 6)}-${unsentZNum.substring(6, 8)}`);

      const date = unsentDate.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0]; // Use current time

      try {
        console.log(`Sending report for Z-Number (missed day): ${unsentZNum}`);
        await sendReportForDay(date, time, unsentZNum);
      } catch (error) {
        console.error(`Error sending report for Z-Number: ${unsentZNum}`, error);
      }
    }
  });
}


function scheduleReport() {
  const now = new Date();

  // Get current local time in Africa/Dar_es_Salaam timezone in 24-hour format
  const localTime = now.toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam', hour12: false });
  const localDate = new Date(localTime);

  // Set report time to 23:59:59 (one second before midnight)
  // const reportTime = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 23, 59, 59);
 const reportTime = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 2,7, 59);
  let timeUntilReport = reportTime.getTime() - localDate.getTime();

  if (timeUntilReport < 0) {
    // If the report time has passed for today, schedule for tomorrow
    timeUntilReport += 24 * 60 * 60 * 1000;
  }

  setTimeout(async () => {
    try {
      await sendReport();
    } catch (error) {
      console.error('Error in scheduled report:', error);
    }
    scheduleReport();  // Reschedule for the next day
  }, timeUntilReport);
}


// Call the function to start scheduling
// scheduleReport();


// sendReport();

// Graceful shutdown handling
function handleShutdown() {
  process.on('SIGINT', async () => {
    // console.log('Graceful shutdown initiated...');
    await handleUnsentReceipts();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    // console.log('Graceful shutdown initiated...');
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
