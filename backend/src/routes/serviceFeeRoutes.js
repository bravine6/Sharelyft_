const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const serviceFeeController = require('../controllers/serviceFeeController');

// M-Pesa payment removed — Paystack is now the single payment provider.
// Connection-fee payments are initiated via POST /api/paystack/initiate with
// purpose='connection_fee'. The endpoints below remain for status/history.

// Get connection unlock status for a ride request
router.get('/connection-status/:ride_request_id', auth, serviceFeeController.getConnectionStatus);

// Get contact information (only if unlocked)
router.get('/contact-info/:ride_request_id', auth, serviceFeeController.getContactInformation);

// Get service fee payment history for current user
router.get('/history', auth, serviceFeeController.getServiceFeeHistory);

module.exports = router;