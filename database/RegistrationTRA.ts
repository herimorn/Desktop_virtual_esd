import sqlite3, { Database, RunResult, Statement } from 'sqlite3';
import forge from 'node-forge';
import fs from 'fs';
import {connectToDatabase } from '../src/main/database';
import { FaCity } from 'react-icons/fa';

const db=connectToDatabase();
function getPfxFilePath(): string {
  if (process.env.NODE_ENV === 'production') {
    const userDataPath = app.getPath('userData'); // Central location for production
    return path.join(userDataPath, 'temp.pfx');  // PFX stored in userData folder
  } else {
    return path.join(__dirname, 'temp.pfx'); // PFX stored in current directory during development
  }
}

interface PfxData {
  serialNumber: string;
  signature: string;
  privateKey: string;
}

export function extractPfxData(filePath: string, password: string): PfxData | null {
  try {
    console.log(`Extracting PFX data from ${filePath}...`);
    const pfxData = fs.readFileSync(filePath, 'binary');
    const p12Asn1 = forge.asn1.fromDer(pfxData);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const cert = certBags[forge.pki.oids.certBag][0].cert;

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
    const privateKey = forge.pki.privateKeyToPem(keyBags[0].key as forge.pki.PrivateKey);

    return {
      serialNumber: cert.serialNumber,
      signature: forge.util.bytesToHex(cert.signature),
      privateKey: privateKey
    };
  } catch (err: any) {
    console.error('Error extracting PFX data:', err.message);
    return null;
  }
}

export function storePfxData(
  password: string,
  serialNumber: string,
  signature: string,
  privateKey: string,
  callback: (err: Error | null) => void
): void {
  db.get(`SELECT id FROM pfx WHERE serialNumber = ?`, [serialNumber], (err, row) => {
    if (err) {
      console.error('Error checking existing record:', err.message);
      callback(err);
    } else if (row) {
      console.error(`Record with serialNumber ${serialNumber} already exists.`);
      callback(new Error(`Record with serialNumber ${serialNumber} already exists.`));
    } else {
      db.run(
        `INSERT INTO pfx (password, serialNumber, signature, privateKey) VALUES (?, ?, ?, ?)`,
        [password, serialNumber, signature, privateKey],
        function (this: RunResult, err: Error | null) {
          if (err) {
            console.error('Error storing PFX data:', err.message);
          } else {
            console.log('PFX data stored successfully.');
          }
          callback(err);
        }
      );
    }
  });
}

export function getPasswordById(id: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT password FROM pfx WHERE id = ?`, [id], (err, row) => {
      if (err) {
        console.error('Error fetching password:', err.message);
        reject(err);
      } else {
        resolve(row ? row.password : null);
      }
    });
  });
}

export function getSerialNumberById(id: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT serialNumber FROM pfx WHERE id = ?`, [id], (err, row) => {
      if (err) {
        console.error('Error fetching serial number:', err.message);
        reject(err);
      } else {
        resolve(row ? row.serialNumber : null);
      }
    });
  });
}

export function getSignatureById(id: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT signature FROM pfx WHERE id = ?`, [id], (err, row) => {
      if (err) {
        console.error('Error fetching signature:', err.message);
        reject(err);
      } else {
        resolve(row ? row.signature : null);
      }
    });
  });
}

export function getPrivateKeyById(id: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT privateKey FROM pfx WHERE id = ?`, [id], (err, row) => {
      if (err) {
        console.error('Error fetching private key:', err.message);
        reject(err);
      } else {
        resolve(row ? row.privateKey : null);
      }
    });
  });
}

export function insertTRAData(data: { tin: string, certKey: string, regId: string, username: string, password: string, gc: string, receiptCode: string,
  user: string,tax_office: string,mobile: string,vrn: string,street:string,city:string,registrationDate:string,
}): Promise<number> {
  const { tin, certKey, regId, username, password,user,tax_office,mobile,vrn, gc, receiptCode,street,city,registrationDate} = data;
  console.log('mzigo wa data ni',data)
  return new Promise((resolve, reject) => {
    db.get(`SELECT id FROM TRA WHERE tin = ? AND certKey = ?`, [tin, certKey], (err, row) => {
      if (err) {
        console.error('Error checking existing record:', err.message);
        reject(err);
      } else if (row) {
        console.error(`Record with TIN ${tin} and certKey ${certKey} already exists.`);
        reject(new Error(`Record with TIN ${tin} and certKey ${certKey} already exists.`));
      } else {
        const query = `INSERT INTO TRA (tin,user,vrn,tax_office,mobile, certKey, regId, username, password, gc, receiptCode,street,city,registrationDate) VALUES (?, ?, ?, ?,?,?,?, ?, ?, ?,?,?,?,?)`;
        db.run(query, [tin,user,tax_office,mobile,vrn,certKey, regId, username, password, gc, receiptCode,street,city,registrationDate], function (err) {
          if (err) {
            console.error('Error inserting TRA data:', err.message);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
      }
    });
  });
}
export function insertTaxData(taxCodes: { [key: string]: string }): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const checkExists = (codeType: string): Promise<boolean> => {
        return new Promise((res, rej) => {
          const query = `SELECT COUNT(*) AS count FROM Tax WHERE codeType = ?`;
          db.get(query, [codeType], (err, row) => {
            if (err) {
              console.error(`Error checking tax code ${codeType}:`, err.message);
              rej(err);
            } else {
              res(row.count > 0);
            }
          });
        });
      };

      const insertSingleCode = (codeType: string, codeValue: string): Promise<void> => {
        return new Promise<void>((res, rej) => {
          checkExists(codeType)
            .then((exists) => {
              if (exists) {
                // Skip inserting if codeType already exists
                res();
              } else {
                const query = `INSERT INTO Tax (codeType, codeValue) VALUES (?, ?)`;
                db.run(query, [codeType, codeValue], (err) => {
                  if (err) {
                    console.error(`Error inserting tax code ${codeType}:`, err.message);
                    rej(err);
                  } else {
                    res();
                  }
                });
              }
            })
            .catch((err) => rej(err));
        });
      };

      // Add codeE with a value of '0' if it's not already present
      taxCodes['codeE'] = taxCodes['codeE'] || '0';

      // Define the explicit order for tax codes
      const orderedCodes = ['codeA', 'codeB', 'codeC', 'codeD', 'codeE'];

      // Filter and map the taxCodes in the correct order
      for (const codeType of orderedCodes) {
        const codeValue = taxCodes[codeType];
        if (codeValue !== undefined) {
          await insertSingleCode(codeType, codeValue); // Await each insertion to ensure sequential order
        }
      }

      resolve(); // Resolve once all inserts are complete
    } catch (err) {
      reject(err); // Reject if any insertion fails
    }
  });
}

export function fetchTaxCodes(): Promise<{ codeA: string, codeB: string, codeC: string, codeD: string }[]> {
  return new Promise((resolve, reject) => {
    const query = `SELECT codeA, codeB, codeC, codeD FROM Tax`;
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error fetching tax codes:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export function getAllTRAData(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT tin, certKey, username, password FROM TRA`, (err, rows) => {
      if (err) {
        console.error('Error fetching all TRA data:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export function getTRADataById(id: number): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM TRA WHERE id = ?`, [id], (err, row) => {
      if (err) {
        console.error('Error fetching TRA data by id:', err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}




export const runQuery = async (query: string, params: any[] = []) => {
  if (!db) {
    connectToDatabase();
  }
  return db.run(query, params);
};

export const fetchAll = async (query: string, params: any[] = []) => {
  if (!db) {
    connectToDatabase();
  }
  return db.get(query, params);
};

export const fetchOne = async (query: string, params: any[] = []) => {
  if (!db) {
    connectToDatabase();
  }
  return db.get(query, params);
};
