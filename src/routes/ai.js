const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { verifyToken, requireRole } = require('../middleware/auth');
const { pool } = require('../db/db');
const { logActivity } = require('../utils/activityLogger');

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
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and DOCX files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

router.post('/parse-resume', verifyToken, requireRole('seeker'), upload.single('resume'), async (req, res) => { fs.writeFileSync('ai_error.log', 'Hit parse-resume route\n', {flag: 'a'});
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file type. Only PDF and DOCX are supported.' });
  }

  const userId = req.user.id;
  const filePath = req.file.path;
  const resumeUrl = `/uploads/${req.file.filename}`;
  const resumeName = req.file.originalname;

  try {
    // 1. Send file to Python AI Service
    const formData = new FormData();
    formData.append('resume', fs.createReadStream(filePath));

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/parse-resume`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 90000 // 90 seconds timeout
    });

    const analysisData = aiResponse.data;

    // 2. Save result and resume to database
    await pool.query(
      'UPDATE seeker_profiles SET resume_url = $1, resume_name = $2, resume_analysis = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4',
      [resumeUrl, resumeName, JSON.stringify(analysisData), userId]
    );

    // 3. Log the activity
    await logActivity(userId, 'Resume Analyses', 'Analyzed resume with AI', 'Resume Analyses');

    res.json({
      success: true,
      message: 'Resume uploaded and analyzed successfully',
      resume_url: resumeUrl,
      resume_name: resumeName,
      analysis: analysisData
    });

  } catch (error) {
    console.error('AI Resume Parse Error:', error.response?.data || error.message); fs.writeFileSync('ai_error.log', JSON.stringify({msg: error.message, data: error.response?.data, stack: error.stack}), {flag: 'a'});
    
    // Cleanup file if AI fails, since upload failed conceptually
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(500).json({ error: 'Failed to process resume. Please try again.' });
  }
});

module.exports = router;


