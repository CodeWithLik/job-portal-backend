require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

transporter.sendMail({
  from: '"AI Job Portal" <' + process.env.SMTP_USER + '>',
  to: 'likanos1219@gmail.com',
  subject: 'Verify your email address',
  html: '<h3>Test Email</h3><p>If you get this, the backend is working.</p><a href="http://localhost:5173/verify-email?token=123">Link</a>'
}).then(info => {
  console.log('Test email sent:', info.messageId);
}).catch(err => {
  console.error('Test email failed:', err);
});
