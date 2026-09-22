const fs = require('fs');

const adminJsPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let adminJsContent = fs.readFileSync(adminJsPath, 'utf8');

// --- UPDATE User Status Route ---
// It currently has `if (status === 'Suspended') { ... }`
// We need to add `else if (status === 'Active') { ... }`

const oldUserActiveBlock = `res.json(result.rows[0]);`;

const newUserActiveBlock = `if (status === 'Active') {
      const userEmail = result.rows[0].email;
      const userName = result.rows[0].name;
      const subject = 'Your AI Job Portal Account Has Been Reactivated';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const html = \`
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hello \${userName},</p>
          <p>Your account has been reviewed and reinstated by an administrator. You can now log in and access all platform features.</p>
          <div style="margin: 30px 0;">
            <a href="\${frontendUrl}/login" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to Your Account</a>
          </div>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            If you have any questions, please reply directly to this email or contact support.
          </p>
        </div>
      \`;

      if (process.env.SMTP_USER) {
        const transporter = getTransporter();
        transporter.sendMail({
          from: \`"AI Job Portal Admin" <\${process.env.SMTP_USER}>\`,
          to: userEmail,
          replyTo: process.env.SMTP_USER,
          subject,
          html
        }).catch(err => console.error('Failed to send activation email:', err));
      } else {
        console.log('--- MOCK EMAIL (User Activation) ---');
        console.log('To:', userEmail);
        console.log('Subject:', subject);
      }
    }

    res.json(result.rows[0]);`;

// Need to match exactly the end of the PATCH user route
// Wait, replacing `res.json(result.rows[0]);` globally will hit multiple places.
// I'll use regex to target the user route specifically.

const userRouteRegex = /(await logActivity\(pool, req.user, 'User Status Changes', `Changed user status for '\$\{result\.rows\[0\]\.name\}' to \$\{status\}`, 'Users'\);\s+)(if \(status === 'Suspended'\) \{[\s\S]*?\})(\s+res\.json\(result\.rows\[0\]\);)/;

adminJsContent = adminJsContent.replace(userRouteRegex, (match, logActivityCode, suspendedBlock, responseBlock) => {
  return logActivityCode + suspendedBlock + `
    else if (status === 'Active') {
      const userEmail = result.rows[0].email;
      const userName = result.rows[0].name;
      const subject = 'Your AI Job Portal Account Has Been Reactivated';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const html = \`
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hello \${userName},</p>
          <p>Your account has been reviewed and reinstated by an administrator. You can now log in and access all platform features.</p>
          <div style="margin: 30px 0;">
            <a href="\${frontendUrl}/login" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to Your Account</a>
          </div>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            If you have any questions, please reply directly to this email or contact support.
          </p>
        </div>
      \`;

      if (process.env.SMTP_USER) {
        const transporter = getTransporter();
        transporter.sendMail({
          from: \\\`"AI Job Portal Admin" <\${process.env.SMTP_USER}>\\\`,
          to: userEmail,
          replyTo: process.env.SMTP_USER,
          subject,
          html
        }).catch(err => console.error('Failed to send activation email:', err));
      } else {
        console.log('--- MOCK EMAIL (User Activation) ---');
        console.log('To:', userEmail);
        console.log('Subject:', subject);
      }
    }` + responseBlock;
});


// --- UPDATE Job Status Route ---
const jobRouteRegex = /(await logActivity\(pool, req.user, 'Job Status Changes', `Changed job status for '\$\{result\.rows\[0\]\.title\}' to \$\{status\}`, 'Jobs'\);\s+const job = result\.rows\[0\];\s+)(if \(status === 'Suspended'\) \{[\s\S]*?\})(\s+res\.json\(job\);)/;

adminJsContent = adminJsContent.replace(jobRouteRegex, (match, logActivityCode, suspendedBlock, responseBlock) => {
  return logActivityCode + suspendedBlock + `
    else if (status === 'Active') {
      try {
        const userRes = await pool.query('SELECT email, name FROM users WHERE id = $1', [job.recruiter_id]);
        if (userRes.rows.length > 0) {
          const employerEmail = userRes.rows[0].email;
          const subject = \`Your Job Listing Is Now Active - \${job.title}\`;
          const html = \`
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <p>Hello \${userRes.rows[0].name},</p>
              <p>Your job post '\${job.title}' has been reviewed and reactivated. It is once again visible to job seekers, and candidate applications are re-enabled.</p>
              <p style="margin-top: 20px; font-size: 14px; color: #666;">
                If you have any questions, please reply directly to this email or contact support.
              </p>
            </div>
          \`;

          if (process.env.SMTP_USER) {
            const transporter = getTransporter();
            transporter.sendMail({
              from: \\\`"AI Job Portal Admin" <\${process.env.SMTP_USER}>\\\`,
              to: employerEmail,
              replyTo: process.env.SMTP_USER,
              subject,
              html
            }).catch(err => console.error('Failed to send job activation email:', err));
          } else {
            console.log('--- MOCK EMAIL (Job Activation) ---');
            console.log('To:', employerEmail);
            console.log('Subject:', subject);
          }
        }
      } catch (emailErr) {
        console.error('Error fetching user for job activation email:', emailErr);
      }
    }` + responseBlock;
});

fs.writeFileSync(adminJsPath, adminJsContent);
console.log("Updated admin.js with reactivation mailers");
