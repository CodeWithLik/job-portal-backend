const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `  // POST /api/admin/users
  router.post('/users', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }`;

const replaceStr = `  // POST /api/admin/users
  router.post('/users', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (name.trim().length < 3) {
      return res.status(400).json({ error: 'Please enter a valid full name (minimum 3 characters).' });
    }`;

content = content.replace(searchStr, replaceStr);
fs.writeFileSync(path, content);
console.log('Successfully patched admin.js name validation (take 2)');
