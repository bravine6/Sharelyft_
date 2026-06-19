const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// All admin routes require authentication and admin permissions
router.use(authMiddleware);

// Special route to make a user admin (for testing - remove in production)
router.post('/make-admin', async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await require('../config/supabase')
      .from('user_profiles')
      .update({ admin_permissions: true })
      .eq('id', userId);
    
    if (error) throw error;
    
    res.json({ success: true, message: 'User granted admin permissions' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.use(adminMiddleware);

// Dashboard Overview
router.get('/dashboard', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.patch('/users/:userId/verify', adminController.verifyUser);

// Ride Management
router.get('/rides', adminController.getAllRides);
router.get('/rides/:rideId', adminController.getRideDetails);
router.patch('/rides/:rideId/status', adminController.updateRideStatus);

// Payment Management
router.get('/payments', adminController.getAllPayments);
router.get('/payments/:paymentId', adminController.getPaymentDetails);
router.patch('/payments/:paymentId/refund', adminController.refundPayment);

// Driver Verification Management
router.get('/verifications', adminController.getAllVerifications);
router.patch('/verifications/:documentId/review', adminController.reviewDocument);

// Analytics
router.get('/analytics/users', adminController.getUserAnalytics);
router.get('/analytics/rides', adminController.getRideAnalytics);
router.get('/analytics/payments', adminController.getPaymentAnalytics);

module.exports = router;