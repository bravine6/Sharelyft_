const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const rideRoutes = require('./routes/rideRoutes');
const locationRoutes = require('./routes/locationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const paymentMethodsRoutes = require('./routes/paymentMethodsRoutes');
const ridePaymentRoutes = require('./routes/ridePaymentRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Initialize express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [/\.vercel\.app$/, 'https://sharelyft.com', 'https://www.sharelyft.com'] 
      : ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});

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
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/service-fee', require('./routes/serviceFeeRoutes'));
app.use('/api/mpesa', require('./routes/mpesaRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/profile', profileRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/chat', chatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database tables
async function initializeDatabase() {
  const { supabase } = require('./config/supabase');
  
  // Create vehicles table if it doesn't exist
  const createVehiclesTable = `
    CREATE TABLE IF NOT EXISTS vehicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      make VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      year INTEGER NOT NULL,
      color VARCHAR(50) NOT NULL,
      license_plate VARCHAR(20) NOT NULL UNIQUE,
      seats INTEGER NOT NULL DEFAULT 4,
      fuel_type VARCHAR(20) DEFAULT 'petrol',
      transmission VARCHAR(20) DEFAULT 'manual',
      air_conditioning BOOLEAN DEFAULT false,
      music_system BOOLEAN DEFAULT false,
      charging_ports BOOLEAN DEFAULT false,
      registration_number VARCHAR(50),
      insurance_company VARCHAR(100),
      insurance_expiry DATE,
      verification_status VARCHAR(20) DEFAULT 'pending',
      verification_notes TEXT,
      verified_at TIMESTAMP WITH TIME ZONE,
      vehicle_photos JSONB DEFAULT '[]',
      registration_documents JSONB DEFAULT '[]',
      insurance_documents JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    const { error } = await supabase.from('vehicles').select('id').limit(1);
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, let's create it using raw SQL
      console.log('Creating vehicles table...');
      // For now, we'll skip creating the table automatically
      console.log('Vehicles table creation skipped - create manually in Supabase');
    } else {
      console.log('Vehicles table exists');
    }
  } catch (err) {
    console.log('Database initialization completed');
  }
}

// Socket.IO authentication middleware
const jwt = require('jsonwebtoken');
const supabase = require('./config/supabase');

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user profile
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', decoded.id)
      .single();

    if (error || !user) {
      return next(new Error('User not found'));
    }

    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.user.name} connected to chat`);
  
  // Join user to their personal room for notifications
  socket.join(`user_${socket.userId}`);
  
  // Join specific conversation
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.user.name} joined conversation ${conversationId}`);
  });
  
  // Leave conversation
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`User ${socket.user.name} left conversation ${conversationId}`);
  });
  
  // Handle new message (DISABLED - using HTTP API instead to prevent duplicates)
  // socket.on('send_message', async (data) => {
  //   // This handler is disabled to prevent duplicate messages
  //   // Messages are sent via HTTP API in chatController.js
  //   // Real-time updates are handled by the HTTP API emitting to Socket.IO rooms
  // });
  
  // Handle typing indicators
  socket.on('typing_start', (conversationId) => {
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      user_id: socket.userId,
      user_name: socket.user.name
    });
  });
  
  socket.on('typing_stop', (conversationId) => {
    socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
      user_id: socket.userId
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.name} disconnected from chat`);
  });
});

// Make io available to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API is available at http://localhost:${PORT}`);
  console.log(`Socket.IO server initialized`);
  
  // Initialize database
  await initializeDatabase();
});

module.exports = app; // For testing