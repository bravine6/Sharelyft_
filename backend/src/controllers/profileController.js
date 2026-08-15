const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { normalizePhone } = require('../utils/phone');

// Get PUBLIC profile — sanitized view of another user's profile.
// Returns only what's safe to show a stranger; excludes email, phone,
// national_id, DOB, gender, emergency contact, verification codes, etc.
exports.getPublicProfile = async (req, res) => {
  try {
    const { profileId } = req.params;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, profile_photo, bio, user_type, email_verified, phone_verified, verification_status, created_at')
      .eq('id', profileId)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // If driver, also include a count of verified documents (for the trust badge)
    let verifiedDocumentsCount = null;
    if (data.user_type === 'driver') {
      const { count } = await supabase
        .from('driver_verification_documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('status', 'verified');
      verifiedDocumentsCount = count || 0;
    }

    res.json({
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: [data.first_name, data.last_name].filter(Boolean).join(' '),
      profile_photo: data.profile_photo,
      bio: data.bio,
      user_type: data.user_type,
      email_verified: !!data.email_verified,
      phone_verified: !!data.phone_verified,
      verification_status: data.verification_status,
      member_since: data.created_at,
      driver_documents_verified: verifiedDocumentsCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const { user } = req;
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
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
    const {
      first_name,
      last_name,
      phone,
      user_type,
      national_id,
      date_of_birth,
      gender,
      bio,
    } = req.body;
    // Emergency contacts intentionally NOT accepted here — they live in a
    // separate protected table (user_emergency_contacts) with a dedicated
    // endpoint. Sending them via this route is silently ignored.

    if (!first_name || !phone) {
      return res.status(400).json({ message: 'First name and phone are required' });
    }

    if (user_type && !['passenger', 'driver'].includes(user_type)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    // Normalize both sides so format differences (+254 713 432 225 vs
    // +254713432225 vs 0713432225) don't create false phone-changed positives
    // or bypass the uniqueness check.
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || !/^\+?\d{10,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }
    const normalizedUserPhone = normalizePhone(user.phone);
    const phoneChanged = normalizedPhone !== normalizedUserPhone;

    if (phoneChanged) {
      const { data: existingUsers } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .neq('id', user.id);

      if (existingUsers && existingUsers.length > 0) {
        return res.status(400).json({
          message: 'This phone number is already registered to another account.',
          error: 'PHONE_ALREADY_IN_USE'
        });
      }
    }

    const updateData = {
      first_name,
      phone: normalizedPhone,
      user_type: user_type || user.user_type,
      updated_at: new Date().toISOString()
    };

    // If phone changed, the new number is UNVERIFIED. Reset the flag and clear
    // any stale verification code so the user must re-verify from /profile.
    if (phoneChanged) {
      updateData.phone_verified = false;
      updateData.phone_verification_code = null;
      updateData.phone_verification_expires = null;
      updateData.uses_twilio_verify = null;
    }

    // Freely-editable optional fields
    if (last_name !== undefined) updateData.last_name = last_name || null;
    if (bio !== undefined) {
      if (bio && bio.length > 300) {
        return res.status(400).json({ message: 'Bio must be 300 characters or fewer' });
      }
      updateData.bio = bio || null;
    }
    // emergency contact fields removed — handled by separate endpoint

    // First-time-fillable identity fields: only accept when currently null in DB
    if (national_id) {
      if (user.national_id) {
        return res.status(400).json({ message: 'National ID cannot be changed once set' });
      }
      if (!/^\d{7,8}$/.test(national_id)) {
        return res.status(400).json({ message: 'National ID must be 7-8 digits' });
      }
      updateData.national_id = national_id;
    }

    if (date_of_birth) {
      if (user.date_of_birth) {
        return res.status(400).json({ message: 'Date of birth cannot be changed once set' });
      }
      const birthDate = new Date(date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age < 18) {
        return res.status(400).json({ message: 'You must be at least 18 years old' });
      }
      updateData.date_of_birth = date_of_birth;
    }

    if (gender) {
      if (user.gender) {
        return res.status(400).json({ message: 'Gender cannot be changed once set' });
      }
      if (!['male', 'female', 'other'].includes(gender)) {
        return res.status(400).json({ message: 'Invalid gender' });
      }
      updateData.gender = gender;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[updateProfile] Supabase update error:', error);
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
    console.log('[DEBUG] uploadProfilePhoto method started', {
      userId: req.user?.id,
      hasFile: !!req.file,
      timestamp: new Date().toISOString()
    });
    
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
    
    console.log('[DEBUG] File validation passed', {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      userId: user.id
    });
    
    // Upload to Supabase Storage
    const fileName = `profile-photos/${user.id}/${Date.now()}-${req.file.originalname}`;
    
    // Ensure the storage bucket exists
    const bucketName = 'user-uploads';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log('[DEBUG] Creating user-uploads bucket...');
      const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (bucketError) {
        console.error('[DEBUG] Failed to create bucket:', bucketError);
        return res.status(500).json({ message: 'Storage configuration error', error: bucketError.message });
      }
    }
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });
    
    if (uploadError) {
      console.error('[DEBUG] Supabase upload error:', uploadError);
      return res.status(400).json({ 
        message: 'Failed to upload image', 
        error: uploadError.message,
        details: uploadError
      });
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    // Update profile with photo URL
    console.log('[DEBUG] About to update profile with photo URL:', {
      userId: user.id,
      publicUrl: publicUrl
    });
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        profile_photo: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('[DEBUG] Database update error:', error);
      return res.status(400).json({ 
        message: 'Failed to update profile', 
        error: error.message,
        details: error
      });
    }
    
    console.log('[DEBUG] About to send success response', {
      userId: user.id,
      photoUrl: publicUrl,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: 'Profile photo uploaded successfully',
      photo_url: publicUrl
    });
    
    console.log('[DEBUG] Success response sent', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log('[DEBUG] uploadProfilePhoto error caught', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
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
      .eq('id', user.id)
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
      .eq('id', user.id);
    
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
    
    // Build update payload, dropping undefined keys so we don't null-out
    // fields the caller didn't intend to touch (e.g. saving notifications
    // shouldn't wipe privacy settings, and vice versa).
    const payload = {
      email_notifications,
      sms_notifications,
      push_notifications,
      ride_reminders,
      marketing_emails,
      profile_visibility,
      contact_sharing,
      updated_at: new Date().toISOString()
    };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    // Look up existing row first so we can update OR insert.
    const { data: existing, error: lookupError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (lookupError) {
      return res.status(400).json({ message: lookupError.message });
    }

    let data, error;
    if (existing) {
      ({ data, error } = await supabase
        .from('user_settings')
        .update(payload)
        .eq('user_id', user.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          email_notifications: email_notifications ?? true,
          sms_notifications: sms_notifications ?? true,
          push_notifications: push_notifications ?? true,
          ride_reminders: ride_reminders ?? true,
          marketing_emails: marketing_emails ?? false,
          profile_visibility: profile_visibility ?? 'public',
          contact_sharing: contact_sharing ?? 'verified_users',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single());
    }

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
    
    // First verify the current password by trying to sign in
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current_password
    });
    
    if (signInError) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password using Supabase auth admin API
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.user_id, // Use the auth.users ID
      { password: new_password }
    );
    
    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(400).json({ message: 'Failed to update password' });
    }
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message });
  }
};