const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\jobs.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /SELECT j\.\*, u\.name as recruiter_name, rp\.company_name, rp\.logo,\s*a\.status as application_status\s*FROM saved_jobs sj/m;

if (regex.test(content)) {
  content = content.replace(regex, 'SELECT j.*, u.name as recruiter_name, rp.company_name, rp.logo, a.status as application_status, sj.created_at as saved_at FROM saved_jobs sj');
  fs.writeFileSync(path, content);
  console.log("Successfully patched query");
} else {
  console.log("Regex didn't match!");
}
