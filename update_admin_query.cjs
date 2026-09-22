const fs = require('fs');

const adminPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let content = fs.readFileSync(adminPath, 'utf8');

const regex = /SELECT id, name, email, role, status, created_at,[\s\S]*?FROM users u/m;

const replacement = `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, 
        (SELECT COUNT(*) FROM applications WHERE seeker_id = u.id) as applications_count,
        (SELECT COUNT(*) FROM jobs WHERE recruiter_id = u.id) as jobs_count,
        sp.location as seeker_location,
        sp.phone as seeker_phone,
        sp.profile_photo as seeker_photo,
        sp.resume_url as seeker_resume_url,
        rp.company_name,
        rp.industry,
        rp.website,
        rp.logo as recruiter_logo
        FROM users u
        LEFT JOIN seeker_profiles sp ON u.id = sp.user_id AND u.role = 'seeker'
        LEFT JOIN recruiter_profiles rp ON u.id = rp.user_id AND u.role = 'recruiter'`;

content = content.replace(regex, replacement);

fs.writeFileSync(adminPath, content);
console.log('Updated admin users query with profile data');
