const fs = require('fs');
const path = require('path');

const adminJsPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let adminJsContent = fs.readFileSync(adminJsPath, 'utf8');

// 1. Add nodemailer import if not present
if (!adminJsContent.includes("const nodemailer = require('nodemailer');")) {
  adminJsContent = adminJsContent.replace(
    "const axios = require('axios');",
    "const axios = require('axios');\nconst nodemailer = require('nodemailer');"
  );
}

// 2. Add getTransporter helper if not present
if (!adminJsContent.includes("const getTransporter = () => {")) {
  const getTransporterFunc = `
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};
`;
  // Put it before the first route
  adminJsContent = adminJsContent.replace(
    "// All admin routes require admin role",
    getTransporterFunc + "\n// All admin routes require admin role"
  );
}

// 3. Update User Status Route
const oldUserStatusRoute = `    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, status',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    await logActivity(pool, req.user, 'User Status Changes', \`Changed user status for '\${result.rows[0].name}' to \${status}\`, 'Users');
    
    res.json(result.rows[0]);`;

const newUserStatusRoute = `    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, status',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    await logActivity(pool, req.user, 'User Status Changes', \`Changed user status for '\${result.rows[0].name}' to \${status}\`, 'Users');
    
    if (status === 'Suspended') {
      const userEmail = result.rows[0].email;
      const userName = result.rows[0].name;
      const subject = 'Important: Your AI Job Portal Account Has Been Suspended';
      const html = \`
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hello \${userName},</p>
          <p>We are writing to inform you that your AI Job Portal account has been temporarily suspended.</p>
          <p><strong>Reason provided by administration:</strong></p>
          <blockquote style="border-left: 4px solid #ef4444; padding-left: 15px; margin-left: 0; color: #555; font-style: italic;">
            \${reason || 'Violation of terms or policy.'}
          </blockquote>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            If you believe this action was taken in error, please reply directly to this email or contact support.
          </p>
        </div>
      \`;

      if (process.env.SMTP_USER) {
        const transporter = getTransporter();
        transporter.sendMail({
          from: \`"AI Job Portal Admin" <\${process.env.SMTP_USER}>\`,
          to: userEmail,
          subject,
          html
        }).catch(err => console.error('Failed to send suspension email:', err));
      } else {
        console.log('--- MOCK EMAIL (User Suspension) ---');
        console.log('To:', userEmail);
        console.log('Subject:', subject);
        console.log('Reason:', reason);
        console.log('------------------------------------');
      }
    }

    res.json(result.rows[0]);`;

adminJsContent = adminJsContent.replace(oldUserStatusRoute, newUserStatusRoute);

// 4. Update Job Status Route
const oldJobStatusRoute = `    const result = await pool.query(
      'UPDATE jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    
    await logActivity(pool, req.user, 'Job Status Changes', \`Changed job status for '\${result.rows[0].title}' to \${status}\`, 'Jobs');
    
    res.json(result.rows[0]);`;

const newJobStatusRoute = `    const result = await pool.query(
      'UPDATE jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    
    await logActivity(pool, req.user, 'Job Status Changes', \`Changed job status for '\${result.rows[0].title}' to \${status}\`, 'Jobs');
    
    const job = result.rows[0];
    
    if (status === 'Suspended') {
      try {
        const userRes = await pool.query('SELECT email, name FROM users WHERE id = $1', [job.recruiter_id]);
        if (userRes.rows.length > 0) {
          const employerEmail = userRes.rows[0].email;
          const subject = \`Notice: Your Job Listing Has Been Suspended - \${job.title}\`;
          const html = \`
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <p>Hello \${userRes.rows[0].name},</p>
              <p>We are writing to inform you that your job listing has been suspended and is now hidden from public search. Applications for this listing are currently paused.</p>
              
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0 0 5px 0;"><strong>Job Title:</strong> \${job.title}</p>
                <p style="margin: 0;"><strong>Company:</strong> \${job.company_name}</p>
              </div>

              <p><strong>Reason provided by administration:</strong></p>
              <blockquote style="border-left: 4px solid #ef4444; padding-left: 15px; margin-left: 0; color: #555; font-style: italic;">
                \${reason || 'Violation of terms or policy.'}
              </blockquote>
              
              <p style="margin-top: 20px; font-size: 14px; color: #666;">
                If you believe this action was taken in error or would like to request a review, please reply directly to this email or contact support.
              </p>
            </div>
          \`;

          if (process.env.SMTP_USER) {
            const transporter = getTransporter();
            transporter.sendMail({
              from: \`"AI Job Portal Admin" <\${process.env.SMTP_USER}>\`,
              to: employerEmail,
              subject,
              html
            }).catch(err => console.error('Failed to send job suspension email:', err));
          } else {
            console.log('--- MOCK EMAIL (Job Suspension) ---');
            console.log('To:', employerEmail);
            console.log('Subject:', subject);
            console.log('Reason:', reason);
            console.log('-----------------------------------');
          }
        }
      } catch (emailErr) {
        console.error('Error fetching user for job suspension email:', emailErr);
      }
    }

    res.json(job);`;

adminJsContent = adminJsContent.replace(oldJobStatusRoute, newJobStatusRoute);

fs.writeFileSync(adminJsPath, adminJsContent);
console.log('Updated admin.js with Nodemailer logic!');
