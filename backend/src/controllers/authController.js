const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { 
      email, 
      password, 
      first_name, 
      national_id, 
      date_of_birth, 
      gender, 
      phone, 
      user_type = 'passenger' 
    } = req.body;
    
    // Input validation
    const missingFields = [];
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!first_name) missingFields.push('first_name');
    if (!national_id) missingFields.push('national_id');
    if (!date_of_birth) missingFields.push('date_of_birth');
    if (!gender) missingFields.push('gender');
    if (!phone) missingFields.push('phone');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missing_fields: missingFields
      });
    }
    
    // Validate user type
    if (!['admin', 'driver', 'passenger'].includes(user_type)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    // Validate gender
    if (!['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ message: 'Invalid gender' });
    }

    // Validate National ID (basic validation)
    if (national_id.length < 7 || national_id.length > 8 || !/^\d+$/.test(national_id)) {
      return res.status(400).json({ message: 'National ID must be 7-8 digits' });
    }

    // Validate age (must be 18+)
    const birthDate = new Date(date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return res.status(400).json({ message: 'You must be at least 18 years old to register' });
    }

    // Check if email or national ID already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('email, national_id')
      .or(`email.eq.${email},national_id.eq.${national_id}`)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing user:', checkError);
    } else if (existingUser && existingUser.length > 0) {
      if (existingUser[0].email === email) {
        return res.status(400).json({ message: 'Email address is already registered' });
      }
      if (existingUser[0].national_id === national_id) {
        return res.status(400).json({ message: 'National ID is already registered' });
      }
    }
    
    // Register with Supabase Auth (confirm for auth but use our own verification)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Allow login, but we control verification with our own flag
    });
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Generate phone verification code
    const phoneVerificationCode = smsService.generateVerificationCode();
    const phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Create user profile with verification tokens
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        { 
          user_id: data.user.id, 
          first_name,
          national_id,
          date_of_birth,
          gender,
          phone, 
          email, 
          user_type,
          name: first_name, // Keep name field for backward compatibility
          email_verified: false,
          phone_verified: false,
          email_verification_token: emailVerificationToken,
          email_verification_expires: emailVerificationExpires.toISOString(),
          phone_verification_code: phoneVerificationCode,
          phone_verification_expires: phoneVerificationExpires.toISOString()
        }
      ]);
    
    if (profileError) {
      // If profile creation fails, delete the auth user
      await supabase.auth.admin.deleteUser(data.user.id);
      return res.status(400).json({ message: profileError.message });
    }
    
    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${emailVerificationToken}`;
    await emailService.sendEmailVerificationEmail(email, emailVerificationToken, verificationUrl);
    
    // Skip SMS verification for now - allow users to verify later
    console.log(`[DEV] Phone verification code for ${phone}: ${phoneVerificationCode}`);
    
    res.status(201).json({ 
      message: 'User registered successfully. Please check your email for verification. You can verify your phone number later from your profile.',
      email_sent: true,
      phone_verification_code: phoneVerificationCode // For development only
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify email address. Idempotent: a token that's been consumed already
// (because the user clicked the link twice) returns success, not error.
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // maybeSingle so "no rows" isn't an error — we treat it as "already used."
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email_verification_token', token)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    if (!profile) {
      // Token was either already consumed (success path) or never existed.
      // Return success so the user isn't confused by a refresh/double-click.
      return res.json({ message: 'Email already verified or link already used. You can log in.' });
    }

    if (new Date() > new Date(profile.email_verification_expires)) {
      return res.status(400).json({
        message: 'Verification link expired. Please request a new one.',
        error: 'TOKEN_EXPIRED'
      });
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null
      })
      .eq('user_id', profile.user_id);

    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }

    // Confirm email in Supabase Auth (best-effort — don't fail the verify if this errors)
    try {
      await supabase.auth.admin.updateUserById(profile.user_id, { email_confirm: true });
    } catch (e) {
      console.warn('[verifyEmail] supabase auth confirm failed (non-fatal):', e.message);
    }

    if (profile.phone_verified) {
      try {
        await emailService.sendWelcomeEmail(profile.email, profile.first_name || profile.name);
      } catch (e) {
        console.warn('[verifyEmail] welcome email failed (non-fatal):', e.message);
      }
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify phone number
exports.verifyPhone = async (req, res) => {
  try {
    const { phone, code } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({ message: 'Phone number and verification code are required' });
    }
    
    // Find user profile by phone
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error || !profile) {
      return res.status(400).json({ message: 'Phone number not found' });
    }

    if (profile.phone_verified) {
      return res.status(400).json({ message: 'Phone number is already verified' });
    }
    
    let verificationSuccess = false;
    
    // Try Twilio Verify first if the profile uses it
    if (profile.uses_twilio_verify) {
      const twilioResult = await smsService.verifyPhoneCode(phone, code);
      if (twilioResult) {
        verificationSuccess = twilioResult.success;
        if (!verificationSuccess) {
          return res.status(400).json({ 
            message: 'Invalid verification code',
            details: twilioResult.error 
          });
        }
      }
    }
    
    // Fallback to custom verification code if not using Twilio Verify
    if (!verificationSuccess && !profile.uses_twilio_verify) {
      if (!profile.phone_verification_code || profile.phone_verification_code !== code) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }
      
      // Check if code is expired
      if (profile.phone_verification_expires && new Date() > new Date(profile.phone_verification_expires)) {
        return res.status(400).json({ message: 'Verification code has expired' });
      }
      
      verificationSuccess = true;
    }
    
    if (!verificationSuccess) {
      return res.status(400).json({ message: 'Verification failed' });
    }
    
    // Update user profile - mark phone as verified
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        phone_verified: true,
        phone_verification_code: null,
        phone_verification_expires: null,
        uses_twilio_verify: null // Clear the flag
      })
      .eq('user_id', profile.user_id);
    
    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }
    
    // Send welcome SMS and email if both are verified
    if (profile.email_verified) {
      await smsService.sendWelcomeSMS(profile.phone, profile.first_name || profile.name);
      await emailService.sendWelcomeEmail(profile.email, profile.first_name || profile.name);
    }
    
    res.json({ message: 'Phone number verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend email verification
exports.resendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !profile) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (profile.email_verified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }
    
    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Send the email FIRST. Only commit the token rotation to the DB if the
    // email actually goes out. Otherwise we'd invalidate any prior link the
    // user already has, but leave them with no new one — locking them out.
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${emailVerificationToken}`;

    try {
      await emailService.sendEmailVerificationEmail(email, emailVerificationToken, verificationUrl);
    } catch (mailErr) {
      console.error('Failed to send verification email:', mailErr);
      return res.status(500).json({
        message: 'Could not send verification email. Please try again shortly.',
        error: 'EMAIL_SEND_FAILED'
      });
    }

    // Email went out — now safe to rotate the token in DB
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        email_verification_token: emailVerificationToken,
        email_verification_expires: emailVerificationExpires.toISOString()
      })
      .eq('user_id', profile.user_id);

    if (updateError) {
      // Edge case: email sent but DB write failed. The user got a fresh email
      // but DB still has the old token, so the new link won't work. Log loudly.
      console.error('[resendEmailVerification] Email sent but DB token update failed:', updateError);
      return res.status(500).json({ message: 'Verification email sent but state update failed. Please try again.' });
    }

    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend phone verification
exports.resendPhoneVerification = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    
    // Find user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error || !profile) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (profile.phone_verified) {
      return res.status(400).json({ message: 'Phone number is already verified' });
    }
    
    // Generate new verification code
    const phoneVerificationCode = smsService.generateVerificationCode();
    const phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    
    // Update profile with new code
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        phone_verification_code: phoneVerificationCode,
        phone_verification_expires: phoneVerificationExpires.toISOString()
      })
      .eq('user_id', profile.user_id);
    
    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }
    
    // Send verification SMS
    const smsResult = await smsService.sendVerificationCode(phone, phoneVerificationCode);
    
    // If using Twilio Verify, clear custom code and set flag
    if (smsResult.usesTwilioVerify) {
      await supabase
        .from('user_profiles')
        .update({
          phone_verification_code: null,
          phone_verification_expires: null,
          uses_twilio_verify: true
        })
        .eq('user_id', profile.user_id);
    }
    
    res.json({ message: 'Verification code sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot password - send reset email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !profile) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If the email exists, a password reset link has been sent' });
    }
    
    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Update profile with reset token
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires.toISOString()
      })
      .eq('user_id', profile.user_id);
    
    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }
    
    // Send password reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    await emailService.sendPasswordResetEmail(email, resetToken, resetUrl);
    
    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Find user with this token
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('password_reset_token', token)
      .single();
    
    if (error || !profile) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Check if token is expired
    if (new Date() > new Date(profile.password_reset_expires)) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }
    
    // Update password in Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(profile.user_id, {
      password: newPassword
    });
    
    if (authError) {
      return res.status(400).json({ message: authError.message });
    }
    
    // Clear reset token from profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        password_reset_token: null,
        password_reset_expires: null
      })
      .eq('user_id', profile.user_id);
    
    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user (updated to check verification status)
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
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    
    if (profileError || !profile) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    
    // Email verification is NOT a login gate. Unverified users get in but
    // see a banner prompting them to verify (or resend the verification email).
    // The returned `email_verified` flag drives that UI.

    // Create JWT token
    const token = jwt.sign(
      { id: data.user.id, email: data.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user data with profile information and verification requirements
    const userData = {
      id: data.user.id,
      email: data.user.email,
      first_name: profile.first_name,
      national_id: profile.national_id,
      date_of_birth: profile.date_of_birth,
      gender: profile.gender,
      phone: profile.phone,
      user_type: profile.user_type,
      email_verified: profile.email_verified,
      phone_verified: profile.phone_verified,
      requires_phone_verification: !profile.phone_verified
    };
    
    res.json({ 
      user: userData, 
      token,
      message: !profile.phone_verified ? 'Please verify your phone number to access all features' : 'Login successful'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user profile (from userController.js)
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
      first_name: data.first_name,
      national_id: data.national_id,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      phone: data.phone,
      user_type: data.user_type,
      email_verified: data.email_verified,
      phone_verified: data.phone_verified
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user verification status
exports.getVerificationStatus = async (req, res) => {
  try {
    const { user } = req;
    
    // Get verification status from Supabase
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email_verified, phone_verified, email, phone')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    res.json({
      email_verified: data.email_verified,
      phone_verified: data.phone_verified,
      fully_verified: data.email_verified && data.phone_verified,
      email: data.email,
      phone: data.phone,
      required_verifications: {
        email: !data.email_verified,
        phone: !data.phone_verified
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile (from userController.js)
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
    if (phone) {
      updateData.phone = phone;
      // If phone is updated, require re-verification
      updateData.phone_verified = false;
      updateData.phone_verification_code = smsService.generateVerificationCode();
      updateData.phone_verification_expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    }
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
    
    // If phone was updated, send verification SMS
    if (phone) {
      await smsService.sendVerificationCode(phone, updateData.phone_verification_code);
    }
    
    res.json({
      id: user.id,
      email: user.email,
      name: data.name,
      phone: data.phone,
      user_type: data.user_type,
      email_verified: data.email_verified,
      phone_verified: data.phone_verified,
      phone_verification_sent: !!phone
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Google OAuth authentication
exports.googleAuth = async (req, res) => {
  try {
    const { googleUser, accessToken } = req.body;
    
    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ message: 'Invalid Google user data' });
    }
    
    // Check if user already exists
    let { data: existingProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', googleUser.email)
      .single();
    
    let authUserId = googleUser.id;
    let userProfile;
    
    if (profileError && profileError.code === 'PGRST116') {
      // User doesn't exist, create new user
      console.log('Creating new Google user:', googleUser.email);
      
      // Create profile in user_profiles table
      const newProfile = {
        user_id: authUserId,
        email: googleUser.email,
        first_name: googleUser.name || googleUser.email.split('@')[0],
        email_verified: true, // Google accounts are pre-verified
        phone_verified: false,
        user_type: 'passenger', // Default to passenger
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Store Google info
        google_id: googleUser.id,
        profile_photo: googleUser.picture
      };
      
      const { data: createdProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert(newProfile)
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating Google user profile:', createError);
        return res.status(500).json({ message: 'Failed to create user profile' });
      }
      
      userProfile = createdProfile;
    } else if (profileError) {
      console.error('Error checking existing user:', profileError);
      return res.status(500).json({ message: 'Database error' });
    } else {
      // User exists, update Google info if needed
      console.log('Existing Google user found:', googleUser.email);
      
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      // Update Google ID and photo if not set
      if (!existingProfile.google_id) {
        updateData.google_id = googleUser.id;
      }
      if (!existingProfile.profile_photo && googleUser.picture) {
        updateData.profile_photo = googleUser.picture;
      }
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', existingProfile.user_id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating Google user profile:', updateError);
        return res.status(500).json({ message: 'Failed to update user profile' });
      }
      
      userProfile = updatedProfile;
      authUserId = existingProfile.user_id;
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: authUserId, email: googleUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user data
    const userData = {
      id: authUserId,
      email: userProfile.email,
      first_name: userProfile.first_name,
      national_id: userProfile.national_id,
      date_of_birth: userProfile.date_of_birth,
      gender: userProfile.gender,
      phone: userProfile.phone,
      user_type: userProfile.user_type,
      email_verified: userProfile.email_verified,
      phone_verified: userProfile.phone_verified,
      profile_photo: userProfile.profile_photo,
      google_id: userProfile.google_id
    };
    
    res.json({
      user: userData,
      token,
      message: 'Google authentication successful'
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Google OAuth login initiation
exports.googleLogin = async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.API_URL || 'http://localhost:5000'}/auth/google/callback`
      }
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // Redirect to Google OAuth
    res.redirect(data.url);
  } catch (error) {
    console.error('Google login initiation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Google OAuth callback handler
exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send(`
        <script>
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: 'No authorization code received'
          }, '*');
          window.close();
        </script>
      `);
    }

    // Exchange code for session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error || !session?.user) {
      return res.status(400).send(`
        <script>
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: 'Failed to get user session'
          }, '*');
          window.close();
        </script>
      `);
    }

    const googleUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
      picture: session.user.user_metadata?.avatar_url,
      provider: 'google'
    };

    // Use existing googleAuth logic to create/sync user
    const userData = await handleGoogleUser(googleUser);
    
    // Send success message to parent window
    res.send(`
      <script>
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          token: '${userData.token}',
          user: ${JSON.stringify(userData.user)}
        }, '*');
        window.close();
      </script>
    `);

  } catch (error) {
    console.error('Google callback error:', error);
    res.status(500).send(`
      <script>
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'Authentication failed'
        }, '*');
        window.close();
      </script>
    `);
  }
};

// Helper function to handle Google user creation/sync
async function handleGoogleUser(googleUser) {
  // Check if user already exists
  let { data: existingProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', googleUser.email)
    .single();
  
  let authUserId = googleUser.id;
  let userProfile;
  
  if (profileError && profileError.code === 'PGRST116') {
    // User doesn't exist, create new user
    const newProfile = {
      user_id: authUserId,
      email: googleUser.email,
      first_name: googleUser.name || googleUser.email.split('@')[0],
      email_verified: true,
      phone_verified: false,
      user_type: 'passenger',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      google_id: googleUser.id,
      profile_photo: googleUser.picture
    };
    
    const { data: createdProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert(newProfile)
      .select()
      .single();
    
    if (createError) {
      throw new Error('Failed to create user profile');
    }
    
    userProfile = createdProfile;
  } else if (profileError) {
    throw new Error('Database error');
  } else {
    // User exists, update Google info if needed
    const updateData = { updated_at: new Date().toISOString() };
    
    if (!existingProfile.google_id) {
      updateData.google_id = googleUser.id;
    }
    if (!existingProfile.profile_photo && googleUser.picture) {
      updateData.profile_photo = googleUser.picture;
    }
    
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', existingProfile.user_id)
      .select()
      .single();
    
    if (updateError) {
      throw new Error('Failed to update user profile');
    }
    
    userProfile = updatedProfile;
    authUserId = existingProfile.user_id;
  }
  
  // Create JWT token
  const token = jwt.sign(
    { id: authUserId, email: googleUser.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  // Return user data
  const userData = {
    id: authUserId,
    email: userProfile.email,
    first_name: userProfile.first_name,
    national_id: userProfile.national_id,
    date_of_birth: userProfile.date_of_birth,
    gender: userProfile.gender,
    phone: userProfile.phone,
    user_type: userProfile.user_type,
    email_verified: userProfile.email_verified,
    phone_verified: userProfile.phone_verified,
    profile_photo: userProfile.profile_photo,
    google_id: userProfile.google_id
  };
  
  return { user: userData, token };
}