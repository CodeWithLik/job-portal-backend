const express = require('express');
const router = express.Router();
const { pool } = require('../db/db');
const { verifyToken, requireRole } = require('../middleware/auth');

async function logActivity(reqUser, type, action, moduleName) {
  try {
    const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [reqUser.id]);
    const userName = userRes.rows[0]?.name || 'Recruiter';
    const userEmail = userRes.rows[0]?.email || reqUser.email || 'recruiter@example.com';
    await pool.query(
      'INSERT INTO activity_logs (type, user_name, user_email, action, module) VALUES ($1, $2, $3, $4, $5)',
      [type, userName, userEmail, action, moduleName]
    );
  } catch (err) {
    console.error('Failed to log activity', err);
  }
}

// GET /api/jobs (Public/Seeker)
router.get('/', async (req, res) => {
  try {
    const { search, type, location } = req.query;
    
    let query = `
      SELECT j.*, u.name as recruiter_name, rp.company_name, rp.logo 
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      JOIN recruiter_profiles rp ON u.id = rp.user_id
      WHERE j.status = 'Active' AND j.is_deleted = false
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (j.title ILIKE $${paramIndex} OR j.company ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (type && type !== 'all') {
      query += ` AND j.employment_type ILIKE $${paramIndex}`;
      params.push(`%${type}%`);
      paramIndex++;
    }

    if (location && location !== 'all') {
      query += ` AND j.location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    query += ' ORDER BY j.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id (Public/Seeker)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT j.*, u.name as recruiter_name, rp.company_name, rp.logo, rp.company_description, rp.website, rp.location as company_location, rp.industry, rp.company_size 
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.id
      JOIN recruiter_profiles rp ON u.id = rp.user_id
      WHERE j.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});

// RECRUITER ROUTES BELOW
router.use(verifyToken);

// POST /api/jobs
router.post('/', requireRole('recruiter'), async (req, res) => {
  const { title, company, description, location, employment_type, category, salary_min, salary_max, expires_at } = req.body;
  
  if (!title || !company) {
    return res.status(400).json({ error: 'Title and company are required' });
  }

  if (salary_min != null && salary_max != null && Number(salary_min) > Number(salary_max)) {
    return res.status(400).json({ error: 'Minimum salary cannot be greater than maximum salary.' });
  }

  try {
    const settingRes = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'allow_job_posting'");
    const allowPosting = settingRes.rows[0]?.setting_value;
    if (allowPosting === 'false') {
      return res.status(403).json({ error: 'Job postings are currently disabled by administration.' });
    }

    const result = await pool.query(
      `INSERT INTO jobs (recruiter_id, title, company, description, location, employment_type, category, salary_min, salary_max, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active', $10) RETURNING *`,
      [req.user.id, title, company, description, location, employment_type, category, salary_min, salary_max, expires_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// PUT /api/jobs/:id
router.put('/:id', requireRole('recruiter'), async (req, res) => {
  const { id } = req.params;
  const { title, company, description, location, employment_type, category, salary_min, salary_max, status, expires_at } = req.body;

  if (salary_min != null && salary_max != null && Number(salary_min) > Number(salary_max)) {
    return res.status(400).json({ error: 'Minimum salary cannot be greater than maximum salary.' });
  }

  try {
    // Check if user owns job
    const check = await pool.query('SELECT recruiter_id, title, status FROM jobs WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    if (check.rows[0].recruiter_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `UPDATE jobs SET title=$1, company=$2, description=$3, location=$4, employment_type=$5, category=$6, salary_min=$7, salary_max=$8, status=$9, expires_at=$10, updated_at=CURRENT_TIMESTAMP
       WHERE id=$11 RETURNING *`,
      [title, company, description, location, employment_type, category, salary_min, salary_max, status, expires_at, id]
    );

    if (check.rows[0].status === 'Closed' && status === 'Active') {
      await logActivity(req.user, 'Job Status Changes', `Reopened job '${title}'`, 'Jobs');
    } else {
      await logActivity(req.user, 'Job Posts', `Updated job '${title}'`, 'Jobs');
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// PATCH /api/jobs/:id/close
router.patch('/:id/close', requireRole('recruiter'), async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT recruiter_id, title FROM jobs WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    if (check.rows[0].recruiter_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    
    const result = await pool.query(
      "UPDATE jobs SET status = 'Closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );
    await logActivity(req.user, 'Job Status Changes', `Closed job '${check.rows[0].title}'`, 'Jobs');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error closing job:', error);
    res.status(500).json({ error: 'Failed to close job' });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', requireRole('recruiter'), async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT recruiter_id, title FROM jobs WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    if (check.rows[0].recruiter_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('UPDATE jobs SET is_deleted = true WHERE id = $1', [id]);
    await logActivity(req.user, 'Job Deletions', `Deleted job '${check.rows[0].title}'`, 'Jobs');
    res.json({ message: 'Job soft-deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// SEEKER SAVED JOBS ROUTES

// POST /api/jobs/:id/save
router.post('/:id/save', requireRole('seeker'), async (req, res) => {
  const { id } = req.params;
  const seekerId = req.user.id;
  try {
    await pool.query('INSERT INTO saved_jobs (job_id, seeker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, seekerId]);
    res.json({ message: 'Job saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save job' });
  }
});

// DELETE /api/jobs/:id/save
router.delete('/:id/save', requireRole('seeker'), async (req, res) => {
  const { id } = req.params;
  const seekerId = req.user.id;
  try {
    await pool.query('DELETE FROM saved_jobs WHERE job_id = $1 AND seeker_id = $2', [id, seekerId]);
    res.json({ message: 'Job removed from saved list' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unsave job' });
  }
});

// GET /api/jobs/:id/status
router.get('/:id/status', requireRole('seeker'), async (req, res) => {
  const { id } = req.params;
  const seekerId = req.user.id;
  try {
    const savedCheck = await pool.query('SELECT id FROM saved_jobs WHERE job_id = $1 AND seeker_id = $2', [id, seekerId]);
    const appCheck = await pool.query('SELECT status FROM applications WHERE job_id = $1 AND seeker_id = $2', [id, seekerId]);
    
    res.json({
      saved: savedCheck.rows.length > 0,
      applicationStatus: appCheck.rows.length > 0 ? appCheck.rows[0].status : null
    });
  } catch (error) {
    console.error('Job status check error:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// GET /api/seeker/saved-jobs
router.get('/seeker/saved-jobs', requireRole('seeker'), async (req, res) => {
  const seekerId = req.user.id;
  try {
    const query = `
      SELECT j.*, u.name as recruiter_name, rp.company_name, rp.logo, a.status as application_status, sj.created_at as saved_at FROM saved_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      JOIN users u ON j.recruiter_id = u.id
      JOIN recruiter_profiles rp ON u.id = rp.user_id
      LEFT JOIN applications a ON a.job_id = j.id AND a.seeker_id = sj.seeker_id
      WHERE sj.seeker_id = $1
      ORDER BY sj.created_at DESC
    `;
    const result = await pool.query(query, [seekerId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Saved jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch saved jobs' });
  }
});

// GET /api/recruiter/jobs (Get own jobs)
router.get('/recruiter/my-jobs', requireRole('recruiter'), async (req, res) => {
  try {
    const query = `
      SELECT j.*, 
      (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications_count
      FROM jobs j
      WHERE j.recruiter_id = $1
      ORDER BY j.created_at DESC
    `;
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

module.exports = router;
