import xml2js from "xml2js";
import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';
import qs from 'qs';

dotenv.config();

export const convertXmlToJson = async (xml: string) => {
  const parser = new xml2js.Parser();
  const jsonObj = await parser.parseStringPromise(xml);
  return jsonObj;
};

export const convertJsonToXml = async (json: any) => {
  const builder = new xml2js.Builder();
  const xml = builder.buildObject(json);
  return xml;
};

export const removeXmlDecLine = async (xml: any) => {
  console.log('Input XML:', xml);

  if (typeof xml !== 'string') {
    throw new Error('Input XML is not a string');
  }

  return xml.replace(/<\?xml.*\?>/, "").trim();
};

const getAccessToken = async (): Promise<string> => {
  const tokenUrl = process.env.TOKEN_URL!;
  const username = process.env.DEFAULT_USERNAME!;
  const password = process.env.DEFAULT_PASSWORD!;
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

  try {
    const response: AxiosResponse = await axios.post(tokenUrl, qs.stringify(tokenData), { headers });
    return response.data.access_token;
  } catch (error) {
    throw new Error('Failed to obtain access token');
  }
};

export const sendReceipt = async (url: string, requestData: string, flag: string): Promise<any> => {
  let response: any;
  
  let headers: { [key: string]: string } = {};
  const serial = Buffer.from(process.env.CERT_LIVE_SERIAL!).toString("base64");

  if (flag === "REG") {
    headers = {
      "Content-Type": "application/xml",
      "Cert-Serial": serial,
      "Client": "webapi",
    };
  } else if (flag === "T0") {
    headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
  } else if (flag === "RCT" || flag === "ZREP") {
    const token = await getAccessToken();
    headers = {
      "Content-Type": "application/xml",
      "Routing-Key": flag === "RCT" ? "vfdrct" : "vfdzreport",
      "Cert-Serial": serial,
      "Authorization": `Bearer ${token}`,
    };
    console.log('receipt header is', headers)
  }

  try {
    const res: AxiosResponse = await axios.post(url, requestData, { headers });
    response = res.data;
  } catch (error) {
    response = error;
    console.error("Error while processing request", error);
  }

  return response;
};
