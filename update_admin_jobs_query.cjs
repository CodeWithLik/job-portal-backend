const fs = require('fs');

const adminPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let content = fs.readFileSync(adminPath, 'utf8');

const regex = /SELECT j\.\*, u\.name as recruiter_name, rp\.company_name,\s*\(SELECT COUNT\(\*\) FROM applications WHERE job_id = j\.id\) as application_count\s*FROM jobs j/m;

const replacement = `SELECT j.*, u.name as recruiter_name, rp.company_name, rp.logo as company_logo, 
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as application_count
        FROM jobs j`;

content = content.replace(regex, replacement);

fs.writeFileSync(adminPath, content);
console.log('Updated admin jobs query with company logo');
