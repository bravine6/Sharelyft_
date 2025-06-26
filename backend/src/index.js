const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const rideRoutes = require('./routes/rideRoutes');
const locationRoutes = require('./routes/locationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const paymentMethodsRoutes = require('./routes/paymentMethodsRoutes');
const ridePaymentRoutes = require('./routes/ridePaymentRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [/\.vercel\.app$/, 'https://sharelyft.com', 'https://www.sharelyft.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
})); // CORS handling
app.use(express.json()); // JSON body parsing
app.use(morgan('dev')); // Logging

// Add comprehensive request logging FIRST
app.use((req, res, next) => {
  const logMessage = `${new Date().toISOString()} - ${req.method} ${req.url} - From: ${req.ip}`;
  console.log('=== INCOMING REQUEST ===');
  console.log(logMessage);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('========================');
  
  // File logging disabled for serverless deployment
  // require('fs').appendFileSync('requests.log', logMessage + '\n');
  next();
});

// Routes
app.get('/', (req, res) => {
  console.log('Root endpoint hit!');
  res.json({ message: 'Welcome to ShareLyft API' });
});

// Simple test endpoints
app.get('/test', (req, res) => {
  console.log('TEST ENDPOINT HIT!');
  res.json({ message: 'Test endpoint working!' });
});

app.get('/simple', (req, res) => {
  res.send('Simple endpoint works!');
});

app.get('/debug', (req, res) => {
  console.log('Debug endpoint accessed');
  res.json({ 
    message: 'Debug endpoint working',
    time: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
});

// Emergency ride request endpoint for debugging
app.post('/debug-ride-request/:id', (req, res) => {
  console.log('🚨 EMERGENCY DEBUG ENDPOINT HIT!');
  console.log('Params:', req.params);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);
  // File logging disabled for serverless deployment
  // require('fs').appendFileSync('debug.log', `Emergency endpoint hit: ${JSON.stringify({ params: req.params, body: req.body })}\n`);
  res.json({ message: 'Debug endpoint reached successfully', received: { params: req.params, body: req.body } });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/rides', ridePaymentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/service-fee', require('./routes/serviceFeeRoutes'));
app.use('/api/mpesa', require('./routes/mpesaRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/profile', profileRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API is available at http://localhost:${PORT}`);
});

module.exports = app; // For testing