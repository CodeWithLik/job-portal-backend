const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\auth.js';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `  if (name.trim().length < 3) {
    return res.status(400).json({ error: 'Please enter a valid full name (minimum 3 characters).' });
  }`;

const replaceStr = `  if (name.trim().length < 3) {
    return res.status(400).json({ error: 'Please enter a valid full name (minimum 3 characters).' });
  }

  if (role === 'recruiter') {
    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'Company name is required for recruiters.' });
    }
    if (company_name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a valid company name (minimum 2 characters).' });
    }
  }`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(path, content);
  console.log('Successfully patched company validation in auth.js');
} else {
  console.log('Could not find search string in auth.js');
}
