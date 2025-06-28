const supabase = require('../config/supabase');

// Create a new ride
exports.createRide = async (req, res) => {
  try {
    const { 
      origin, 
      destination,
      origin_county,
      origin_town,
      destination_county,
      destination_town,
      departure_time, 
      available_seats, 
      price_per_seat,
      vehicle_id,
      description
    } = req.body;
    
    // Check if user is a verified driver
    if (req.user.user_type !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can offer rides' });
    }
    
    // Verification is now enforced by requireFullVerification middleware
    
    // Validate input
    if (!origin || !destination || !departure_time || !available_seats || !price_per_seat) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }
    
    // Prepare ride data for insertion

    // Create ride in database (using service role, should bypass RLS)
    const { data, error } = await supabase
      .from('rides')
      .insert([
        { 
          driver_id: req.user.id,
          origin,
          destination,
          origin_county,
          origin_town,
          destination_county,
          destination_town,
          departure_time,
          available_seats,
          price_per_seat,
          vehicle_info: { vehicle_id },
          route_info: { description },
          status: req.body.status || 'active'
        }
      ])
      .select();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's own rides (for dashboard)
exports.getAllRides = async (req, res) => {
  try {
    console.log('Getting rides for user:', req.user.id, 'type:', req.user.user_type);
    
    let rides = [];
    
    if (req.user.user_type === 'driver') {
      // Drivers see their offered rides
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', req.user.id)
        .order('departure_time', { ascending: true });
      
      if (error) throw error;
      rides = data || [];
      
    } else {
      // Passengers see their booked rides (from ride_requests)
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          ride:ride_id (*)
        `)
        .eq('passenger_id', req.user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Extract the ride data from the nested structure
      rides = (data || []).map(request => request.ride).filter(ride => ride);
    }
    
    console.log('Found rides:', rides.length);
    res.json(rides);
  } catch (error) {
    console.error('Error in getAllRides:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get available rides for passengers to book
exports.getAvailableRides = async (req, res) => {
  try {
    console.log('Getting available rides for user:', req.user.id);
    
    // Get all active rides except user's own
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'active')
      .neq('driver_id', req.user.id) // Exclude user's own rides
      .order('departure_time', { ascending: true });
    
    if (error) throw error;
    
    console.log('Found available rides:', data?.length || 0);
    res.json(data || []);
  } catch (error) {
    console.error('Error in getAvailableRides:', error);
    res.status(500).json({ message: error.message });
  }
};

// Search for rides
exports.searchRides = async (req, res) => {
  try {
    const { 
      origin, 
      destination, 
      origin_county, 
      origin_town, 
      destination_county, 
      destination_town, 
      date 
    } = req.query;
    
    let query = supabase
      .from('rides')
      .select('*')
      .eq('status', 'active')
      .neq('driver_id', req.user.id) // Don't show user's own rides in search
      .order('departure_time', { ascending: true });
    
    // Filter by origin
    if (origin) {
      query = query.ilike('origin', `%${origin}%`);
    }
    if (origin_county) {
      query = query.ilike('origin_county', `%${origin_county}%`);
    }
    if (origin_town) {
      query = query.ilike('origin_town', `%${origin_town}%`);
    }
    
    // Filter by destination
    if (destination) {
      query = query.ilike('destination', `%${destination}%`);
    }
    if (destination_county) {
      query = query.ilike('destination_county', `%${destination_county}%`);
    }
    if (destination_town) {
      query = query.ilike('destination_town', `%${destination_town}%`);
    }
    
    if (date) {
      // Filter by date (assuming departure_time is a timestamp)
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      
      query = query.gte('departure_time', startOfDay.toISOString());
      query = query.lt('departure_time', endOfDay.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get ride by ID
exports.getRideById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        driver:driver_id(id, name, phone),
        vehicle:vehicle_id(*),
        ride_requests(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a ride
exports.updateRide = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      origin, 
      destination, 
      departure_time, 
      available_seats, 
      price, 
      status 
    } = req.body;
    
    // Check if ride belongs to driver
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select()
      .eq('id', id)
      .eq('driver_id', req.user.id)
      .single();
    
    if (rideError || !ride) {
      return res.status(404).json({ 
        message: 'Ride not found or you do not have permission to update it' 
      });
    }
    
    // Update ride
    const { data, error } = await supabase
      .from('rides')
      .update({ 
        origin, 
        destination, 
        departure_time, 
        available_seats, 
        price, 
        status 
      })
      .eq('id', id)
      .select();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a ride
exports.deleteRide = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if ride belongs to driver
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select()
      .eq('id', id)
      .eq('driver_id', req.user.id)
      .single();
    
    if (rideError || !ride) {
      return res.status(404).json({ 
        message: 'Ride not found or you do not have permission to delete it' 
      });
    }
    
    // Delete ride
    const { error } = await supabase
      .from('rides')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json({ message: 'Ride deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request a ride
exports.requestRide = async (req, res) => {
  try {
    const { id } = req.params;
    const { passengers, message } = req.body;
    
    console.log('Requesting ride with ID:', id);
    console.log('Request body:', { passengers, message });
    console.log('User:', req.user.id);
    
    // First, check if ride exists at all
    const { data: rideCheck, error: checkError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', id)
      .single();
    
    console.log('Ride check result:', rideCheck);
    console.log('Ride check error:', checkError);
    
    if (checkError || !rideCheck) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    
    // Check if ride is active
    if (rideCheck.status !== 'active') {
      return res.status(400).json({ message: `Ride is not available (status: ${rideCheck.status})` });
    }
    
    // Check if user is not trying to request their own ride
    if (rideCheck.driver_id === req.user.id) {
      return res.status(400).json({ message: 'You cannot request your own ride' });
    }
    
    // Check if user has already requested this ride
    const { data: existingRequest, error: existingError } = await supabase
      .from('ride_requests')
      .select('id, status')
      .eq('ride_id', id)
      .eq('passenger_id', req.user.id)
      .single();

    if (existingRequest) {
      return res.status(400).json({ 
        message: `You have already requested this ride (Status: ${existingRequest.status})` 
      });
    }
    
    // Create ride request - use profile ID which matches the foreign key constraint
    const requestData = { 
      ride_id: id,
      passenger_id: req.user.id,  // Use user_profiles.id (profile primary key)
      passengers: passengers,
      message: message,
      status: 'pending'
    };
    
    console.log('Creating ride request with data:', requestData);
    
    const { data, error } = await supabase
      .from('ride_requests')
      .insert([requestData])
      .select();
    
    console.log('Insert result:', data);
    console.log('Insert error:', error);
    
    if (error) {
      console.error('Detailed error:', error);
      return res.status(400).json({ 
        message: error.message || 'Failed to create ride request',
        details: error.details || error.hint || 'No additional details',
        code: error.code || 'UNKNOWN'
      });
    }
    
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Respond to a ride request
exports.respondToRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { status } = req.body;
    
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be accepted or rejected' });
    }
    
    // Check if ride belongs to driver
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select()
      .eq('id', id)
      .eq('driver_id', req.user.id)
      .single();
    
    if (rideError || !ride) {
      return res.status(404).json({ 
        message: 'Ride not found or you do not have permission to update requests' 
      });
    }
    
    // Update request status with responded_at timestamp
    const updateData = { status };
    
    // Add responded_at timestamp if status is being set to accepted or rejected
    if (status === 'accepted' || status === 'rejected') {
      updateData.responded_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('ride_requests')
      .update(updateData)
      .eq('id', requestId)
      .eq('ride_id', id)
      .select();
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // If request was accepted, automatically create a chat conversation
    if (status === 'accepted') {
      try {
        // Check if conversation already exists
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('ride_id', id)
          .eq('passenger_id', data[0].passenger_id)
          .single();

        if (!existingConv) {
          // Create new conversation with driver already marked as paid
          await supabase
            .from('conversations')
            .insert([{
              ride_id: id,
              driver_id: req.user.id,
              passenger_id: data[0].passenger_id,
              driver_paid: true,  // Driver already paid for ride posting
              passenger_paid: false  // Passenger needs to pay for contact sharing
            }]);
          
          console.log(`Created chat conversation for accepted ride request ${requestId}`);
        }
      } catch (convError) {
        console.error('Error creating conversation:', convError);
        // Don't fail the request acceptance if conversation creation fails
      }
    }
    
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get ride statistics for dashboard
exports.getRideStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    if (userType === 'driver') {
      // Get driver statistics
      const { data: rides, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', userId);

      if (ridesError) {
        console.error('Error fetching driver rides for stats:', ridesError);
        return res.status(500).json({ error: 'Failed to fetch ride statistics' });
      }

      // Get accepted ride requests for earnings calculation
      const { data: requests, error: requestsError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          ride:ride_id (
            price_per_seat
          )
        `)
        .in('ride_id', rides.map(r => r.id))
        .eq('status', 'accepted');

      if (requestsError) {
        console.error('Error fetching ride requests for stats:', requestsError);
        return res.status(500).json({ error: 'Failed to fetch ride statistics' });
      }

      const totalRidesOffered = rides.length;
      const completedRides = rides.filter(r => r.status === 'completed').length;
      const totalEarnings = requests?.reduce((sum, req) => sum + (req.ride?.price_per_seat || 0), 0) || 0;

      res.json({
        ridesOffered: totalRidesOffered,
        ridesCompleted: completedRides,
        ridesTaken: 0,
        totalEarnings: totalEarnings,
        totalSpent: 0
      });
    } else {
      // Get passenger statistics
      const { data: requests, error: requestsError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          ride:ride_id (
            price_per_seat,
            status
          )
        `)
        .eq('passenger_id', req.user.id);

      if (requestsError) {
        console.error('Error fetching passenger requests for stats:', requestsError);
        return res.status(500).json({ error: 'Failed to fetch ride statistics' });
      }

      const acceptedRequests = requests?.filter(r => r.status === 'accepted') || [];
      const completedRides = acceptedRequests.filter(r => r.ride?.status === 'completed').length;
      const totalSpent = acceptedRequests.reduce((sum, req) => sum + (req.ride?.price_per_seat || 0), 0);

      res.json({
        ridesOffered: 0,
        ridesCompleted: completedRides,
        ridesTaken: acceptedRequests.length,
        totalEarnings: 0,
        totalSpent: totalSpent
      });
    }
  } catch (error) {
    console.error('Error fetching ride statistics:', error);
    res.status(500).json({ error: 'Failed to fetch ride statistics' });
  }
};

// Get ride requests for a specific ride
exports.getRideRequests = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if ride belongs to driver
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select()
      .eq('id', id)
      .eq('driver_id', req.user.id)
      .single();
    
    if (rideError || !ride) {
      return res.status(404).json({ 
        message: 'Ride not found or you do not have permission to view its requests' 
      });
    }
    
    // Get all requests for this ride
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('ride_id', id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's ride requests (for passengers)
exports.getUserRideRequests = async (req, res) => {
  try {
    const userId = req.user.profile_id || req.user.id; // Use profile ID for foreign key relationships
    const userType = req.user.user_type;
    
    console.log('Getting ride requests for user:', userId, 'type:', userType);
    
    // For passengers, get their ride requests with payment status
    const { data: rideRequests, error } = await supabase
      .from('ride_requests')
      .select(`
        *,
        ride:ride_id (
          *,
          driver:driver_id (name, phone, email)
        )
      `)
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching ride requests:', error);
      return res.status(500).json({ message: error.message });
    }
    
    // For each ride request, check payment status
    const requestsWithPaymentStatus = await Promise.all(
      (rideRequests || []).map(async (request) => {
        if (request.status === 'accepted') {
          // Check if passenger has paid service fee
          const { data: passengerPayment } = await supabase
            .from('service_fee_payments')
            .select('*')
            .eq('ride_request_id', request.id)
            .eq('payer_id', userId)
            .eq('payer_type', 'passenger')
            .single();
          
          // Check connection unlock status
          const { data: connectionStatus } = await supabase
            .from('connection_unlocks')
            .select('*')
            .eq('ride_request_id', request.id)
            .single();
          
          return {
            ...request,
            payment_status: {
              passenger_paid: !!passengerPayment && passengerPayment.status === 'completed',
              payment_required: true,
              connection_unlocked: connectionStatus?.is_unlocked || false,
              chat_enabled: connectionStatus?.chat_enabled || false,
              contact_info_revealed: connectionStatus?.contact_info_revealed || false
            }
          };
        }
        
        return {
          ...request,
          payment_status: {
            passenger_paid: false,
            payment_required: false,
            connection_unlocked: false,
            chat_enabled: false,
            contact_info_revealed: false
          }
        };
      })
    );
    
    console.log('Found ride requests with payment status:', requestsWithPaymentStatus?.length || 0);
    
    // Return ride requests with payment status
    res.json(requestsWithPaymentStatus || []);
    
  } catch (error) {
    console.error('Error in getUserRideRequests:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get recent activity feed
exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const activities = [];

    if (userType === 'driver') {
      // Get recent rides offered
      const { data: rides, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (ridesError) {
        console.error('Error fetching recent rides:', ridesError);
        return res.status(500).json({ error: 'Failed to fetch recent activity' });
      }

      rides?.forEach(ride => {
        activities.push({
          id: `ride-${ride.id}`,
          type: 'ride_offered',
          title: 'Ride Offered',
          description: `${ride.origin} to ${ride.destination}`,
          timestamp: ride.created_at,
          data: ride
        });
      });

      // Get recent ride requests
      const { data: requests, error: requestsError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          ride:ride_id (
            origin,
            destination
          )
        `)
        .in('ride_id', rides.map(r => r.id))
        .order('created_at', { ascending: false })
        .limit(5);

      if (requestsError) {
        console.error('Error fetching recent requests:', requestsError);
        return res.status(500).json({ error: 'Failed to fetch recent activity' });
      }

      requests?.forEach(request => {
        activities.push({
          id: `request-${request.id}`,
          type: 'ride_request',
          title: `Ride Request ${request.status}`,
          description: `${request.ride?.origin} to ${request.ride?.destination}`,
          timestamp: request.created_at,
          data: request
        });
      });
    } else {
      // Get passenger's recent requests
      const { data: requests, error: requestsError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          ride:ride_id (
            origin,
            destination
          )
        `)
        .eq('passenger_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (requestsError) {
        console.error('Error fetching passenger requests:', requestsError);
        return res.status(500).json({ error: 'Failed to fetch recent activity' });
      }

      requests?.forEach(request => {
        activities.push({
          id: `request-${request.id}`,
          type: 'ride_request',
          title: `Ride Request ${request.status}`,
          description: `${request.ride?.origin} to ${request.ride?.destination}`,
          timestamp: request.created_at,
          data: request
        });
      });
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, 10)); // Return top 10 most recent
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

// Get user's ride requests (for passengers)
exports.getUserRideRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('Getting ride requests for user:', userId);
    
    // Fetch passenger's ride requests with ride details
    const { data, error } = await supabase
      .from('ride_requests')
      .select(`
        *,
        ride:ride_id (
          id,
          origin,
          destination,
          departure_time,
          price_per_seat,
          available_seats,
          driver_id,
          status
        )
      `)
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching ride requests:', error);
      return res.status(400).json({ message: error.message });
    }
    
    console.log('Found ride requests:', data?.length || 0);
    res.json(data || []);
  } catch (error) {
    console.error('Error in getUserRideRequests:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get specific ride request details
exports.getRideRequestDetails = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;
    
    console.log('Getting ride request details:', requestId, 'for user:', userId);
    
    // Fetch specific ride request with ride details
    const { data, error } = await supabase
      .from('ride_requests')
      .select(`
        *,
        ride:ride_id (
          id,
          origin,
          destination,
          departure_time,
          price_per_seat,
          available_seats,
          driver_id,
          status
        )
      `)
      .eq('id', requestId)
      .eq('passenger_id', userId) // Ensure user can only access their own requests
      .single();
    
    if (error || !data) {
      return res.status(404).json({ message: 'Ride request not found' });
    }
    
    console.log('Found ride request:', data.id);
    res.json(data);
  } catch (error) {
    console.error('Error in getRideRequestDetails:', error);
    res.status(500).json({ message: error.message });
  }
};