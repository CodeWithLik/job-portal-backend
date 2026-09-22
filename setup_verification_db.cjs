const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    console.log('Adding is_verified and verification_token to users table...');
    
    // Add columns if they don't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
    `);
    
    // Update all existing users so they aren't locked out
    await pool.query(`
      UPDATE users SET is_verified = TRUE WHERE is_verified IS FALSE;
    `);

    console.log('Database updated successfully.');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    pool.end();
  }
}

run();
