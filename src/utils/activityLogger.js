const { pool } = require('../db/db');

async function logActivity(userId, type, action, moduleName) {
  try {
    const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      await pool.query(
        'INSERT INTO activity_logs (type, user_name, user_email, action, module) VALUES ($1, $2, $3, $4, $5)',
        [type, userRes.rows[0].name, userRes.rows[0].email, action, moduleName]
      );
    }
  } catch (err) {
    console.error('Failed to log activity', err);
  }
}

module.exports = { logActivity };
