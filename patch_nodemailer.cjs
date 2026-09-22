const fs = require('fs');
const path = require('path');

const authPath = path.join('C:\\Users\\Henna\\Documents\\backend\\src\\routes', 'auth.js');
let content = fs.readFileSync(authPath, 'utf8');

const oldTransporter = `const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};`;

const newTransporter = `// Fix for IPv6 and local Antivirus/SSL intercept issues
require('dns').setDefaultResultOrder('ipv4first');

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};`;

if (content.includes(oldTransporter)) {
  content = content.replace(oldTransporter, newTransporter);
  fs.writeFileSync(authPath, content);
  console.log("Patched getTransporter to fix Nodemailer issues!");
} else {
  console.log("Could not find the getTransporter block. Trying Regex...");
  const regex = /const getTransporter = \(\) => \{\s*return nodemailer\.createTransport\(\{\s*host: process\.env\.SMTP_HOST,\s*port: process\.env\.SMTP_PORT,\s*secure: true,\s*auth: \{\s*user: process\.env\.SMTP_USER,\s*pass: process\.env\.SMTP_PASS,?\s*\},?\s*\}\);\s*\};/m;
  if (regex.test(content)) {
    content = content.replace(regex, newTransporter);
    fs.writeFileSync(authPath, content);
    console.log("Patched getTransporter using Regex!");
  } else {
    console.log("Still could not find it. Here is what is in the file:");
    const match = content.match(/const getTransporter[\s\S]*?\};/);
    console.log(match ? match[0] : "Not found at all.");
  }
}
