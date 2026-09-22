require('dotenv').config();
const { pool } = require('../src/db/db');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error("Please provide an email address: npm run admin:delete user@email.com");
  process.exit(1);
}

async function deleteUser() {
  const client = await pool.connect();
  try {
    console.log(`Starting account deletion for: ${targetEmail}`);
    
    // 1. Find User
    const userResult = await client.query('SELECT id, name, email, role FROM users WHERE email = $1', [targetEmail]);
    if (userResult.rows.length === 0) {
      console.log('User not found.');
      process.exit(0);
    }
    const user = userResult.rows[0];

    // 2. Delete Uploaded Files (Resume / Logos)
    if (user.role === 'seeker') {
      const profile = await client.query('SELECT resume_url FROM seeker_profiles WHERE user_id = $1', [user.id]);
      if (profile.rows.length > 0 && profile.rows[0].resume_url) {
        const filePath = path.join(__dirname, '..', profile.rows[0].resume_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted user resume file: ${profile.rows[0].resume_url}`);
        }
      }
    }

    // 3. Database Wiping (Transactional)
    await client.query('BEGIN');
    
    // Delete applications and related tables
    if (user.role === 'recruiter') {
      await client.query('DELETE FROM ai_analyses WHERE application_id IN (SELECT id FROM applications WHERE job_id IN (SELECT id FROM jobs WHERE recruiter_id = $1))', [user.id]);
      await client.query('DELETE FROM applications WHERE job_id IN (SELECT id FROM jobs WHERE recruiter_id = $1)', [user.id]);
      await client.query('DELETE FROM saved_jobs WHERE job_id IN (SELECT id FROM jobs WHERE recruiter_id = $1)', [user.id]);
      await client.query('DELETE FROM jobs WHERE recruiter_id = $1', [user.id]);
      await client.query('DELETE FROM recruiter_profiles WHERE user_id = $1', [user.id]);
    } else {
      await client.query('DELETE FROM ai_analyses WHERE application_id IN (SELECT id FROM applications WHERE seeker_id = $1)', [user.id]);
      await client.query('DELETE FROM applications WHERE seeker_id = $1', [user.id]);
      await client.query('DELETE FROM saved_jobs WHERE seeker_id = $1', [user.id]);
      await client.query('DELETE FROM seeker_profiles WHERE user_id = $1', [user.id]);
    }

    await client.query('DELETE FROM activity_logs WHERE user_email = $1', [user.email]);
    await client.query('DELETE FROM users WHERE id = $1', [user.id]);
    
    await client.query('COMMIT');
    console.log(`All database records wiped for ${user.email}.`);

    // 4. Send Confirmation Email
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
      subject: 'Account Deletion Confirmation',
      text: 'Hello,\n\nBased on your request, your account, uploaded resumes, and all associated data have been permanently deleted from our platform.\n\nSincerely,\nAI Job Portal Privacy Team'
    });

    console.log(`Goodbye email successfully sent to ${user.email}.`);
    process.exit(0);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Deletion failed:", error);
    process.exit(1);
  } finally {
    client.release();
  }
}

deleteUser();
