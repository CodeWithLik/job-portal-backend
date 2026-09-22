const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\jobs.js';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `  // POST /api/jobs
  router.post('/', requireRole('recruiter'), async (req, res) => {`;

const replaceStr = `  // POST /api/jobs
  router.post('/', requireRole('recruiter'), async (req, res) => {
    // Strict business logic: Recruiter must have a complete profile
    const profileCheck = await pool.query('SELECT industry, location, company_description FROM recruiter_profiles WHERE user_id = $1', [req.user.id]);
    const profile = profileCheck.rows[0];
    if (!profile || !profile.industry || !profile.location || !profile.company_description) {
      return res.status(403).json({ error: 'You must complete your Company Profile (industry, location, description) before posting jobs.' });
    }`;

content = content.replace(searchStr, replaceStr);
fs.writeFileSync(path, content);
console.log('Successfully patched jobs route backend');
