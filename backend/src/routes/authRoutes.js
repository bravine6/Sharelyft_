const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware');

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/google/login', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);
router.post('/google', authController.googleAuth);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/verify-phone', auth, authController.verifyPhone);
router.post('/resend-email-verification', authController.resendEmailVerification);
router.post('/resend-phone-verification', auth, authController.resendPhoneVerification);

// Protected routes (authentication required)
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);
router.get('/verification-status', auth, authController.getVerificationStatus);

module.exports = router;