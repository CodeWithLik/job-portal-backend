require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'jobportal',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function fixLogs() {
  try {
    const res = await pool.query("UPDATE activity_logs SET type = 'Job Status Changes' WHERE type = 'Job Posts' AND (action LIKE 'Closed job%' OR action LIKE 'Reopened job%');");
    console.log('Fixed historical logs:', res.rowCount);
  } catch (err) {
    console.error('Error fixing logs:', err);
  } finally {
    await pool.end();
  }
}

fixLogs();
