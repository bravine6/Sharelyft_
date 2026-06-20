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
      available_methods: ['paystack', 'stripe', 'pesalink'],
      user: {
        id: req.user.id,
        email: req.user.email
      },
      environment: {
        paystack_configured: !!process.env.PAYSTACK_SECRET_KEY,
        stripe_configured: !!process.env.STRIPE_SECRET_KEY,
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