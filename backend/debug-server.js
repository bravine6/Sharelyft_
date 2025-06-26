require('dotenv').config();
const express = require('express');
const cors = require('cors');

console.log('🚀 Starting ShareLyft Backend...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT || 5000);

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [/\.vercel\.app$/, 'https://sharelyft.com', 'https://www.sharelyft.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.json({ message: 'ShareLyft API Debug Server', timestamp: new Date().toISOString() });
});

// Load and mount routes
try {
  console.log('📝 Loading routes...');
  
  const authRoutes = require('./src/routes/authRoutes');
  console.log('✓ authRoutes loaded');
  
  const userRoutes = require('./src/routes/userRoutes');
  console.log('✓ userRoutes loaded');
  
  const rideRoutes = require('./src/routes/rideRoutes');
  console.log('✓ rideRoutes loaded');
  
  const locationRoutes = require('./src/routes/locationRoutes');
  console.log('✓ locationRoutes loaded');
  
  const profileRoutes = require('./src/routes/profileRoutes');
  console.log('✓ profileRoutes loaded');
  
  const paymentMethodsRoutes = require('./src/routes/paymentMethodsRoutes');
  console.log('✓ paymentMethodsRoutes loaded');
  
  // Mount routes
  console.log('🔗 Mounting routes...');
  app.use('/api/auth', authRoutes);
  console.log('✓ /api/auth mounted');
  
  app.use('/api/users', userRoutes);
  console.log('✓ /api/users mounted');
  
  app.use('/api/rides', rideRoutes);
  console.log('✓ /api/rides mounted');
  
  app.use('/api/locations', locationRoutes);
  console.log('✓ /api/locations mounted');
  
  app.use('/api/profile', profileRoutes);
  console.log('✓ /api/profile mounted');
  
  app.use('/api/payment-methods', paymentMethodsRoutes);
  console.log('✓ /api/payment-methods mounted');
  
  console.log('🎉 All routes mounted successfully!');
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Test endpoint to verify routes
app.get('/api/test-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      const layerRoutes = [];
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          layerRoutes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
      if (layerRoutes.length > 0) {
        routes.push({
          baseUrl: middleware.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/'),
          routes: layerRoutes
        });
      }
    }
  });
  
  res.json({
    message: 'Available routes',
    routes: routes,
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🌟 ShareLyft API running on port ${PORT}`);
  console.log(`📍 API available at http://localhost:${PORT}`);
  console.log(`🧪 Test routes at http://localhost:${PORT}/api/test-routes`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please kill the existing process or use a different port.`);
  }
});