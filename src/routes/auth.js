const express = require('express');
require('dns').setDefaultResultOrder('ipv4first'); // Force IPv4 for Nodemailer Gmail connection issues
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/db');
const { verifyToken } = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const validateEmail = (email) => {
  if (/\s/.test(email)) return 'Email must not contain whitespace.';
  if ((email.match(/@/g) || []).length !== 1) return 'Email must contain exactly one @ symbol.';
  if (/\.\./.test(email)) return 'Email must not contain consecutive dots.';
  if (!/^[^@]+@[^@]+\.[a-zA-Z]{2,}$/.test(email)) return 'Email must have a valid local part, domain, and top-level domain (at least 2 letters).';
  return null;
};

const validatePassword = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return null;
};

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role, company_name } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (name.trim().length < 3) {
    return res.status(400).json({ error: 'Please enter a valid full name (minimum 3 characters).' });
  }

  if (role === 'recruiter') {
    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'Company name is required for recruiters.' });
    }
    if (company_name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a valid company name (minimum 2 characters).' });
    }
  }

  const emailError = validateEmail(email);
  if (emailError) return res.status(400).json({ error: emailError });

  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  // Basic check for allowed roles on standard registration
  if (!['seeker', 'recruiter'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role for registration' });
  }

  try {
    // Check if user exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Check system settings to see if registration is allowed for this role
    const settingKey = role === 'seeker' ? 'allow_user_registration' : 'allow_recruiter_registration';
    const settingRes = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = $1', [settingKey]);
    if (settingRes.rows.length > 0 && settingRes.rows[0].setting_value === 'false') {
      return res.status(403).json({ error: `${role} registration is currently disabled` });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Some recruiters might need approval depending on settings
    let status = 'Active';
    if (role === 'recruiter') {
      const approvalSetting = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'require_admin_approval_recruiters'");
      if (approvalSetting.rows.length > 0 && approvalSetting.rows[0].setting_value === 'true') {
        status = 'Pending';
      }
    }

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
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${rawToken}`;
    if (process.env.SMTP_USER) {
      try {
        const transporter = getTransporter();
        await transporter.sendMail({
          from: `"AI Job Portal" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: 'Verify your email address',
          html: `
            <h3>Welcome ${user.name}!</h3>
            <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
            <a href="${verifyUrl}" style="display:inline-block;padding:10px 15px;background:#2563eb;color:#fff;text-decoration:none;border-radius:5px;">Verify Email</a>
          `
        });
      } catch (err) {
        console.error('Failed to send verification email:', err);
      }
    } else {
      console.log('--- MOCK VERIFICATION EMAIL ---');
      console.log('To:', user.email);
      console.log('Verify URL:', verifyUrl);
      console.log('-------------------------------');
    }

    // Create empty profiles
    if (role === 'seeker') {
      await pool.query('INSERT INTO seeker_profiles (user_id) VALUES ($1)', [user.id]);
    } else if (role === 'recruiter') {
      await pool.query('INSERT INTO recruiter_profiles (user_id, company_name) VALUES ($1, $2)', [user.id, company_name || null]);
    }

    // We DO NOT generate or return a JWT here. 
    // The user MUST verify their email and log in manually to get a token.
    res.status(201).json({ user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userRes.rows[0];

    // Check Verification
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please check your email to verify your account first.' });
    }

    // Check status
    if (user.status === 'Suspended') {
      return res.status(403).json({ 
        message: 'Your account has been suspended.',
        adminEmail: 'admin@jobportal.com'
      });
    }
    if (user.status === 'Pending') {
      return res.status(403).json({ error: 'Account pending approval' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'super_secret_jwt_key_development_only',
      { expiresIn: '24h' }
    );

    delete user.password_hash;
    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});


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

// Google OAuth Initiation
router.get('/google', (req, res) => {
  const { role, company_name, redirect } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured in backend/.env' });
  }

  const stateObj = { role, company_name, redirect };
  const stateStr = Buffer.from(JSON.stringify(stateObj)).toString('base64');
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=email%20profile&` +
    `state=${stateStr}`;
    
  res.redirect(authUrl);
});

// Google OAuth Callback
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    return res.redirect(`${frontendUrl}/login?error=oauth_rejected`);
  }

  let stateObj = {};
  if (state) {
    try {
      stateObj = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch (e) {
      console.error('Failed to parse state', e);
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
  const axios = require('axios');

  try {
    // 1. Exchange code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }
    });

    const { access_token } = tokenRes.data;

    // 2. Fetch user profile from Google
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { email, name } = userRes.data;

    // 3. Process user in DB
    let userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (userQuery.rows.length === 0) {
      const finalRole = ['seeker', 'recruiter'].includes(stateObj.role) ? stateObj.role : 'seeker';
      const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
      
      const newUser = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, status, is_verified) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id, name, email, role, status',
        [name, email, passwordHash, finalRole, 'Active']
      );
      user = newUser.rows[0];

      if (finalRole === 'seeker') {
        await pool.query('INSERT INTO seeker_profiles (user_id) VALUES ($1)', [user.id]);
      } else if (finalRole === 'recruiter') {
        await pool.query('INSERT INTO recruiter_profiles (user_id, company_name) VALUES ($1, $2)', [user.id, stateObj.company_name || 'Google Company']);
      }
    } else {
      user = userQuery.rows[0];
      if (user.status === 'Suspended') {
        return res.redirect(`${frontendUrl}/login?error=account_suspended`);
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'super_secret_jwt_key_development_only',
      { expiresIn: '24h' }
    );

    const targetRedirect = stateObj.redirect || `/${user.role}/dashboard`;
    const finalRedirect = targetRedirect.startsWith('/') ? targetRedirect : `/${targetRedirect}`;

    // Redirect to frontend login page which will intercept the token and reload
    res.redirect(`${frontendUrl}/login?token=${token}&redirect=${encodeURIComponent(finalRedirect)}`);

  } catch (err) {
    console.error('Google OAuth callback error:', err.response?.data || err.message);
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
});

// Get current user (me)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userQuery = `
      SELECT u.id, u.name, u.email, u.role, u.status, 
             COALESCE(sp.profile_photo, rp.logo) as avatar,
             rp.company_name
      FROM users u
      LEFT JOIN seeker_profiles sp ON u.id = sp.user_id AND u.role = 'seeker'
      LEFT JOIN recruiter_profiles rp ON u.id = rp.user_id AND u.role = 'recruiter'
      WHERE u.id = $1
    `;
    const userRes = await pool.query(userQuery, [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userRes.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

// Helper for Nodemailer transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // Bypasses corporate MITM proxy SSL issues
    }
  });
};

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const userRes = await pool.query('SELECT id, email, name FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      // Return 200 even if user doesn't exist to prevent email enumeration
      return res.status(200).json({ message: 'If that email is registered, a password reset link has been sent.' });
    }

    const user = userRes.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
      [hashedToken, expires, user.id]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
    
    // Only send email if SMTP is configured, otherwise log it (useful for dev)
    if (process.env.SMTP_USER) {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"AI Job Portal" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h3>Hello ${user.name},</h3>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 15px;background:#2563eb;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
          <p>If you did not request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        `
      });
    } else {
      console.log('--- MOCK EMAIL ---');
      console.log('To:', user.email);
      console.log('Reset URL:', resetUrl);
      console.log('------------------');
    }

    res.status(200).json({ message: 'If that email is registered, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find valid token
    const userRes = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [hashedToken]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    const user = userRes.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear token
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
