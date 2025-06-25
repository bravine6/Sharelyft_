const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const serviceFeeController = require('../controllers/serviceFeeController');

// Pay service fee (KSh 50 for driver or passenger)
router.post('/pay', auth, serviceFeeController.payServiceFee);

// Get connection unlock status for a ride request
router.get('/connection-status/:ride_request_id', auth, serviceFeeController.getConnectionStatus);

// Get contact information (only if unlocked)
router.get('/contact-info/:ride_request_id', auth, serviceFeeController.getContactInformation);

// Get service fee payment history for current user
router.get('/history', auth, serviceFeeController.getServiceFeeHistory);

module.exports = router;