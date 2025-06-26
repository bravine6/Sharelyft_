const express = require('express');
const router = express.Router();
const paymentMethodsController = require('../controllers/paymentMethodsController');
const authMiddleware = require('../middleware/authMiddleware');

// Payment methods routes
router.get('/', authMiddleware, paymentMethodsController.getPaymentMethods);
router.post('/', authMiddleware, paymentMethodsController.addPaymentMethod);
router.put('/:id/default', authMiddleware, paymentMethodsController.setDefaultPaymentMethod);
router.delete('/:id', authMiddleware, paymentMethodsController.deletePaymentMethod);
router.post('/:id/verify', authMiddleware, paymentMethodsController.verifyPaymentMethod);

module.exports = router;