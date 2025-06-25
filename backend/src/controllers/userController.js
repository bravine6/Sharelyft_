const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { email, password, name, phone, user_type = 'passenger' } = req.body;
    
    // Input validation
    if (!email || !password || !name || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Validate user type
    if (!['admin', 'driver', 'passenger'].includes(user_type)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }
    
    // Register with Supabase Auth using admin client
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email for development
    });
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        { user_id: data.user.id, name, phone, email, user_type }
      ]);
    
    if (profileError) {
      // If profile creation fails, delete the auth user
      await supabase.auth.admin.deleteUser(data.user.id);
      return res.status(400).json({ message: profileError.message });
    }
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return res.status(401).json({ message: error.message });
    }
    
    // Get user profile from database
    console.log('Looking for profile with user_id:', data.user.id);
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    
    console.log('Profile query result:', profile);
    console.log('Profile query error:', profileError);
    
    if (profileError || !profile) {
      console.error('Profile not found for user:', data.user.id);
      return res.status(404).json({ message: 'User profile not found' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: data.user.id, email: data.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user data with profile information
    const userData = {
      id: data.user.id,
      email: data.user.email,
      name: profile.name,
      phone: profile.phone,
      user_type: profile.user_type
    };
    
    console.log('Sending user data:', userData);
    res.json({ user: userData, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // User is available from auth middleware
    const { user } = req;
    
    // Get additional profile data from Supabase
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      name: data.name,
      phone: data.phone,
      user_type: data.user_type
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { user } = req;
    const { name, phone, user_type } = req.body;
    
    // Validate input
    if (!name && !phone && !user_type) {
      return res.status(400).json({ message: 'At least one field is required' });
    }
    
    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (user_type) updateData.user_type = user_type;
    
    // Update profile in Supabase
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      name: data.name,
      phone: data.phone,
      user_type: data.user_type
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};