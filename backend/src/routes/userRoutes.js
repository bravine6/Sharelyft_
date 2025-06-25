const express = require('express');
const userController = require('../controllers/userController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

// Auth routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected user routes
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);

module.exports = router;