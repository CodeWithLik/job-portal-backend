const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\server.js';
let content = fs.readFileSync(path, 'utf8');

const oldQuery = `"SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('allow_job_posting', 'allow_job_applications')"`;
const newQuery = `"SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('allow_job_posting', 'allow_job_applications', 'allow_user_registration', 'allow_recruiter_registration')"`;

content = content.replace(oldQuery, newQuery);

fs.writeFileSync(path, content);
console.log('Updated server.js to return registration settings');
