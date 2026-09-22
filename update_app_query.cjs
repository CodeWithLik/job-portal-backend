const fs = require('fs');

const backendPath = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\applications.js';
let content = fs.readFileSync(backendPath, 'utf8');

const oldQuery = `SELECT a.*, 
             j.title as job_title, 
             j.company as job_company,
             j.location as job_location,
             j.employment_type as job_type,
             j.salary_min as job_salary_min,
             j.salary_max as job_salary_max
      FROM applications a`;

const newQuery = `SELECT a.*, 
             j.title as job_title, 
             j.company as job_company,
             j.location as job_location,
             j.employment_type as job_type,
             j.salary_min as job_salary_min,
             j.salary_max as job_salary_max,
             j.status as job_status,
             j.is_deleted as job_is_deleted
      FROM applications a`;

// Wait, the column is named 'company', not 'job_company'. But aliased as job_company.
content = content.replace(oldQuery, newQuery);
fs.writeFileSync(backendPath, content);
console.log('Updated backend GET /seeker/applications query');
