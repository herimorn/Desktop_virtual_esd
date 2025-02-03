<<<<<<< ⌬ Tabnine Instruct <<<<<<<
‌import express, { Request, Response } from 'express';
‌import bodyParser from 'body-parser';
import axios from 'axios';
‌import cors from 'cors';
‌import fs from 'fs';
‌import * as forge from 'node-forge';
import dotenv from 'dotenv';
import qs from 'qs';
‌//Import your custom XML handling functions
‌import { convertXmlToJson, convertJsonToXml, removeXmlDecLine, sendReceipt } from '../src/xmlUtils/xmlUtils'; // Adjust the path as necessary
import { Builder } from 'xml2js';
import signMessage from './keys';
‌import { error } from 'console';
​
​dotenv.config();
​
​// ... rest of the code
>>>>>>> ⌬ Tabnine Instruct >>>>>>>

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(cors());

// Middleware to log the request body
app.use((req, res, next) => {
  console.log('Request Body:', req.body);
  next();
});
//common used methods
// Function to sign data with a private key using SHA1

const signData = (data: string, privateKey: forge.pki.PrivateKey) => {
  const md = forge.md.sha1.create(); // SHA1 hash
  md.update(data, 'utf8');
  const signature = (privateKey as forge.pki.rsa.PrivateKey).sign(md); // RSA signing
  return forge.util.encode64(signature);
};

// Load the PFX file and extract the private key
const loadPrivateKeyFromPFX = (pfxPath: string, passphrase: string): forge.pki.PrivateKey | undefined => {
  try {
    const pfxData = fs.readFileSync(pfxPath, 'binary');
    const p12Asn1 = forge.asn1.fromDer(pfxData);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, passphrase);

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];

    if (keyBags && keyBags.length > 0) {
      const privateKey = keyBags[0].key as forge.pki.PrivateKey;
      const privateKeyPem = forge.pki.privateKeyToPem(privateKey); // Convert private key to PEM format
      console.log('Private Key (PEM):', privateKeyPem); // Log the private key in PEM format
      return privateKey;
    }
  } catch (error) {
    console.error('Error loading private key from PFX:', error);
  }

  return undefined;
};


// Path to the PFX file and passphrase from .env
const pfxPath = process.env.PFX_PATH!;
const passphrase = process.env.PFX_PASSPHRASE!;

const privateKey = loadPrivateKeyFromPFX(pfxPath, passphrase);
console.log("private key is" + privateKey)

if (!privateKey) {
  throw new Error('Failed to load private key from PFX file.');
}

// Fixed certificate serial number
const certSerial = "1B 6B 04 CB 22 D8 CC B3 4A 1B 35 83 EA 94 E5 4B";

// Encode the certificate serial number in base64
const base64SerialNumber = Buffer.from(certSerial).toString('base64');

console.log('Certificate Serial Number (base64):', base64SerialNumber);

let accessToken: string | null = null;
let tokenExpiry: number | null = null;

const getToken = async (username: string, password: string) => {
  const tokenUrl = process.env.TOKEN_URL!;
  const routingKey = process.env.ROUTINGKEY!;
  const regId = process.env.REGID!;
  const receiptCode = process.env.RECEIPTCODE!;

  const tokenData = {
    username,
    password,
    grant_type: 'password',
    routing_key: routingKey,
    reg_id: regId,
    receipt_code: receiptCode
  };

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const response = await axios.post(tokenUrl, qs.stringify(tokenData), { headers });
  accessToken = response.data.access_token;
  tokenExpiry = Date.now() + response.data.expires_in * 1000; // assuming expires_in is in seconds
  return accessToken;
};

// /token route
app.post('/token', async (req: Request, res: Response) => {
  const username = req.body.username || process.env.DEFAULT_USERNAME!;
  const password = req.body.password || process.env.DEFAULT_PASSWORD!;

  try {
    const token = await getToken(username, password);
    console.log('Access Token:', token);  // Log the access token
    res.json({ access_token: token });
  } catch (error) {
    console.error('Error getting token:', error);
    res.status(500).json({ error: 'An error occurred while obtaining the token' });
  }
});

// /api/register route
app.post('/api/register', async (req: Request, res: Response) => {
  const { TIN, certkey } = req.body;

  if (!TIN || !certkey) {
    return res.status(400).json({ message: 'TIN and certkey are required' });
  }

  const payloadData = `<REGDATA><TIN>${TIN}</TIN><CERTKEY>${certkey}</CERTKEY></REGDATA>`;
  console.log('registration payload',payloadData)
  const payloadDataSignature = signData(payloadData, privateKey);

  const signedMessageRegistration = `<?xml version="1.0" encoding="UTF-8"?>
<EFDMS>
  ${payloadData}
  <EFDMSSIGNATURE>${payloadDataSignature}</EFDMSSIGNATURE>
</EFDMS>`;

  const headers = {
    'Content-Type': 'application/xml',
    'Cert-Serial': base64SerialNumber,
    'Client': 'webapi'
  };

  console.log('Request Headers:', headers);
  console.log('Signed XML Payload:', signedMessageRegistration);

  try {
    const response = await axios.post('https://vfdtest.tra.go.tz/api/vfdregreq', signedMessageRegistration, {
      headers
    });

    console.log('Response Data:', response.data);

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error during registration:', error);

    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.toJSON());

      return res.status(500).json({
        message: 'Registration failed',
        error: error.response?.data || error.message || 'An error occurred'
      });
    } else if (error instanceof Error) {
      return res.status(500).json({
        message: 'Registration failed',
        error: error.message || 'An error occurred'
      });
    } else {
      return res.status(500).json({
        message: 'Registration failed',
        error: 'Unknown error occurred'
      });
    }
  }
});

// /api/send-receipt route

app.post('/api/send-receipt', async (req: Request, res: Response) => {

  const receiptData = `
 <RCT>
    <DATE>2024-06-29</DATE>
    <TIME>14:18:34</TIME>
    <TIN>109272930</TIN>
    <REGID>TZ0100559122</REGID>
    <EFDSERIAL>10TZ101167</EFDSERIAL>
    <CUSTIDTYPE>1</CUSTIDTYPE>
    <CUSTID>111222333</CUSTID>
    <CUSTNAME>Juma john</CUSTNAME>
    <MOBILENUM>255658956525</MOBILENUM>
    <RCTNUM>724</RCTNUM>
    <DC>1</DC>
    <GC>724</GC>
    <ZNUM>20240629</ZNUM>
    <RCTVNUM>317B481</RCTVNUM>
    <ITEMS>
        <ITEM>
            <ID>1</ID>
            <DESC>Payment to cement bags</DESC>
            <QTY>1</QTY>
            <TAXCODE>1</TAXCODE>
            <AMT>500</AMT>
        </ITEM>
    </ITEMS>
    <TOTALS>
        <TOTALTAXEXCL>18.90</TOTALTAXEXCL>
        <TOTALTAXINCL>17</TOTALTAXINCL>
        <DISCOUNT>2.00</DISCOUNT>
    </TOTALS>
    <PAYMENTS>
        <PMTTYPE>EMONEY</PMTTYPE>
        <PMTAMOUNT>700</PMTAMOUNT>
    </PAYMENTS>
    <VATTOTALS>
        <VATRATE>A</VATRATE>
        <NETTAMOUNT>18.90</NETTAMOUNT>
        <TAXAMOUNT>2.78</TAXAMOUNT>
    </VATTOTALS>
</RCT>`
const receiptJsonObject = await convertXmlToJson(receiptData);
   // Remove XML declaration line
   const cleanedXml = await removeXmlDecLine(receiptData);

   console.log('Cleaned receipt XML payload:', cleanedXml);


  if (!accessToken || (tokenExpiry && Date.now() >= tokenExpiry)) {
    return res.status(401).json({ message: 'Access token is missing or expired. Please obtain a new token.' });
  }

  const payloadDataSignature = await signMessage(cleanedXml);
  if(payloadDataSignature){
    receiptJsonObject.EFDMSSIGNATURE = payloadDataSignature;

    const builder = new Builder();
    const fullRequest = builder.buildObject({ EFDMS: receiptJsonObject });
    console.log("the receipt payload is " , fullRequest)
    const response = await sendReceipt(
      "https://vfdtest.tra.go.tz/api/efdmsrctinfo",
      fullRequest,
      "RCT"
    );
    if (response) {
      console.log("receipt response is "+ response)
      res.type("application/xml").send(response);
    } else {
      res.status(500).send("Failed to get response");
    }

  }



//   console.log("The json  signature is: " + payloadDataSignature);

//   const signedReceipt = `<?xml version="1.0" encoding="UTF-8"?>
// <EFDMS>
//   ${receiptData}
//   <EFDMSSIGNATURE>${payloadDataSignature}]</EFDMSSIGNATURE>
// </EFDMS>`;

//   const headers = {
//     'Content-Type': 'application/xml',
//     'Routing-Key': process.env.ROUTINGKEY!,
//     'Cert-Serial': base64SerialNumber,
//     'Client': 'webapi',
//     'Authorization': `Bearer ${accessToken}`
//   };

//   console.log('Request Headers:', headers);
//   console.log('Signed Receipt Payload:', signedReceipt);

//   try {
//     const response = await axios.post('https://vfdtest.tra.go.tz/api/efdmsrctinfo ', signedReceipt, {
//       headers
//     });

//     console.log('Response Data:', response.data);

//     return res.status(200).json(response.data);
//   } catch (error: any) {
//     console.error('Error sending receipt:', error);

//     if (axios.isAxiosError(error)) {
//       console.error('Axios error details:', error.toJSON());

//       return res.status(500).json({
//         message: 'Receipt sending failed',
//         error: error.response?.data || error.message || 'An error occurred'
//       });
//     } else if (error instanceof Error) {
//       return res.status(500).json({
//         message: 'Receipt sending failed',
//         error: error.message || 'An error occurred'
//       });
//     } else {
//       return res.status(500).json({
//         message: 'Receipt sending failed',
//         error: 'Unknown error occurred'
//       });
//     }
//   }
});


///
// /api/send-report route

app.post('/api/send-report', async (req: Request, res: Response) => {
  const reportPayload = `<ZREPORT>
    <DATE>2024-06-28</DATE>
    <TIME>15:39:09</TIME>
    <HEADER>
        <LINE>TEST TAXPAYER</LINE>
        <LINE>PLOT:125/126/127,MAGOMENI STREET</LINE>
        <LINE>TEL NO:+255 999999</LINE>
        <LINE>DAR ES SALAAM,TANZANIA</LINE>
    </HEADER>
    <VRN>40005334W</VRN>
    <TIN>109272930</TIN>
    <TAXOFFICE>Tax Office Ilala</TAXOFFICE>
    <REGID>TZ0100559122</REGID>
    <ZNUMBER>20240629</ZNUMBER>
    <EFDSERIAL>10TZ101167</EFDSERIAL>
    <REGISTRATIONDATE>2019-08-15</REGISTRATIONDATE>
    <USER>09VFDWEBAPI-10131758710927293010TZ101167</USER>
    <SIMIMSI>WEBAPI</SIMIMSI>
    <TOTALS>
        <DAILYTOTALAMOUNT>2143250.00</DAILYTOTALAMOUNT>
        <GROSS>513880841.00</GROSS>
        <CORRECTIONS>0.00</CORRECTIONS>
        <DISCOUNTS>0.00</DISCOUNTS>
        <SURCHARGES>0.00</SURCHARGES>
        <TICKETSVOID>0</TICKETSVOID>
        <TICKETSVOIDTOTAL>0.00</TICKETSVOIDTOTAL>
        <TICKETSFISCAL>36</TICKETSFISCAL>
        <TICKETSNONFISCAL>6</TICKETSNONFISCAL>
    </TOTALS>
    <VATTOTALS>
        <VATRATE>A-18.00</VATRATE>
        <NETTAMOUNT>1816313.55</NETTAMOUNT>
        <TAXAMOUNT>326936.45</TAXAMOUNT>
    </VATTOTALS>
    <PAYMENTS>
         <PMTTYPE>CASH</PMTTYPE>
          <PMTAMOUNT>0.00</PMTAMOUNT>
          <PMTTYPE>CREDIT</PMTTYPE>
          <PMTAMOUNT>0.00</PMTAMOUNT>
          <PMTTYPE>CHEQUE</PMTTYPE>
          <PMTAMOUNT>0.00</PMTAMOUNT>
          <PMTTYPE>VOUCHER</PMTTYPE>
          <PMTAMOUNT>0.00</PMTAMOUNT>
          <PMTTYPE>EMONEY</PMTTYPE>
          <PMTAMOUNT>0.00</PMTAMOUNT>
    </PAYMENTS>
    <CHANGES>
        <VATCHANGENUM>0</VATCHANGENUM>
        <HEADCHANGENUM>0</HEADCHANGENUM>
    </CHANGES>
      <ERRORS/>
    <FWVERSION>3.0</FWVERSION>
    <FWCHECKSUM>WEBAPI</FWCHECKSUM>
</ZREPORT>`;

  try {
    const reportSignature = signData(reportPayload,privateKey);
    console.log("The report signature is: " + reportSignature);

    const signedReport = `<?xml version="1.0" encoding="UTF-8"?>
<EFDMS>
  ${reportPayload}
  <EFDMSSIGNATURE>${reportSignature}</EFDMSSIGNATURE>
</EFDMS>`;

    const headers = {
      'Content-Type': 'application/xml',
      'Routing-Key':"vfdzreport",
      'Cert-Serial': base64SerialNumber,
      'Client': 'webapi',
      'Authorization': `Bearer ${accessToken}`
    };

    console.log('Request Headers:', headers);
    console.log('Signed Report Payload:', signedReport);

    const response = await axios.post('https://vfdtest.tra.go.tz/api/efdmszreport', signedReport, {
      headers
    });

    console.log('Response Data:', response.data);

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error sending report:', error);

    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.toJSON());

      return res.status(500).json({
        message: 'Report sending failed',
        error: error.response?.data || error.message || 'An error occurred'
      });
    } else if (error instanceof Error) {
      return res.status(500).json({
        message: 'Report sending failed',
        error: error.message || 'An error occurred'
      });
    } else {
      return res.status(500).json({
        message: 'Report sending failed',
        error: 'Unknown error occurred'
      });
    }
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
