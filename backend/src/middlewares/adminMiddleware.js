const supabase = require('../config/supabase');

const adminMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if user has admin permissions
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('admin_permissions')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Admin middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check admin permissions'
      });
    }

    if (!userProfile || !userProfile.admin_permissions) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // User has admin permissions, continue
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = adminMiddleware;