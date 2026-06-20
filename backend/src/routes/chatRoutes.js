const express = require('express');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply authentication middleware to all chat routes
router.use(authMiddleware);

// Get all conversations for the authenticated user
router.get('/conversations', chatController.getUserConversations);

// Get or create a conversation for a specific ride
router.post('/conversations/ride/:ride_id', chatController.getOrCreateConversation);

// Get messages for a specific conversation
router.get('/conversations/:conversation_id/messages', chatController.getConversationMessages);

// Send a message in a conversation
router.post('/conversations/:conversation_id/messages', chatController.sendMessage);

// Pay for contact sharing — removed. Paystack is now the single payment
// provider. Use POST /api/paystack/initiate with purpose='connection_fee'.

// Get payment status for a conversation
router.get('/conversations/:conversation_id/payment/status', chatController.getPaymentStatus);

module.exports = router;