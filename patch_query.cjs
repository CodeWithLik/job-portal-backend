const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\jobs.js';
let content = fs.readFileSync(path, 'utf8');

const oldQuery = `SELECT j.*, u.name as recruiter_name, rp.company_name, rp.logo,
               a.status as application_status
        FROM saved_jobs sj`;

const newQuery = `SELECT j.*, u.name as recruiter_name, rp.company_name, rp.logo,
               a.status as application_status, sj.created_at as saved_at
        FROM saved_jobs sj`;

content = content.replace(oldQuery, newQuery);
fs.writeFileSync(path, content);
console.log('Added saved_at to saved-jobs query');
