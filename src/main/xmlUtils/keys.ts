import crypto from "crypto";
import fs from "fs";

const privateKeyPath = "./Downloads/privateKey.pem";

const signMessage = async (messageToSign: string): Promise<string> => {
  try {
    // Load private key
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");

    // Remove newlines and extra spaces
    messageToSign = messageToSign.replace(/>\s+</g, "><").trim();

    // Create SHA-1 hash and sign with RSA
    const sign = crypto.createSign("RSA-SHA1");
    sign.update(messageToSign);
    sign.end();

    // Sign the message with the private key and return as base64 string
    const signature = sign.sign(privateKey, "base64");
    return signature;
  } catch (error) {
    console.error("Error signing XML:", error);
    throw error;
  }
};

export default signMessage;
