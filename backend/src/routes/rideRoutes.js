const express = require('express');
const rideController = require('../controllers/rideController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

// All ride routes are protected by authentication
router.use(auth);

// Ride routes
router.post('/', rideController.createRide);
router.get('/', rideController.getAllRides);
router.get('/available', rideController.getAvailableRides);
router.get('/search', rideController.searchRides);
router.get('/statistics', rideController.getRideStatistics);
router.get('/activity', rideController.getRecentActivity);
router.get('/my-requests', rideController.getUserRideRequests);
router.get('/:id', rideController.getRideById);
router.get('/:id/requests', rideController.getRideRequests);
router.put('/:id', rideController.updateRide);
router.delete('/:id', rideController.deleteRide);

// Ride request routes
router.post('/:id/request', (req, res, next) => {
  console.log('POST /:id/request hit with params:', req.params);
  console.log('Request body:', req.body);
  next();
}, rideController.requestRide);
router.put('/:id/requests/:requestId', rideController.respondToRequest);

module.exports = router;