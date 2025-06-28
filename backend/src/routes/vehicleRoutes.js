const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middlewares/authMiddleware');
const { requireFullVerification, addVerificationStatus } = require('../middleware/verificationMiddleware');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Vehicle management routes requiring full verification
router.post('/', requireFullVerification, vehicleController.addVehicle);
router.put('/:id', requireFullVerification, vehicleController.updateVehicle);
router.put('/:id/default', requireFullVerification, vehicleController.setDefaultVehicle);
router.delete('/:id', requireFullVerification, vehicleController.deleteVehicle);

// Vehicle viewing routes with verification status
router.get('/', addVerificationStatus, vehicleController.getDriverVehicles);
router.get('/options', addVerificationStatus, vehicleController.getVehicleOptions);
router.get('/:id', addVerificationStatus, vehicleController.getVehicle);

module.exports = router;