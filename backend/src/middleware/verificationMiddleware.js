const supabase = require('../config/supabase');

// Middleware to check if user has completed both email and phone verification
exports.requireFullVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user profile with verification status
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('email_verified, phone_verified, email, phone')
      .eq('user_id', userId)
      .single();
    
    if (error || !profile) {
      return res.status(404).json({ 
        message: 'User profile not found',
        error: 'PROFILE_NOT_FOUND'
      });
    }
    
    // Check email verification
    if (!profile.email_verified) {
      return res.status(403).json({
        message: 'Email verification required to access this feature',
        error: 'EMAIL_NOT_VERIFIED',
        required_verification: {
          email: false,
          phone: profile.phone_verified
        }
      });
    }
    
    // Check phone verification
    if (!profile.phone_verified) {
      return res.status(403).json({
        message: 'Phone verification required to access this feature',
        error: 'PHONE_NOT_VERIFIED',
        required_verification: {
          email: true,
          phone: false
        }
      });
    }
    
    // Both verifications complete, proceed
    next();
  } catch (error) {
    console.error('Verification middleware error:', error);
    res.status(500).json({ 
      message: 'Error checking verification status',
      error: 'VERIFICATION_CHECK_FAILED'
    });
  }
};

// Middleware to check if user has email verification (less strict)
exports.requireEmailVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user profile with verification status
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('email_verified')
      .eq('user_id', userId)
      .single();
    
    if (error || !profile) {
      return res.status(404).json({ 
        message: 'User profile not found',
        error: 'PROFILE_NOT_FOUND'
      });
    }
    
    if (!profile.email_verified) {
      return res.status(403).json({
        message: 'Email verification required to access this feature',
        error: 'EMAIL_NOT_VERIFIED'
      });
    }
    
    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    res.status(500).json({ 
      message: 'Error checking email verification status',
      error: 'EMAIL_VERIFICATION_CHECK_FAILED'
    });
  }
};

// Middleware to check verification status and add to request object (non-blocking)
exports.addVerificationStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user profile with verification status
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('email_verified, phone_verified')
      .eq('user_id', userId)
      .single();
    
    if (!error && profile) {
      req.verification = {
        email_verified: profile.email_verified,
        phone_verified: profile.phone_verified,
        fully_verified: profile.email_verified && profile.phone_verified
      };
    } else {
      req.verification = {
        email_verified: false,
        phone_verified: false,
        fully_verified: false
      };
    }
    
    next();
  } catch (error) {
    console.error('Add verification status middleware error:', error);
    // Don't block request, just set default values
    req.verification = {
      email_verified: false,
      phone_verified: false,
      fully_verified: false
    };
    next();
  }
};