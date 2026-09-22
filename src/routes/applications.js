const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// Setup multer for application-specific resumes
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'app-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// SEEKER ROUTES

// POST /api/jobs/:id/apply (Apply to a job)
router.post('/jobs/:id/apply', requireRole('seeker'), upload.single('resume'), async (req, res) => {
  const { id: jobId } = req.params;
  const seekerId = req.user.id;
  const { cover_letter } = req.body;

  try {
    const settingRes = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'allow_job_applications'");
    const allowApps = settingRes.rows[0]?.setting_value;
    if (allowApps === 'false') {
      return res.status(403).json({ error: 'Applications are currently disabled by administration.' });
    }

    // Check if job exists and is active
    const jobCheck = await pool.query('SELECT status FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    if (jobCheck.rows[0].status !== 'Active') return res.status(400).json({ error: 'Job is no longer active' });

    // Check if already applied
    const appCheck = await pool.query('SELECT id FROM applications WHERE job_id = $1 AND seeker_id = $2', [jobId, seekerId]);
    if (appCheck.rows.length > 0) return res.status(400).json({ error: 'You have already applied for this job' });

    let finalResumeUrl = null;

    if (req.file) {
      finalResumeUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.use_saved_resume === 'true') {
      const profile = await pool.query('SELECT resume_url FROM seeker_profiles WHERE user_id = $1', [seekerId]);
      if (profile.rows.length > 0 && profile.rows[0].resume_url) {
        finalResumeUrl = profile.rows[0].resume_url;
      }
    }

    if (!finalResumeUrl) {
      return res.status(400).json({ error: 'Please upload your resume before applying for this job.', code: 'NO_RESUME' });
    }

    // Insert application
    const result = await pool.query(
      `INSERT INTO applications (job_id, seeker_id, status, resume_url, cover_letter)
       VALUES ($1, $2, 'Applied', $3, $4) RETURNING *`,
      [jobId, seekerId, finalResumeUrl, cover_letter || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// GET /api/seeker/applications (Get my applications)
router.get('/seeker/applications', requireRole('seeker'), async (req, res) => {
  try {
    const query = `
      SELECT a.*, 
             j.title as job_title, 
             j.company as job_company,
             j.location as job_location,
             j.employment_type as job_type,
             j.salary_min as job_salary_min,
             j.salary_max as job_salary_max,
             j.status as job_status,
             j.is_deleted as job_is_deleted
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.seeker_id = $1
      ORDER BY a.applied_at DESC
    `;
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch apps error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// RECRUITER ROUTES

// GET /api/recruiter/jobs/:id/applications (Get applicants for my job)
router.get('/recruiter/jobs/:id/applications', requireRole('recruiter'), async (req, res) => {
  const { id: jobId } = req.params;

  try {
    // Verify ownership
    const check = await pool.query('SELECT recruiter_id FROM jobs WHERE id = $1', [jobId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    if (check.rows[0].recruiter_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    const query = `
      SELECT a.*, u.name as seeker_name, u.email as seeker_email, sp.skills
      FROM applications a
      JOIN users u ON a.seeker_id = u.id
      JOIN seeker_profiles sp ON u.id = sp.user_id
      WHERE a.job_id = $1
      ORDER BY a.ai_match_score DESC, a.applied_at DESC
    `;
    const result = await pool.query(query, [jobId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch applicants error:', error);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// GET /api/recruiter/applications (Get all applicants across all my jobs)
router.get('/recruiter/applications', requireRole('recruiter'), async (req, res) => {
  try {
    const query = `
      SELECT a.*, u.name as seeker_name, u.email as seeker_email, sp.skills, j.title as job_title, j.id as job_id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.seeker_id = u.id
      JOIN seeker_profiles sp ON u.id = sp.user_id
      WHERE j.recruiter_id = $1
      ORDER BY a.ai_match_score DESC, a.applied_at DESC
    `;
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch all applicants error:', error);
    res.status(500).json({ error: 'Failed to fetch all applicants' });
  }
});

// PUT /api/applications/:id (Update application status - Recruiter/Admin)
router.put('/applications/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    // If recruiter, check ownership
    if (role === 'recruiter') {
      const check = await pool.query(`
        SELECT j.recruiter_id FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id = $1
      `, [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
      if (check.rows[0].recruiter_id !== userId) return res.status(403).json({ error: 'Unauthorized' });
    } else if (role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'UPDATE applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update app error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// GET /api/recruiter/applications/:id/profile (Get full seeker profile for a specific application)
router.get('/recruiter/applications/:id/profile', requireRole('recruiter'), async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the application exists and belongs to a job owned by this recruiter
    const checkQuery = `
      SELECT a.*, j.title as job_title, j.status as job_status, j.recruiter_id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1
    `;
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (checkResult.rows[0].recruiter_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this candidate' });
    }

    const application = checkResult.rows[0];

    // Fetch the seeker's full profile
    const profileQuery = `
      SELECT u.name, u.email, sp.*
      FROM users u
      LEFT JOIN seeker_profiles sp ON u.id = sp.user_id
      WHERE u.id = $1
    `;
    const profileResult = await pool.query(profileQuery, [application.seeker_id]);
    
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }

    const profile = profileResult.rows[0];

    res.json({
      application: {
        id: application.id,
        status: application.status,
        applied_at: application.applied_at,
        
        resume_url: application.resume_url,
        cover_letter: application.cover_letter,
        job_title: application.job_title
      },
      profile
    });
  } catch (error) {
    console.error('Fetch applicant profile error:', error);
    res.status(500).json({ error: 'Failed to fetch candidate profile' });
  }
});

module.exports = router;

