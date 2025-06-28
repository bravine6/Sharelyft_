const express = require('express');
const rideController = require('../controllers/rideController');
const auth = require('../middlewares/authMiddleware');
const { requireFullVerification, addVerificationStatus } = require('../middleware/verificationMiddleware');

const router = express.Router();

// All ride routes are protected by authentication
router.use(auth);

// Ride routes requiring full verification (email + phone)
router.post('/', requireFullVerification, rideController.createRide);
router.post('/:id/request', requireFullVerification, (req, res, next) => {
  console.log('POST /:id/request hit with params:', req.params);
  console.log('Request body:', req.body);
  next();
}, rideController.requestRide);
router.put('/:id/requests/:requestId', requireFullVerification, rideController.respondToRequest);
router.put('/:id', requireFullVerification, rideController.updateRide);
router.delete('/:id', requireFullVerification, rideController.deleteRide);

// Ride viewing routes (read-only, less restrictive) with verification status added
router.get('/', addVerificationStatus, rideController.getAllRides);
router.get('/available', addVerificationStatus, rideController.getAvailableRides);
router.get('/search', addVerificationStatus, rideController.searchRides);
router.get('/statistics', addVerificationStatus, rideController.getRideStatistics);
router.get('/activity', addVerificationStatus, rideController.getRecentActivity);
router.get('/my-requests', addVerificationStatus, rideController.getUserRideRequests);
router.get('/requests/:requestId', addVerificationStatus, rideController.getRideRequestDetails);
router.get('/:id', addVerificationStatus, rideController.getRideById);
router.get('/:id/requests', addVerificationStatus, rideController.getRideRequests);

module.exports = router;