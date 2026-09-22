const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\auth.js';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }`;

const replaceStr = `  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (name.trim().length < 3) {
    return res.status(400).json({ error: 'Please enter a valid full name (minimum 3 characters).' });
  }`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(path, content);
  console.log('Successfully updated auth.js name validation');
} else {
  console.log('Could not find validation block in auth.js');
}
