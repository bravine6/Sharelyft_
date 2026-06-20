const supabase = require('../config/supabase');

// Fixed service fee (KSh 50 for both driver and passenger)
const SERVICE_FEE = 50.00;

// payServiceFee removed — Paystack is now the single payment provider.
// Use POST /api/paystack/initiate with purpose='connection_fee' instead.

// Get connection unlock status for a ride request
exports.getConnectionStatus = async (req, res) => {
  try {
    const { ride_request_id } = req.params;
    const user_id = req.user.id;

    // Verify user is part of this ride request
    const { data: rideRequest, error: requestError } = await supabase
      .from('ride_requests')
      .select(`
        *,
        ride:ride_id (driver_id)
      `)
      .eq('id', ride_request_id)
      .single();

    if (requestError || !rideRequest) {
      return res.status(404).json({ message: 'Ride request not found' });
    }

    const isDriver = rideRequest.ride.driver_id === user_id;
    const isPassenger = rideRequest.passenger_id === user_id;

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get connection unlock status
    const { data: connectionStatus } = await supabase
      .from('connection_unlocks')
      .select('*')
      .eq('ride_request_id', ride_request_id)
      .single();

    // Get payment status for both driver and passenger
    const { data: payments } = await supabase
      .from('service_fee_payments')
      .select('*')
      .eq('ride_request_id', ride_request_id)
      .eq('status', 'completed');

    const driverPaid = payments?.some(p => p.payer_type === 'driver') || false;
    const passengerPaid = payments?.some(p => p.payer_type === 'passenger') || false;

    // Check if current user has paid
    const userPaid = payments?.some(p => p.payer_id === user_id) || false;

    res.json({
      ride_request_id: ride_request_id,
      is_unlocked: connectionStatus?.is_unlocked || false,
      chat_enabled: connectionStatus?.chat_enabled || false,
      contact_info_revealed: connectionStatus?.contact_info_revealed || false,
      driver_paid: driverPaid,
      passenger_paid: passengerPaid,
      user_paid: userPaid,
      user_type: isDriver ? 'driver' : 'passenger',
      total_revenue_collected: (driverPaid ? 50 : 0) + (passengerPaid ? 50 : 0)
    });

  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get contact information (only if connection is unlocked)
exports.getContactInformation = async (req, res) => {
  try {
    const { ride_request_id } = req.params;
    const user_id = req.user.id;

    // Check if connection is unlocked
    const { data: connectionStatus } = await supabase
      .from('connection_unlocks')
      .select('*')
      .eq('ride_request_id', ride_request_id)
      .single();

    if (!connectionStatus?.contact_info_revealed) {
      return res.status(403).json({ 
        message: 'Contact information is locked. Both driver and passenger must pay service fees first.',
        payment_required: true
      });
    }

    // Get ride request with user details
    const { data: rideRequest, error: requestError } = await supabase
      .from('ride_requests')
      .select(`
        *,
        ride:ride_id (
          *,
          driver:driver_id (id, name, phone, email)
        ),
        passenger:passenger_id (id, name, phone, email)
      `)
      .eq('id', ride_request_id)
      .single();

    if (requestError || !rideRequest) {
      return res.status(404).json({ message: 'Ride request not found' });
    }

    // Verify user is part of this ride
    const isDriver = rideRequest.ride.driver_id === user_id;
    const isPassenger = rideRequest.passenger_id === user_id;

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Return contact info of the other party
    const contactInfo = isDriver ? {
      type: 'passenger',
      name: rideRequest.passenger.name,
      phone: rideRequest.passenger.phone,
      email: rideRequest.passenger.email
    } : {
      type: 'driver',
      name: rideRequest.ride.driver.name,
      phone: rideRequest.ride.driver.phone,
      email: rideRequest.ride.driver.email
    };

    res.json({
      contact_info: contactInfo,
      ride_details: {
        origin: rideRequest.ride.origin,
        destination: rideRequest.ride.destination,
        departure_time: rideRequest.ride.departure_time,
        passengers: rideRequest.passengers
      }
    });

  } catch (error) {
    console.error('Error getting contact information:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get service fee payment history
exports.getServiceFeeHistory = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data: payments, error } = await supabase
      .from('service_fee_payments')
      .select(`
        *,
        ride_request:ride_request_id (
          *,
          ride:ride_id (
            origin,
            destination,
            departure_time
          )
        )
      `)
      .eq('payer_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json(payments);

  } catch (error) {
    console.error('Error getting service fee history:', error);
    res.status(500).json({ message: error.message });
  }
};

async function processCardServiceFee(payment) {
  // Mock card payment for KSh 50
  console.log(`Processing card service fee payment of KSh ${payment.amount}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    success: true,
    external_id: 'CARD_' + Date.now(),
    reference: 'SF_' + Math.random().toString(36).substr(2, 9),
    card_transaction_id: 'TXN_' + Date.now()
  };
}

async function processWalletServiceFee(payment, userId) {
  // Mock wallet payment for KSh 50
  console.log(`Processing wallet service fee payment of KSh ${payment.amount} for user ${userId}`);
  
  // In a real implementation, you would:
  // 1. Check wallet balance
  // 2. Deduct service fee
  // 3. Record transaction
  
  return {
    success: true,
    external_id: 'WALLET_' + Date.now(),
    reference: 'SF_' + Math.random().toString(36).substr(2, 9)
  };
}