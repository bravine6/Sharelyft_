const express = require('express');
const router = express.Router();
const ridePaymentController = require('../controllers/ridePaymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Ride payment routes
router.post('/:id/pay-posting-fee', authMiddleware, ridePaymentController.payRidePostingFee);
router.get('/payments', authMiddleware, ridePaymentController.getRidePayments);
router.get('/payment-stats', authMiddleware, ridePaymentController.getPaymentStats);

module.exports = router;