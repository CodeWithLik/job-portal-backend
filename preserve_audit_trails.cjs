const fs = require('fs');

const adminPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let content = fs.readFileSync(adminPath, 'utf8');

// Patch DELETE /api/admin/users/:id
const userDeleteOriginal = `const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, name', [id]);`;
const userDeleteReplacement = `// Preserve audit trail before cascade delete wipes dynamic logs
      await pool.query(\`
        INSERT INTO activity_logs (type, user_name, user_email, action, module, timestamp)
        SELECT 'User Signups', name, email, 'Registered as ' || role, 'Users', created_at
        FROM users WHERE id = $1
      \`, [id]);

      await pool.query(\`
        INSERT INTO activity_logs (type, user_name, user_email, action, module, timestamp)
        SELECT 'Job Posts', u.name, u.email, 'Posted new job ''' || j.title || '''', 'Jobs', j.created_at
        FROM jobs j JOIN users u ON j.recruiter_id = u.id WHERE u.id = $1
      \`, [id]);

      await pool.query(\`
        INSERT INTO activity_logs (type, user_name, user_email, action, module, timestamp)
        SELECT 'Applications & Status Updates', u.name, u.email, 'Submitted application for ''' || j.title || '''', 'Applications', a.applied_at
        FROM applications a JOIN users u ON a.seeker_id = u.id JOIN jobs j ON a.job_id = j.id
        WHERE u.id = $1
      \`, [id]);

      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, name', [id]);`;

if (content.includes(userDeleteOriginal)) {
    content = content.replace(userDeleteOriginal, userDeleteReplacement);
} else {
    console.error("Could not find user delete line");
}

// Patch DELETE /api/admin/jobs/:id
const jobDeleteOriginal = `const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING id, title', [id]);`;
const jobDeleteReplacement = `// Preserve audit trail before cascade delete wipes dynamic logs
      await pool.query(\`
        INSERT INTO activity_logs (type, user_name, user_email, action, module, timestamp)
        SELECT 'Job Posts', u.name, u.email, 'Posted new job ''' || j.title || '''', 'Jobs', j.created_at
        FROM jobs j JOIN users u ON j.recruiter_id = u.id WHERE j.id = $1
      \`, [id]);

      await pool.query(\`
        INSERT INTO activity_logs (type, user_name, user_email, action, module, timestamp)
        SELECT 'Applications & Status Updates', u.name, u.email, 'Submitted application for ''' || j.title || '''', 'Applications', a.applied_at
        FROM applications a JOIN users u ON a.seeker_id = u.id JOIN jobs j ON a.job_id = j.id
        WHERE j.id = $1
      \`, [id]);

      const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING id, title', [id]);`;

if (content.includes(jobDeleteOriginal)) {
    content = content.replace(jobDeleteOriginal, jobDeleteReplacement);
} else {
    console.error("Could not find job delete line");
}

fs.writeFileSync(adminPath, content);
console.log('Patched admin.js successfully');
