const express = require('express');
const paymentController = require('../controllers/paymentController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

// Get available payment methods
router.get('/methods', auth, paymentController.getPaymentMethods);

// Initiate service fee payment with multiple options
router.post('/service-fee/pay', auth, paymentController.initiateServiceFeePayment);

// Test endpoint
router.get('/test', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Payment service test endpoint',
      available_methods: ['stripe', 'mpesa', 'pesalink'],
      user: {
        id: req.user.id,
        email: req.user.email
      },
      environment: {
        stripe_configured: !!process.env.STRIPE_SECRET_KEY,
        mpesa_configured: !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET),
        pesalink_configured: !!(process.env.PESALINK_API_KEY && process.env.PESALINK_MERCHANT_ID)
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