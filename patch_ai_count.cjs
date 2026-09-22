const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let content = fs.readFileSync(path, 'utf8');

const oldQuery = 'const aiAnalyses = await pool.query(`SELECT COUNT(*) FROM seeker_profiles WHERE resume_analysis IS NOT NULL AND updated_at >= ${dateCondition}`);';
const newQuery = 'const aiAnalyses = await pool.query(`SELECT COUNT(*) FROM activity_logs WHERE type = \\\'Resume Analyses\\\' AND timestamp >= ${dateCondition}`);';

if (content.includes(oldQuery)) {
  content = content.replace(oldQuery, newQuery);
  fs.writeFileSync(path, content);
  console.log('Successfully updated aiAnalyses query in admin.js');
} else {
  console.log('Could not find the old query to replace.');
}
