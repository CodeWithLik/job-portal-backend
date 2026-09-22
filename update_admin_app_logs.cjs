const fs = require('fs');
const path = require('path');

const adminPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let content = fs.readFileSync(adminPath, 'utf8');

const targetStr = "'Changed application status for ' || u.name || ' to ' || a.status as action";
const replacementStr = "'Changed application status for ' || u.name || ' to ' || a.status || ' on ''' || j.title || '''' as action";

// Use split/join to replace all occurrences globally without worrying about regex escaping
content = content.split(targetStr).join(replacementStr);

fs.writeFileSync(adminPath, content);
console.log('Updated application status action string in admin.js');
