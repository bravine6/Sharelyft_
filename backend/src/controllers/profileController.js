const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const { user } = req;
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    // Remove sensitive information
    delete data.password_hash;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { user } = req;
    const { first_name, phone, user_type } = req.body;
    
    // Validate required fields
    if (!first_name || !phone) {
      return res.status(400).json({ message: 'First name and phone are required' });
    }
    
    // Validate user type
    if (user_type && !['passenger', 'driver'].includes(user_type)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }
    
    // Check if phone number is already taken by another user
    if (phone !== user.phone) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('phone', phone)
        .neq('user_id', user.id)
        .single();
      
      if (existingUser) {
        return res.status(400).json({ message: 'Phone number already in use' });
      }
    }
    
    // Update profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        first_name,
        phone,
        user_type: user_type || user.user_type,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    // Remove sensitive information
    delete data.password_hash;
    
    res.json({
      message: 'Profile updated successfully',
      user: data
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload profile photo
exports.uploadProfilePhoto = async (req, res) => {
  try {
    const { user } = req;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // File validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' });
    }
    
    // File size validation (5MB max)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB' });
    }
    
    // Upload to Supabase Storage
    const fileName = `profile-photos/${user.id}/${Date.now()}-${req.file.originalname}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });
    
    if (uploadError) {
      return res.status(400).json({ message: 'Failed to upload image' });
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(fileName);
    
    // Update profile with photo URL
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        profile_photo: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: 'Failed to update profile' });
    }
    
    res.json({
      message: 'Profile photo uploaded successfully',
      photo_url: publicUrl
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete profile photo
exports.deleteProfilePhoto = async (req, res) => {
  try {
    const { user } = req;
    
    // Get current photo URL
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('profile_photo')
      .eq('user_id', user.id)
      .single();
    
    if (profile?.profile_photo) {
      // Extract file path from URL
      const url = new URL(profile.profile_photo);
      const filePath = url.pathname.split('/').slice(-2).join('/'); // Get last two parts
      
      // Delete from storage
      await supabase.storage
        .from('user-uploads')
        .remove([filePath]);
    }
    
    // Update profile to remove photo
    const { error } = await supabase
      .from('user_profiles')
      .update({
        profile_photo: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    if (error) {
      return res.status(400).json({ message: 'Failed to remove profile photo' });
    }
    
    res.json({ message: 'Profile photo removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user settings
exports.getSettings = async (req, res) => {
  try {
    const { user } = req;
    
    // Get user settings (create default if not exists)
    let { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Create default settings
      const defaultSettings = {
        user_id: user.id,
        email_notifications: true,
        sms_notifications: true,
        push_notifications: true,
        ride_reminders: true,
        marketing_emails: false,
        profile_visibility: 'public',
        contact_sharing: 'verified_users',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: newSettings, error: createError } = await supabase
        .from('user_settings')
        .insert(defaultSettings)
        .select()
        .single();
      
      if (createError) {
        return res.status(400).json({ message: 'Failed to create settings' });
      }
      
      settings = newSettings;
    } else if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user settings
exports.updateSettings = async (req, res) => {
  try {
    const { user } = req;
    const {
      email_notifications,
      sms_notifications,
      push_notifications,
      ride_reminders,
      marketing_emails,
      profile_visibility,
      contact_sharing
    } = req.body;
    
    // Validate settings
    const booleanFields = [
      'email_notifications',
      'sms_notifications', 
      'push_notifications',
      'ride_reminders',
      'marketing_emails'
    ];
    
    for (const field of booleanFields) {
      if (req.body[field] !== undefined && typeof req.body[field] !== 'boolean') {
        return res.status(400).json({ message: `${field} must be a boolean` });
      }
    }
    
    if (profile_visibility && !['public', 'private', 'verified_only'].includes(profile_visibility)) {
      return res.status(400).json({ message: 'Invalid profile visibility option' });
    }
    
    if (contact_sharing && !['everyone', 'verified_users', 'nobody'].includes(contact_sharing)) {
      return res.status(400).json({ message: 'Invalid contact sharing option' });
    }
    
    // Update settings
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        email_notifications,
        sms_notifications,
        push_notifications,
        ride_reminders,
        marketing_emails,
        profile_visibility,
        contact_sharing,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({
      message: 'Settings updated successfully',
      settings: data
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { user } = req;
    const { current_password, new_password } = req.body;
    
    // Validate required fields
    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Validate new password
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    
    // Get current password hash
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('password_hash')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, profile.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);
    
    // Update password in database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    if (updateError) {
      return res.status(400).json({ message: 'Failed to update password' });
    }
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};