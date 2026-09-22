const fs = require('fs');
const path = 'src/routes/auth.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/subject: Verify your email address - \\,/g, "subject: 'Verify your email address',");
fs.writeFileSync(path, content);
console.log("Fixed auth.js syntax");
