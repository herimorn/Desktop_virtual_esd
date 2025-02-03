import axios from 'axios';
import forge from 'node-forge';

export const registerToTRA = async (tin: string, certKey: string, serialNumber: string, privateKeyPem: string) => {
  try {
    const payloadData = `<REGDATA><TIN>${tin}</TIN><CERTKEY>${certKey}</CERTKEY></REGDATA>`;

    // Convert privateKey from PEM format to forge private key
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem) as forge.pki.rsa.PrivateKey;
    const payloadDataSignature = signData(payloadData, privateKey);

    const signedMessageRegistration = `<?xml version="1.0" encoding="UTF-8"?>
<EFDMS>
  ${payloadData}
  <EFDMSSIGNATURE>${payloadDataSignature}</EFDMSSIGNATURE>
</EFDMS>`;

    // Capitalize and encode the serial number in base64
    const capitalizedSerialNumber = serialNumber.toUpperCase();
    const base64SerialNumber = Buffer.from(capitalizedSerialNumber).toString('base64');

    const headers = {
      'Content-Type': 'application/xml',
      'Cert-Serial': base64SerialNumber,
      'Client': 'webapi'
    };

    //console.log(headers);

    const response = await axios.post('https://vfdtest.tra.go.tz/api/vfdregreq', signedMessageRegistration, { headers });
    return response.data;
  } catch (error:any) {
    console.error('Error during registration:', error.message);
    throw error;
  }
};

// Helper function to sign data
const signData = (data: string, privateKey: forge.pki.rsa.PrivateKey): string => {
  const md = forge.md.sha1.create(); // SHA1 hash
  md.update(data, 'utf8');
  const signature = privateKey.sign(md); // RSA signing
  return forge.util.encode64(signature);
};
