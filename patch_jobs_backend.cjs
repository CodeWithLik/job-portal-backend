const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\jobs.js';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `  // POST /api/jobs
  router.post('/', requireRole('recruiter'), async (req, res) => {
    const { title, company, description, location, employment_type, category, salary_min, salary_max, expires_at } = req.body;
    
    if (!title || !company) {
      return res.status(400).json({ error: 'Title and company are required' });
    }`;

const replaceStr = `  // POST /api/jobs
  router.post('/', requireRole('recruiter'), async (req, res) => {
    const { title, company, description, location, employment_type, category, salary_min, salary_max, expires_at } = req.body;
    
    // Strict business logic: Recruiter must have a complete profile
    const profileCheck = await pool.query('SELECT industry, location, company_description FROM recruiter_profiles WHERE user_id = $1', [req.user.id]);
    const profile = profileCheck.rows[0];
    if (!profile || !profile.industry || !profile.location || !profile.company_description) {
      return res.status(403).json({ error: 'You must complete your Company Profile (industry, location, description) before posting jobs.' });
    }

    if (!title || !company) {
      return res.status(400).json({ error: 'Title and company are required' });
    }`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(path, content);
  console.log('Successfully patched jobs route backend');
} else {
  console.log('Could not find search string in jobs.js');
}
