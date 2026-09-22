const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\server.js';
let content = fs.readFileSync(path, 'utf8');

// We need to move the /api/system/settings and /api/health blocks UP.

const systemBlock = `// Public System Settings
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
});`;

content = content.replace(systemBlock, '');

// Insert it before app.use('/api/auth', ...)
content = content.replace(
  "// Setup Routes",
  "// Setup Routes\n" + systemBlock
);

fs.writeFileSync(path, content);
console.log('Moved public routes to top of server.js');
