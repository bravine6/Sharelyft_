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
    
    // Register with Supabase Auth (don't auto-confirm email)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false // Require email verification
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

// Verify email address
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }
    
    // Find user with this token
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email_verification_token', token)
      .single();
    
    if (error || !profile) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
    
    // Check if token is expired
    if (new Date() > new Date(profile.email_verification_expires)) {
      return res.status(400).json({ message: 'Verification token has expired' });
    }
    
    // Update user profile - mark email as verified
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
    
    // Confirm email in Supabase Auth
    await supabase.auth.admin.updateUserById(profile.user_id, {
      email_confirm: true
    });
    
    // Send welcome email if both email and phone are verified
    if (profile.phone_verified) {
      await emailService.sendWelcomeEmail(profile.email, profile.name);
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
    
    // Update profile with new token
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        email_verification_token: emailVerificationToken,
        email_verification_expires: emailVerificationExpires.toISOString()
      })
      .eq('user_id', profile.user_id);
    
    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }
    
    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${emailVerificationToken}`;
    await emailService.sendEmailVerificationEmail(email, emailVerificationToken, verificationUrl);
    
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
    
    // Allow login but include verification status
    // Users can access dashboard but with limited functionality until verified
    
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
      first_name: profile.first_name,
      national_id: profile.national_id,
      date_of_birth: profile.date_of_birth,
      gender: profile.gender,
      phone: profile.phone,
      user_type: profile.user_type,
      email_verified: profile.email_verified,
      phone_verified: profile.phone_verified
    };
    
    res.json({ user: userData, token });
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