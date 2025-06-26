const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token required' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user profile from database
      const { data: user, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', decoded.id)
        .single();
      
      if (error || !user) {
        return res.status(401).json({ message: 'Invalid token or user not found' });
      }
      
      // Remove sensitive information
      delete user.password_hash;
      delete user.email_verification_token;
      delete user.phone_verification_code;
      delete user.password_reset_token;
      
      // Add user to request object
      req.user = user;
      req.userId = user.user_id;
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = authMiddleware;