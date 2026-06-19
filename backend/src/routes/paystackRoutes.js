const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const paystackController = require('../controllers/paystackController');

// Public webhook — must use raw body so we can verify the signature.
// Mount this BEFORE express.json() applies to the path.
router.post(
  '/webhook',
  express.raw({ type: '*/*' }),
  paystackController.webhook
);

// Authenticated endpoints
router.post('/initiate', auth, paystackController.initiate);
router.get('/verify/:reference', auth, paystackController.verify);

module.exports = router;
