const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const emergencyContactController = require('../controllers/emergencyContactController');

// Both endpoints require authentication. Emergency contacts belong to a single
// owner — only that owner may read or write. Enforced here (authMiddleware) and
// again in the table's RLS policy as defense-in-depth.
router.get('/', authMiddleware, emergencyContactController.getEmergencyContact);
router.put('/', authMiddleware, emergencyContactController.upsertEmergencyContact);

module.exports = router;
