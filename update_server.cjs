const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const hookPoint = "app.use('/api', applicationsRoutes);";
content = content.replace(hookPoint, hookPoint + "\napp.use('/api/contact', require('./src/routes/contact'));");

fs.writeFileSync('server.js', content);
console.log('server.js updated');
