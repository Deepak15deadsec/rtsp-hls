const jwt = require('jsonwebtoken');
const config = require('../config/default');

/**
 * Authentication middleware
 * Verifies JWT token in the Authorization header
 */
module.exports = (req, res, next) => {
  // Check if authentication is enabled
  if (!config.authConfig.enabled) {
    // Skip authentication if disabled
    req.user = { username: 'guest' };
    return next();
  }
  
  // Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, config.authConfig.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
}; 