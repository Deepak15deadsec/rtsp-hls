const jwt = require('jsonwebtoken');
const config = require('../config/default');

/**
 * User login
 */
exports.login = (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if authentication is enabled
    if (!config.authConfig.enabled) {
      // Generate token even if auth is disabled for consistent API
      const token = jwt.sign(
        { username: 'guest' }, 
        config.authConfig.jwtSecret, 
        { expiresIn: config.authConfig.jwtExpiresIn }
      );
      
      return res.json({ 
        success: true,
        message: 'Authentication disabled, logged in as guest',
        token
      });
    }
    
    // Validate credentials
    if (username !== config.authConfig.username || password !== config.authConfig.password) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { username }, 
      config.authConfig.jwtSecret, 
      { expiresIn: config.authConfig.jwtExpiresIn }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * Verify current authentication status
 */
exports.verifyAuth = (req, res) => {
  res.json({ 
    authenticated: true,
    user: req.user
  });
}; 