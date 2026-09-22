const jwt = require('jsonwebtoken');
const { pool } = require('./src/db/db');

async function test() {
  const res = await pool.query("SELECT id FROM users WHERE role = 'seeker' LIMIT 1");
  if (res.rows.length === 0) { console.log('No seeker'); process.exit(1); }
  const token = jwt.sign({ id: res.rows[0].id, role: 'seeker' }, process.env.JWT_SECRET || 'super_secret_jwt_key_development_only', { expiresIn: '1h' });
  console.log(token);
  process.exit(0);
}
test();
