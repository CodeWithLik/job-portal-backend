const fs = require('fs');
const path = require('path');

const authPath = path.join('C:\\Users\\Henna\\Documents\\backend\\src\\routes', 'auth.js');
let content = fs.readFileSync(authPath, 'utf8');

// Completely remove the token generation and return on register
const oldReturn = `    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'super_secret_jwt_key_development_only',
      { expiresIn: '24h' }
    );

    res.status(201).json({ user, token });`;

const newReturn = `    // We DO NOT generate or return a JWT here. 
    // The user MUST verify their email and log in manually to get a token.
    res.status(201).json({ user });`;

if (content.includes(oldReturn)) {
  content = content.replace(oldReturn, newReturn);
  fs.writeFileSync(authPath, content);
  console.log("Removed token from backend register response.");
} else {
  console.log("Could not find the token return block in auth.js");
}
