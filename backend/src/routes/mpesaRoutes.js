const express = require('express');
const mpesaController = require('../controllers/mpesaController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

// Protected routes (require authentication)
router.post('/service-fee/pay', auth, mpesaController.initiateServiceFeePayment);
router.get('/payment/:paymentId/status', auth, mpesaController.checkPaymentStatus);

// Public callback route (M-Pesa will call this)
router.post('/callback', mpesaController.handleCallback);

// Manual webhook endpoint for testing (can be used to simulate payment completion)
router.post('/webhook/mark-paid/:rideRequestId', auth, mpesaController.markBookingAsPaid);

// Test endpoint for M-Pesa configuration
router.get('/test', auth, async (req, res) => {
  try {
    const mpesaService = require('../services/mpesaService');
    
    // Test if M-Pesa service is properly configured
    const config = {
      consumerKey: !!process.env.MPESA_CONSUMER_KEY,
      consumerSecret: !!process.env.MPESA_CONSUMER_SECRET,
      shortCode: !!process.env.MPESA_SHORTCODE,
      passkey: !!process.env.MPESA_PASSKEY,
      environment: process.env.MPESA_ENVIRONMENT || 'sandbox'
    };
    
    res.json({
      success: true,
      message: 'M-Pesa service test',
      config: config,
      user: {
        id: req.user.id,
        email: req.user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;