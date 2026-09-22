const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Remove current
content = content.replace("app.use('/api/contact', require('./src/routes/contact')); // Notice applications uses /api/seeker, /api/recruiter etc internally\n", "");
content = content.replace("app.use('/api/contact', require('./src/routes/contact'));\n", "");

// Add at top of Setup Routes
const hookPoint = "app.use('/api/auth', authRoutes);";
content = content.replace(hookPoint, hookPoint + "\napp.use('/api/contact', require('./src/routes/contact'));");

fs.writeFileSync('server.js', content);
console.log('Fixed route order in server.js');
