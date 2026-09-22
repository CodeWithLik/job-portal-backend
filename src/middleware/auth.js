const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ error: 'A token is required for authentication' });
  }

  try {
    const splitToken = token.split(' ')[1] || token;
    const decoded = jwt.verify(splitToken, process.env.JWT_SECRET || 'super_secret_jwt_key_development_only');
    req.user = decoded;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Token' });
  }
  return next();
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  requireRole
};
