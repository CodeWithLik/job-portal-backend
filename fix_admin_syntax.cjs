const fs = require('fs');
const adminJsPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let adminJsContent = fs.readFileSync(adminJsPath, 'utf8');

// The file has \` instead of ` for the from field.
adminJsContent = adminJsContent.replace(/from: \\`"AI/g, 'from: `"AI');
adminJsContent = adminJsContent.replace(/}>\\`,/g, '}>`,');

fs.writeFileSync(adminJsPath, adminJsContent);
console.log('Fixed syntax error in admin.js');
