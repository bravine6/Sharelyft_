const express = require('express');
const locationController = require('../controllers/locationController');

const router = express.Router();

// Get all counties
router.get('/counties', locationController.getCounties);

// Get all towns
router.get('/towns', locationController.getTowns);

// Get towns by county
router.get('/counties/:countyId/towns', locationController.getTownsByCounty);

// Get counties with their towns
router.get('/counties-with-towns', locationController.getCountiesWithTowns);

module.exports = router;