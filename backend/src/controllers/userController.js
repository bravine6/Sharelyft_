const supabase = require('../config/supabase');

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { user } = req;
    
    // Check if user is admin
    if (user.user_type !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ message: error.message });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user by ID (admin only)
exports.getUserById = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    
    // Check if user is admin or requesting their own profile
    if (user.user_type !== 'admin' && user.id !== id) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', id)
      .single();
    
    if (error) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    
    // Check if user is admin
    if (user.user_type !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    // Don't allow admin to delete themselves
    if (user.id === id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    
    if (authError) {
      return res.status(400).json({ message: authError.message });
    }
    
    // Delete profile (should cascade automatically)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', id);
    
    if (profileError) {
      return res.status(400).json({ message: profileError.message });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};