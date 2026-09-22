const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./src/routes/auth');
const adminSettingsRoutes = require('./src/routes/adminSettings');
const adminRoutes = require('./src/routes/admin');
const jobsRoutes = require('./src/routes/jobs');
const applicationsRoutes = require('./src/routes/applications');
const profileRoutes = require('./src/routes/profile');
const aiRoutes = require('./src/routes/ai');

// Serve uploaded files securely (basic setup)
app.use('/uploads', express.static('uploads'));

// Setup Routes
// Public System Settings
app.get('/api/system/settings', async (req, res) => {
  try {
    const { pool } = require('./src/db/db');
    const result = await pool.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('allow_job_posting', 'allow_job_applications', 'allow_user_registration', 'allow_recruiter_registration')");
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value === 'true';
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public settings' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});
app.use('/api/auth', authRoutes);
app.use('/api/contact', require('./src/routes/contact'));
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/jobs', jobsRoutes); // Notice this covers both /api/jobs and nested seeker routes
app.use('/api/profile', profileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', applicationsRoutes);



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
