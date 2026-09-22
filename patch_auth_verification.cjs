const fs = require('fs');
const path = require('path');

const authPath = path.join('C:\\Users\\Henna\\Documents\\backend\\src\\routes', 'auth.js');
let content = fs.readFileSync(authPath, 'utf8');

// 1. Update Register INSERT and logic
const insertUserOld = `
    // Insert user
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, status',
      [name, email, passwordHash, role, status]
    );

    const user = newUser.rows[0];`;

const insertUserNew = `
    // Generate Verification Token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Insert user
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status, verification_token) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, status',
      [name, email, passwordHash, role, status, hashedToken]
    );

    const user = newUser.rows[0];

    // Send Verification Email
    const verifyUrl = \`\${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=\${rawToken}\`;
    if (process.env.SMTP_USER) {
      try {
        const transporter = getTransporter();
        await transporter.sendMail({
          from: \`"AI Job Portal" <\${process.env.SMTP_USER}>\`,
          to: user.email,
          subject: 'Verify your email address',
          html: \`
            <h3>Welcome \${user.name}!</h3>
            <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
            <a href="\${verifyUrl}" style="display:inline-block;padding:10px 15px;background:#2563eb;color:#fff;text-decoration:none;border-radius:5px;">Verify Email</a>
          \`
        });
      } catch (err) {
        console.error('Failed to send verification email:', err);
      }
    } else {
      console.log('--- MOCK VERIFICATION EMAIL ---');
      console.log('To:', user.email);
      console.log('Verify URL:', verifyUrl);
      console.log('-------------------------------');
    }`;

content = content.replace(insertUserOld, insertUserNew);

// 2. Update Login check
const loginCheckOld = `    const user = userRes.rows[0];

    // Check status
    if (user.status === 'Suspended') {`;

const loginCheckNew = `    const user = userRes.rows[0];

    // Check Verification
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please check your email to verify your account first.' });
    }

    // Check status
    if (user.status === 'Suspended') {`;

content = content.replace(loginCheckOld, loginCheckNew);

// 3. Update Google OAuth (mark as verified)
const googleOAuthOld = `      const newUser = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, status',
        [name, email, passwordHash, finalRole, 'Active']
      );`;

const googleOAuthNew = `      const newUser = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, status, is_verified) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id, name, email, role, status',
        [name, email, passwordHash, finalRole, 'Active']
      );`;

content = content.replace(googleOAuthOld, googleOAuthNew);

// 4. Add /verify-email endpoint before Google OAuth Initiation
const newEndpoint = `
// Verify Email
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const userRes = await pool.query('SELECT id FROM users WHERE verification_token = $1', [hashedToken]);
    
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    await pool.query('UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1', [userRes.rows[0].id]);
    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Google OAuth Initiation`;

content = content.replace('// Google OAuth Initiation', newEndpoint);

fs.writeFileSync(authPath, content);
console.log('auth.js updated successfully.');
