const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Apply admin only middleware
router.use(verifyToken);
router.use(requireRole('admin'));

// GET /api/admin/settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {};
    result.rows.forEach(row => {
      // Parse booleans and numbers where appropriate, or leave as strings for the frontend
      // The frontend uses string representations for most inputs, but for toggles we need booleans.
      let value = row.setting_value;
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      settings[row.setting_key] = value;
    });
    res.json(settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings
router.put('/', async (req, res) => {
  const settings = req.body;
  
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings format' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Process each setting update
    for (const [key, value] of Object.entries(settings)) {
      // Convert booleans to strings for DB
      const dbValue = typeof value === 'boolean' ? value.toString() : value.toString();
      
      await client.query(
        `INSERT INTO system_settings (setting_key, setting_value) 
         VALUES ($1, $2) 
         ON CONFLICT (setting_key) 
         DO UPDATE SET setting_value = EXCLUDED.setting_value`,
        [key, dbValue]
      );
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  } finally {
    client.release();
  }
});

module.exports = router;
