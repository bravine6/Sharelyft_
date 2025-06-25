const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
const auth = async (req, res, next) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }
    
    const token = authHeader.split(' ')[1];
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from Supabase
    console.log('Looking for user with ID:', decoded.id);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', decoded.id)
      .single();
    
    console.log('User profile data:', data);
    console.log('User profile error:', error);
    
    if (error || !data) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Add user to request object
    req.user = {
      id: decoded.id,  // JWT user ID (from auth.users)
      profile_id: data.id,  // user_profiles table ID
      email: decoded.email,
      ...data
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = auth;