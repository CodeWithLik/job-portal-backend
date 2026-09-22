require('dotenv').config();
const { pool } = require('../src/db/db');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error("Please provide an email address: npm run admin:export user@email.com");
  process.exit(1);
}

async function exportData() {
  try {
    console.log(`Starting data export for: ${targetEmail}`);
    
    // 1. Find User
    const userResult = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE email = $1', [targetEmail]);
    if (userResult.rows.length === 0) {
      console.log('User not found.');
      process.exit(0);
    }
    const user = userResult.rows[0];
    const exportData = { user };

    // 2. Get Role-Specific Data
    if (user.role === 'seeker') {
      const profile = await pool.query('SELECT * FROM seeker_profiles WHERE user_id = $1', [user.id]);
      exportData.profile = profile.rows[0] || {};
      
      const apps = await pool.query('SELECT * FROM applications WHERE seeker_id = $1', [user.id]);
      exportData.applications = apps.rows;
    } else if (user.role === 'recruiter') {
      const profile = await pool.query('SELECT * FROM recruiter_profiles WHERE user_id = $1', [user.id]);
      exportData.profile = profile.rows[0] || {};
      
      const jobs = await pool.query('SELECT * FROM jobs WHERE recruiter_id = $1', [user.id]);
      exportData.jobs = jobs.rows;
    }

    // 3. Save to JSON file
    const fileName = `${user.name.replace(/\\s+/g, '_')}_data_export.json`;
    const filePath = path.join(__dirname, '..', fileName);
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    console.log(`Data exported successfully to: ${fileName}`);

    // 4. Send Email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"AI Job Portal Privacy Team" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Your Personal Data Export Request',
      text: 'Hello,\n\nPer your Privacy Rights request, attached is a complete export of your personal data.\n\nSincerely,\nAI Job Portal Privacy Team',
      attachments: [
        {
          filename: fileName,
          path: filePath
        }
      ]
    });

    console.log(`Email successfully sent to ${user.email} with the JSON attachment!`);
    
    // Clean up file after sending
    fs.unlinkSync(filePath);
    process.exit(0);
    
  } catch (error) {
    console.error("Export failed:", error);
    process.exit(1);
  }
}

exportData();
