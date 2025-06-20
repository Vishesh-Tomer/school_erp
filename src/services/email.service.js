const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');
const ejs = require('ejs');
const path = require('path');

const transport = nodemailer.createTransport(config.email.smtp);

if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch((err) => logger.warn(`Unable to connect to email server: ${err.message}`));
}

const sendEmail = async (to, subject, html, retries = 3) => {
  const msg = { from: config.email.from, to, subject, html };
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await transport.sendMail(msg);
      return true;
    } catch (error) {
      logger.error(`Email sending failed (attempt ${attempt}): ${error.message}`);
      if (attempt === retries) {
        throw new Error(`Failed to send email after ${retries} attempts: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
};

const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset Password - School ERP';
  const resetPasswordUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${config.port}`}/reset-password?token=${token}`;
  const html = await ejs.renderFile(path.join(__dirname, '../templates/resetPassword.ejs'), { user: to, resetPasswordUrl });
  await sendEmail(to, subject, html);
};

const sendNewAdminEmail = async (to, password, name) => {
  const subject = 'Welcome to School ERP - Admin Account Created';
  const html = await ejs.renderFile(path.join(__dirname, '../templates/newAdmin.ejs'), { email: to, password, name });
  await sendEmail(to, subject, html);
};

module.exports = {
  sendEmail,
  sendResetPasswordEmail,
  sendNewAdminEmail,
};