const fs = require('fs');
const path = require('path');

const authPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\auth.js';
let authContent = fs.readFileSync(authPath, 'utf8');

// Replace /me route
const meRegex = /const userRes = await pool\.query\('SELECT id, name, email, role, status FROM users WHERE id = \$1', \[req\.user\.id\]\);/;
const meReplacement = `const userQuery = \`
      SELECT u.id, u.name, u.email, u.role, u.status, 
             COALESCE(sp.profile_photo, rp.logo) as avatar
      FROM users u
      LEFT JOIN seeker_profiles sp ON u.id = sp.user_id AND u.role = 'seeker'
      LEFT JOIN recruiter_profiles rp ON u.id = rp.user_id AND u.role = 'recruiter'
      WHERE u.id = $1
    \`;
    const userRes = await pool.query(userQuery, [req.user.id]);`;
authContent = authContent.replace(meRegex, meReplacement);

// Replace /login route (the JSON response part)
const loginJsonRegex = /res\.json\(\{\s*token,\s*user: \{\s*id: user\.id,\s*name: user\.name,\s*email: user\.email,\s*role: user\.role,\s*status: user\.status\s*\}\s*\}\);/;
const loginJsonReplacement = `
    const profileQuery = \`
      SELECT COALESCE(sp.profile_photo, rp.logo) as avatar
      FROM users u
      LEFT JOIN seeker_profiles sp ON u.id = sp.user_id AND u.role = 'seeker'
      LEFT JOIN recruiter_profiles rp ON u.id = rp.user_id AND u.role = 'recruiter'
      WHERE u.id = $1
    \`;
    const profileRes = await pool.query(profileQuery, [user.id]);
    const avatar = profileRes.rows[0]?.avatar;

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        status: user.status,
        avatar: avatar
      } 
    });`;
authContent = authContent.replace(loginJsonRegex, loginJsonReplacement);

// Replace /register route (the JSON response part)
const registerJsonRegex = /res\.status\(201\)\.json\(\{\s*message: 'User registered successfully',\s*token,\s*user: \{\s*id: user\.id,\s*name: user\.name,\s*email: user\.email,\s*role: user\.role,\s*status: user\.status\s*\}\s*\}\);/;
const registerJsonReplacement = `res.status(201).json({ 
      message: 'User registered successfully', 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        status: user.status,
        avatar: null
      } 
    });`;
authContent = authContent.replace(registerJsonRegex, registerJsonReplacement);

fs.writeFileSync(authPath, authContent);
console.log('Fixed backend auth to return avatar');
