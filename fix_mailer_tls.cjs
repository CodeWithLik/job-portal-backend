const fs = require('fs');

const adminJsPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let adminJsContent = fs.readFileSync(adminJsPath, 'utf8');

const oldTransporter = `const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};`;

const newTransporter = `const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};`;

adminJsContent = adminJsContent.replace(oldTransporter, newTransporter);
fs.writeFileSync(adminJsPath, adminJsContent);

console.log('Fixed Nodemailer TLS config in admin.js');
