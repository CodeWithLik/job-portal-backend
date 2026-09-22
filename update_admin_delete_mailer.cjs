const fs = require('fs');

const adminJsPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let adminJsContent = fs.readFileSync(adminJsPath, 'utf8');

// Update User Delete Route
const oldUserDeleteRoute = `// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    await logActivity(pool, req.user, 'User Deletions', \`Deleted user '\${result.rows[0].name}'\`, 'Users');
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});`;

const newUserDeleteRoute = `// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    // Crucial Step: Get email and name BEFORE deleting
    const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const { name: userName, email: userEmail } = userRes.rows[0];

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, name', [id]);
    
    await logActivity(pool, req.user, 'User Deletions', \`Deleted user '\${result.rows[0].name}'\`, 'Users');
    
    // Dispatch Email
    const subject = 'Notice: Your AI Job Portal Account Has Been Deleted';
    const html = \`
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hello \${userName},</p>
        <p>We are writing to inform you that your AI Job Portal account has been permanently deleted by an administrator.</p>
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
        replyTo: process.env.SMTP_USER,
        subject,
        html
      }).catch(err => console.error('Failed to send user deletion email:', err));
    } else {
      console.log('--- MOCK EMAIL (User Deletion) ---');
      console.log('To:', userEmail);
      console.log('Subject:', subject);
      console.log('Reason:', reason);
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});`;

adminJsContent = adminJsContent.replace(oldUserDeleteRoute, newUserDeleteRoute);

// Update Job Delete Route
const oldJobDeleteRoute = `// DELETE /api/admin/jobs/:id
router.delete('/jobs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING id, title', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    
    await logActivity(pool, req.user, 'Job Deletions', \`Deleted job post '\${result.rows[0].title}'\`, 'Jobs');
    
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});`;

const newJobDeleteRoute = `// DELETE /api/admin/jobs/:id
router.delete('/jobs/:id', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    // Crucial step: get job title, company name, and poster's email
    const jobRes = await pool.query(\`
      SELECT j.title, j.company_name, u.email as employer_email, u.name as employer_name
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      WHERE j.id = $1
    \`, [id]);
    
    if (jobRes.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    const { title: jobTitle, company_name: companyName, employer_email: employerEmail, employer_name: employerName } = jobRes.rows[0];

    const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING id, title', [id]);
    
    await logActivity(pool, req.user, 'Job Deletions', \`Deleted job post '\${result.rows[0].title}'\`, 'Jobs');
    
    // Dispatch Email
    const subject = \`Notice: Your Job Listing Has Been Deleted - \${jobTitle}\`;
    const html = \`
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hello \${employerName},</p>
        <p>We are writing to inform you that your job listing has been permanently deleted from the portal.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0 0 5px 0;"><strong>Job Title:</strong> \${jobTitle}</p>
          <p style="margin: 0;"><strong>Company:</strong> \${companyName}</p>
        </div>

        <p><strong>Reason provided by administration:</strong></p>
        <blockquote style="border-left: 4px solid #ef4444; padding-left: 15px; margin-left: 0; color: #555; font-style: italic;">
          \${reason || 'Violation of terms or policy.'}
        </blockquote>
        
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          If you believe this action was taken in error or would like further clarification, please reply directly to this email or contact support.
        </p>
      </div>
    \`;

    if (process.env.SMTP_USER) {
      const transporter = getTransporter();
      transporter.sendMail({
        from: \`"AI Job Portal Admin" <\${process.env.SMTP_USER}>\`,
        to: employerEmail,
        replyTo: process.env.SMTP_USER,
        subject,
        html
      }).catch(err => console.error('Failed to send job deletion email:', err));
    } else {
      console.log('--- MOCK EMAIL (Job Deletion) ---');
      console.log('To:', employerEmail);
      console.log('Subject:', subject);
      console.log('Reason:', reason);
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});`;

adminJsContent = adminJsContent.replace(oldJobDeleteRoute, newJobDeleteRoute);

fs.writeFileSync(adminJsPath, adminJsContent);
console.log('Updated admin.js deletion routes with Nodemailer logic!');
