const fs = require('fs');
const adminJsPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let adminJsContent = fs.readFileSync(adminJsPath, 'utf8');

adminJsContent = adminJsContent.replace(
  'SELECT j.title, j.company_name, u.email as employer_email, u.name as employer_name',
  'SELECT j.title, j.company as company_name, u.email as employer_email, u.name as employer_name'
);

fs.writeFileSync(adminJsPath, adminJsContent);
console.log('Fixed SQL query column name in admin.js');
