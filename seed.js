const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { pool } = require('./src/db/db');

async function seedDatabase() {
  try {
    console.log('Connecting to database...');
    
    // 1. Run schema.sql
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('Applying schema...');
    await pool.query(schemaSql);
    
    console.log('Schema applied. Inserting seed data...');

    // 2. Insert Users
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const usersResult = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES 
        ('Admin User', 'admin@jobportal.com', $1, 'admin', 'Active'),
        ('TechFlow HR', 'hr@techflow.com', $1, 'recruiter', 'Active'),
        ('Global Tech', 'careers@globaltech.com', $1, 'recruiter', 'Active'),
        ('John Doe', 'john@example.com', $1, 'seeker', 'Active'),
        ('Jane Smith', 'jane@example.com', $1, 'seeker', 'Active'),
        ('Alice Walker', 'alice.w@example.com', $1, 'seeker', 'Active'),
        ('Bob Builder', 'bob@example.com', $1, 'seeker', 'Active'),
        ('Charlie Chaplin', 'charlie@example.com', $1, 'seeker', 'Suspended')
      RETURNING id, email, role;
    `, [passwordHash]);

    const users = usersResult.rows;
    console.log(`Inserted ${users.length} users.`);

    const getUserId = (email) => users.find(u => u.email === email).id;

    // 3. Insert Recruiter Profiles
    await pool.query(`
      INSERT INTO recruiter_profiles (user_id, company_name, company_description, location)
      VALUES 
        ($1, 'TechFlow', 'Leading software solutions provider.', 'Remote'),
        ($2, 'Global Tech', 'Enterprise infrastructure and AI.', 'New York, NY')
    `, [getUserId('hr@techflow.com'), getUserId('careers@globaltech.com')]);

    // 4. Insert Seeker Profiles
    await pool.query(`
      INSERT INTO seeker_profiles (user_id, headline, bio, skills, location)
      VALUES 
        ($1, 'Senior Frontend Developer', 'Passionate about React and UI/UX.', 'React, Node.js, Python, TailwindCSS', 'Remote'),
        ($2, 'Backend Engineer', 'Building scalable APIs.', 'Node.js, Express, PostgreSQL', 'San Francisco, CA')
    `, [getUserId('john@example.com'), getUserId('jane@example.com')]);

    // 5. Insert Jobs
    const jobsResult = await pool.query(`
      INSERT INTO jobs (recruiter_id, title, company, description, location, employment_type, category, salary_min, salary_max, status)
      VALUES 
        ($1, 'Senior Frontend Developer', 'TechFlow', 'We are looking for a Senior Frontend Developer to join our team...', 'Remote', 'Full-time', 'Software Engineering', 120000, 150000, 'Active'),
        ($2, 'Backend Engineer', 'Global Tech', 'Join our core infrastructure team to build scalable APIs...', 'New York, NY', 'Full-time', 'Software Engineering', 130000, 160000, 'Active'),
        ($1, 'Machine Learning Intern', 'TechFlow', 'Looking for a passionate ML intern to work on NLP models.', 'San Francisco, CA', 'Internship', 'Data Science', 60000, 80000, 'Active')
      RETURNING id, title;
    `, [getUserId('hr@techflow.com'), getUserId('careers@globaltech.com')]);

    const jobs = jobsResult.rows;
    console.log(`Inserted ${jobs.length} jobs.`);

    // 6. Insert Applications
    const appsResult = await pool.query(`
      INSERT INTO applications (job_id, seeker_id, status)
      VALUES 
        ($1, $4, 'Interview', 92),
        ($2, $5, 'Applied', 85),
        ($3, $4, 'Applied', 78)
      RETURNING id;
    `, [jobs[0].id, jobs[1].id, jobs[2].id, getUserId('john@example.com'), getUserId('jane@example.com')]);

    const apps = appsResult.rows;

    // 7. Insert Saved Jobs
    await pool.query(`
      INSERT INTO saved_jobs (job_id, seeker_id)
      VALUES 
        ($1, $3),
        ($2, $3)
    `, [jobs[1].id, jobs[2].id, getUserId('john@example.com')]);

    // 8. Insert AI Analyses
    await pool.query(`
      INSERT INTO ai_analyses (application_id, match_score, matched_skills, missing_skills, status)
      VALUES 
        ($1, 92, 'React, TypeScript, Tailwind CSS', 'GraphQL', 'Completed'),
        ($2, 85, 'Node.js, Express, MongoDB', 'Docker, Kubernetes', 'Completed')
    `, [apps[0].id, apps[1].id]);

    // 9. Insert Default System Settings
    const defaultSettings = [
      ['platform_name', 'AI-Integrated Job Portal'],
      ['platform_description', 'Connecting job seekers with recruiters using advanced AI matching.'],
      ['default_language', 'English (US)'],
      ['time_zone', 'UTC (Coordinated Universal Time)'],
      ['allow_user_registration', 'true'],
      ['allow_recruiter_registration', 'true'],
      ['require_admin_approval_recruiters', 'false'],
      ['default_user_role', 'Job Seeker'],
      ['allow_job_posting', 'true'],
      ['require_admin_approval_jobs', 'false'],
      ['default_job_expiration_days', '30'],
      ['allow_job_applications', 'true'],
      ['max_active_applications_per_user', '50'],
      ['application_status_options', 'Applied, Shortlisted, Interview, Rejected, Hired'],
      ['enable_ai_resume_analysis', 'true'],
      ['enable_ai_match_scoring', 'true'],
      ['enable_email_notifications', 'true'],
      ['send_alerts_new_applications', 'true'],
      ['admin_alerts_platform_errors', 'true'],
      ['require_2fa_admin', 'false'],
      ['session_timeout_minutes', '120'],
      ['password_policy', 'Standard (8+ chars, 1 number)']
    ];

    for (const [key, value] of defaultSettings) {
      await pool.query('INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2)', [key, value]);
    }

    console.log('Default system settings inserted.');
    console.log('Database seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seedDatabase();

