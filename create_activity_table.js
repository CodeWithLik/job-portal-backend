const { pool } = require('./src/db/db');

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          type VARCHAR(100),
          user_name VARCHAR(255),
          user_email VARCHAR(255),
          action TEXT,
          module VARCHAR(100),
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table created.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
