const fs = require('fs');
const path = require('path');

const jobsFilePath = path.join('C:\\Users\\Henna\\Documents\\backend\\src\\routes\\jobs.js');
let content = fs.readFileSync(jobsFilePath, 'utf8');

content = content.replace(
  /await logActivity\(req\.user, 'Job Posts', `Reopened job '\$\{title\}'`, 'Jobs'\);/g,
  "await logActivity(req.user, 'Job Status Changes', `Reopened job '${title}'`, 'Jobs');"
);

content = content.replace(
  /await logActivity\(req\.user, 'Job Posts', `Closed job '\$\{check\.rows\[0\]\.title\}'`, 'Jobs'\);/g,
  "await logActivity(req.user, 'Job Status Changes', `Closed job '${check.rows[0].title}'`, 'Jobs');"
);

fs.writeFileSync(jobsFilePath, content);
console.log('Fixed jobs.js logging type');
