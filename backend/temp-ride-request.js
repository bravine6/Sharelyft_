// Temporary standalone ride request endpoint for debugging
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/temp-ride-request/:id', (req, res) => {
  console.log('✅ TEMP ENDPOINT WORKING!');
  console.log('Ride ID:', req.params.id);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers.authorization);
  
  // Simulate success response
  res.json({
    success: true,
    message: 'Ride request received successfully',
    data: {
      id: 'temp-' + Date.now(),
      ride_id: req.params.id,
      passengers: req.body.passengers,
      message: req.body.message,
      status: 'pending'
    }
  });
});

app.listen(5001, () => {
  console.log('🚨 Temporary server running on port 5001');
  console.log('Test URL: http://localhost:5001/temp-ride-request/test-id');
});