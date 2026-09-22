const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ai_job_portal',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

pool.query(`
  SELECT column_name, column_default 
  FROM information_schema.columns 
  WHERE table_name = 'users' AND column_name = 'is_verified';
`).then(res => {
  console.log('is_verified default:', res.rows[0] ? res.rows[0].column_default : 'COLUMN NOT FOUND');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
