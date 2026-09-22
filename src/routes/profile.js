const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

router.use(verifyToken);

// GET /api/profile/seeker
router.get('/seeker', requireRole('seeker'), async (req, res) => {
  try {
    const query = `
      SELECT u.name, u.email, sp.profile_photo, sp.headline, sp.bio, sp.skills, sp.phone, sp.location, sp.portfolio_url, sp.github_url, sp.linkedin_url, sp.resume_url, sp.resume_name, sp.resume_analysis 
      FROM users u
      JOIN seeker_profiles sp ON u.id = sp.user_id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch seeker profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile/seeker
router.put('/seeker', requireRole('seeker'), async (req, res) => {
  const { name, email, headline, bio, skills, phone, location, portfolio_url, github_url, linkedin_url } = req.body;
  const userId = req.user.id;

  try {
    // Start transaction
    await pool.query('BEGIN');

    // Update users table (name, email)
    if (name || email) {
      // Very basic uniqueness check for email if changing
      if (email && email !== req.user.email) {
        const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
          await pool.query('ROLLBACK');
          return res.status(400).json({ error: 'Email already in use' });
        }
      }
      
      const userUpdateQuery = `
        UPDATE users 
        SET name = COALESCE($1, name), email = COALESCE($2, email) 
        WHERE id = $3
      `;
      await pool.query(userUpdateQuery, [name, email, userId]);
    }

    // Update seeker_profiles table
    const profileUpdateQuery = `
      UPDATE seeker_profiles
      SET headline = COALESCE($1, headline), 
          bio = COALESCE($2, bio), 
          skills = COALESCE($3, skills),
          phone = COALESCE($4, phone),
          location = COALESCE($5, location),
          portfolio_url = COALESCE($6, portfolio_url),
          github_url = COALESCE($7, github_url),
          linkedin_url = COALESCE($8, linkedin_url)
      WHERE user_id = $9
      RETURNING *
    `;
    const result = await pool.query(profileUpdateQuery, [headline, bio, skills, phone, location, portfolio_url, github_url, linkedin_url, userId]);

    await logActivity(userId, 'Profile Updates', 'Updated profile details', 'Profile Updates');

    await pool.query('COMMIT');
    
    res.json({
      name,
      email,
      ...result.rows[0]
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Update seeker profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Setup multer for resume uploads
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
    cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'resume' && file.mimetype === 'application/pdf') {
    cb(null, true);
  } else if ((file.fieldname === 'logo' || file.fieldname === 'profile_photo') && ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// POST /api/profile/recruiter/logo
router.post('/recruiter/logo', requireRole('recruiter'), upload.single('logo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file type' });
  }

  const userId = req.user.id;
  const logoUrl = `/uploads/${req.file.filename}`;

  try {
    const result = await pool.query(
      'UPDATE recruiter_profiles SET logo = $1 WHERE user_id = $2 RETURNING logo',
      [logoUrl, userId]
    );
    res.json({ 
      logo: result.rows[0].logo,
      message: 'Logo uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: 'Failed to save logo reference' });
  }
});

// DELETE /api/profile/recruiter/logo
router.delete('/recruiter/logo', requireRole('recruiter'), async (req, res) => {
  const userId = req.user.id;
  try {
    const profileRes = await pool.query('SELECT logo FROM recruiter_profiles WHERE user_id = $1', [userId]);
    const currentLogo = profileRes.rows[0]?.logo;
    if (currentLogo) {
      const fileName = path.basename(currentLogo);
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await pool.query('UPDATE recruiter_profiles SET logo = NULL WHERE user_id = $1', [userId]);
      return res.json({ message: 'Logo removed successfully' });
    } else {
      return res.status(404).json({ error: 'No logo found' });
    }
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({ error: 'Failed to remove logo' });
  }
});

// POST /api/profile/seeker/resume
router.post('/seeker/resume', requireRole('seeker'), upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file type' });
  }

  const userId = req.user.id;
  // Make the URL relative to a static route, e.g., /uploads/filename.pdf
  const resumeUrl = `/uploads/${req.file.filename}`;
  const resumeName = req.file.originalname;

  try {
    const result = await pool.query(
      'UPDATE seeker_profiles SET resume_url = $1, resume_name = $2 WHERE user_id = $3 RETURNING resume_url, resume_name',
      [resumeUrl, resumeName, userId]
    );
    res.json({ 
      resume_url: result.rows[0].resume_url, 
      resume_name: result.rows[0].resume_name,
      message: 'Resume uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({ error: 'Failed to save resume reference' });
  }
});

// DELETE /api/profile/seeker/resume
router.delete('/seeker/resume', requireRole('seeker'), async (req, res) => {
  const userId = req.user.id;

  try {
    const profileRes = await pool.query('SELECT resume_url FROM seeker_profiles WHERE user_id = $1', [userId]);
    const currentResume = profileRes.rows[0]?.resume_url;

    if (currentResume) {
      // Check if this resume is referenced by any applications
      const appCheck = await pool.query('SELECT id FROM applications WHERE resume_url = $1 LIMIT 1', [currentResume]);
      
      if (appCheck.rows.length === 0) {
        // Safe to delete physically if no application references it
        const fileName = path.basename(currentResume);
        const filePath = path.join(uploadDir, fileName);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await pool.query('UPDATE seeker_profiles SET resume_url = NULL, resume_name = NULL, resume_analysis = NULL WHERE user_id = $1', [userId]);
      return res.json({ message: 'Resume removed successfully' });
    } else {
      return res.status(404).json({ error: 'No resume found' });
    }
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to remove resume' });
  }
});

// POST /api/profile/seeker/photo
router.post('/seeker/photo', requireRole('seeker'), upload.single('profile_photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file type' });
  }

  const userId = req.user.id;
  const photoUrl = `/uploads/${req.file.filename}`;

  try {
    const result = await pool.query(
      'UPDATE seeker_profiles SET profile_photo = $1 WHERE user_id = $2 RETURNING profile_photo',
      [photoUrl, userId]
    );
    res.json({ 
      profile_photo: result.rows[0].profile_photo,
      message: 'Photo uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Failed to save photo reference' });
  }
});

// DELETE /api/profile/seeker/photo
router.delete('/seeker/photo', requireRole('seeker'), async (req, res) => {
  const userId = req.user.id;
  try {
    const profileRes = await pool.query('SELECT profile_photo FROM seeker_profiles WHERE user_id = $1', [userId]);
    const currentPhoto = profileRes.rows[0]?.profile_photo;
    if (currentPhoto) {
      const fileName = path.basename(currentPhoto);
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await pool.query('UPDATE seeker_profiles SET profile_photo = NULL WHERE user_id = $1', [userId]);
      return res.json({ message: 'Photo removed successfully' });
    } else {
      return res.status(404).json({ error: 'No photo found' });
    }
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Failed to remove photo' });
  }
});

// GET /api/profile/recruiter
router.get('/recruiter', requireRole('recruiter'), async (req, res) => {
  try {
    const query = `
      SELECT u.name as user_name, u.email, rp.company_name as name, rp.company_description as description, rp.website, rp.location, rp.logo, rp.industry, rp.company_size as size 
      FROM users u
      JOIN recruiter_profiles rp ON u.id = rp.user_id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch recruiter profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile/recruiter
router.put('/recruiter', requireRole('recruiter'), async (req, res) => {
  const { name, industry, size, location, website, email, description } = req.body;
  const userId = req.user.id;

  try {
    await pool.query('BEGIN');
    
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Email already in use' });
      }
      await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);
    }

    const profileUpdateQuery = `
      UPDATE recruiter_profiles
      SET company_description = COALESCE($1, company_description), 
          website = COALESCE($2, website),
          location = COALESCE($3, location),
          industry = COALESCE($4, industry),
          company_size = COALESCE($5, company_size)
      WHERE user_id = $6
      RETURNING *
    `;
    await pool.query(profileUpdateQuery, [description, website, location, industry, size, userId]);

    await logActivity(userId, 'Profile Updates', 'Updated company profile', 'Profile Updates');

    await pool.query('COMMIT');
    
    res.json({ message: 'Profile updated' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Update recruiter profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
