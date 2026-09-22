const fs = require('fs');

const adminPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let content = fs.readFileSync(adminPath, 'utf8');

const regex = /SELECT a\.\*, u\.name as seeker_name, u\.email as seeker_email, sp\.skills, j\.title as job_title, j\.id as job_id,\s*rp\.company_name/m;

const replacement = `SELECT a.*, u.name as seeker_name, u.email as seeker_email, sp.skills, sp.profile_photo as seeker_photo, j.title as job_title, j.id as job_id, rp.company_name`;

content = content.replace(regex, replacement);

fs.writeFileSync(adminPath, content);
console.log('Updated admin applications query with seeker_photo');
