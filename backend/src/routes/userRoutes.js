const express = require('express');
const userController = require('../controllers/userController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

// Admin routes (protected)
router.get('/', auth, userController.getAllUsers);
router.get('/:id', auth, userController.getUserById);
router.delete('/:id', auth, userController.deleteUser);

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'User routes working!' });
});

module.exports = router;