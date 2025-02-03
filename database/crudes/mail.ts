import nodemailer from 'nodemailer';
import sqlite3 from 'sqlite3';
import {connectToDatabase } from '../../src/main/database';



const db=connectToDatabase();


const getEmailConfiguration = (): Promise<{ email: string; password: string } | null> => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT email, password FROM email_configuration LIMIT 1`, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
};

export const sendEmail = async (email: string, subject: string, body: string, pdfPath: string) => {
  try {
    const config = await getEmailConfiguration();

    if (!config) {
      throw new Error('Email configuration not found');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email,
        pass: config.password,
      },
    });

    const mailOptions = {
      from: config.email,
      to: email,
      subject: subject,
      text: body,
      attachments: [
        {
          filename: 'invoice.pdf',
          path: pdfPath,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};
