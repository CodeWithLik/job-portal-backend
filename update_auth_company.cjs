const fs = require('fs');

const authPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\auth.js';
let content = fs.readFileSync(authPath, 'utf8');

// Modify /me route
let regexMe = /SELECT u.id, u.name, u.email, u.role, u.status, \s*COALESCE\(sp.profile_photo, rp.logo\) as avatar\s*FROM users u\s*LEFT JOIN seeker_profiles sp ON u.id = sp.user_id AND u.role = 'seeker'\s*LEFT JOIN recruiter_profiles rp ON u.id = rp.user_id AND u.role = 'recruiter'\s*WHERE u.id = \$1/m;

let replMe = `SELECT u.id, u.name, u.email, u.role, u.status, 
             COALESCE(sp.profile_photo, rp.logo) as avatar,
             rp.company_name
      FROM users u
      LEFT JOIN seeker_profiles sp ON u.id = sp.user_id AND u.role = 'seeker'
      LEFT JOIN recruiter_profiles rp ON u.id = rp.user_id AND u.role = 'recruiter'
      WHERE u.id = $1`;

content = content.replace(regexMe, replMe);

// Modify /login route
let regexLogin = /SELECT COALESCE\(sp.profile_photo, rp.logo\) as avatar\s*FROM users u\s*LEFT JOIN seeker_profiles sp ON u.id = sp.user_id AND u.role = 'seeker'\s*LEFT JOIN recruiter_profiles rp ON u.id = rp.user_id AND u.role = 'recruiter'\s*WHERE u.id = \$1/m;

let replLogin = `SELECT COALESCE(sp.profile_photo, rp.logo) as avatar, rp.company_name
      FROM users u
      LEFT JOIN seeker_profiles sp ON u.id = sp.user_id AND u.role = 'seeker'
      LEFT JOIN recruiter_profiles rp ON u.id = rp.user_id AND u.role = 'recruiter'
      WHERE u.id = $1`;

content = content.replace(regexLogin, replLogin);

// Update JSON response in /login
content = content.replace(
  'avatar: avatar',
  'avatar: avatar,\n        companyName: profileRes.rows[0]?.company_name'
);

// Update JSON response in /register
content = content.replace(
  'avatar: null',
  'avatar: null,\n        companyName: null'
);

fs.writeFileSync(authPath, content);
console.log('Updated Auth backend for company_name');
