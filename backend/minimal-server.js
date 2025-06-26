require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.json({ message: 'ShareLyft API - Minimal Server', timestamp: new Date().toISOString() });
});

// Test payment methods endpoint
app.get('/api/payment-methods', (req, res) => {
  console.log('Payment methods endpoint hit');
  res.json([]);
});

app.post('/api/payment-methods', (req, res) => {
  console.log('Add payment method endpoint hit', req.body);
  res.json({
    message: 'Payment method added successfully',
    payment_method: {
      id: `temp_${Date.now()}`,
      type: 'mpesa',
      name: 'M-Pesa',
      phone_number: req.body.details?.phone_number,
      is_verified: true,
      is_default: true
    }
  });
});

// Test ride posting with payment
app.post('/api/rides', (req, res) => {
  console.log('Create ride endpoint hit', req.body);
  res.json({
    message: 'Ride created successfully',
    ride: {
      id: `ride_${Date.now()}`,
      status: req.body.status || 'active',
      ...req.body
    }
  });
});

app.post('/api/rides/:id/pay-posting-fee', (req, res) => {
  console.log('Pay posting fee endpoint hit', req.params.id, req.body);
  res.json({
    message: 'Payment processed successfully',
    transaction_id: `TXN_${Date.now()}`,
    ride_id: req.params.id,
    status: 'completed'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🌟 ShareLyft Minimal API running on port ${PORT}`);
  console.log(`📍 API available at http://localhost:${PORT}`);
});