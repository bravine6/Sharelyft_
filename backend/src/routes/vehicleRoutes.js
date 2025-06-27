const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/vehicles - Get all vehicles for authenticated driver
router.get('/', vehicleController.getDriverVehicles);

// GET /api/vehicles/options - Get vehicle options for ride posting
router.get('/options', vehicleController.getVehicleOptions);

// GET /api/vehicles/:id - Get specific vehicle
router.get('/:id', vehicleController.getVehicle);

// POST /api/vehicles - Add new vehicle
router.post('/', vehicleController.addVehicle);

// PUT /api/vehicles/:id - Update vehicle
router.put('/:id', vehicleController.updateVehicle);

// PUT /api/vehicles/:id/default - Set vehicle as default
router.put('/:id/default', vehicleController.setDefaultVehicle);

// DELETE /api/vehicles/:id - Delete/deactivate vehicle
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;