const supabase = require('../config/supabase');

const adminController = {
  // Dashboard Overview Statistics
  async getDashboardStats(req, res) {
    try {
      // Get user statistics
      const { data: userStats } = await supabase
        .from('user_profiles')
        .select('user_type, email_verified, phone_verified, created_at');

      // Get ride statistics
      const { data: rideStats } = await supabase
        .from('rides')
        .select('status, created_at');

      // Get payment statistics
      const { data: paymentStats } = await supabase
        .from('service_fee_payments')
        .select('status, amount, created_at');

      // Get ride request statistics
      const { data: requestStats } = await supabase
        .from('ride_requests')
        .select('status, connection_unlocked, created_at');

      // Calculate dashboard metrics
      const totalUsers = userStats?.length || 0;
      const totalDrivers = userStats?.filter(u => u.user_type === 'driver').length || 0;
      const totalPassengers = userStats?.filter(u => u.user_type === 'passenger').length || 0;
      const verifiedUsers = userStats?.filter(u => u.email_verified && u.phone_verified).length || 0;

      const totalRides = rideStats?.length || 0;
      const activeRides = rideStats?.filter(r => r.status === 'active').length || 0;
      const completedRides = rideStats?.filter(r => r.status === 'completed').length || 0;

      const totalPayments = paymentStats?.length || 0;
      const completedPayments = paymentStats?.filter(p => p.status === 'completed').length || 0;
      const totalRevenue = paymentStats
        ?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

      const totalRequests = requestStats?.length || 0;
      const connectedRides = requestStats?.filter(r => r.connection_unlocked).length || 0;

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const newUsersThisWeek = userStats?.filter(u => u.created_at >= sevenDaysAgo).length || 0;
      const newRidesThisWeek = rideStats?.filter(r => r.created_at >= sevenDaysAgo).length || 0;

      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            drivers: totalDrivers,
            passengers: totalPassengers,
            verified: verifiedUsers,
            verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : 0,
            newThisWeek: newUsersThisWeek
          },
          rides: {
            total: totalRides,
            active: activeRides,
            completed: completedRides,
            completionRate: totalRides > 0 ? ((completedRides / totalRides) * 100).toFixed(1) : 0,
            newThisWeek: newRidesThisWeek
          },
          payments: {
            total: totalPayments,
            completed: completedPayments,
            revenue: totalRevenue,
            successRate: totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(1) : 0
          },
          connections: {
            total: totalRequests,
            connected: connectedRides,
            connectionRate: totalRequests > 0 ? ((connectedRides / totalRequests) * 100).toFixed(1) : 0
          }
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics'
      });
    }
  },

  // User Management
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, search = '', user_type = '', status = '' } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          first_name,
          email,
          phone,
          user_type,
          email_verified,
          phone_verified,
          verification_status,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      
      if (user_type) {
        query = query.eq('user_type', user_type);
      }

      if (status === 'verified') {
        query = query.eq('email_verified', true).eq('phone_verified', true);
      } else if (status === 'unverified') {
        query = query.or('email_verified.eq.false,phone_verified.eq.false');
      }

      const { data: users, error } = await query;

      if (error) throw error;

      // Get total count for pagination
      const { count } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      res.json({
        success: true,
        data: {
          users: users || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  },

  async getUserDetails(req, res) {
    try {
      const { userId } = req.params;

      // Get user profile
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get user's rides (if driver)
      const { data: rides } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get user's ride requests (if passenger)
      const { data: requests } = await supabase
        .from('ride_requests')
        .select(`
          *,
          rides!inner(*)
        `)
        .eq('passenger_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get user's payments
      const { data: payments } = await supabase
        .from('service_fee_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      res.json({
        success: true,
        data: {
          user,
          rides: rides || [],
          requests: requests || [],
          payments: payments || []
        }
      });
    } catch (error) {
      console.error('Get user details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user details'
      });
    }
  },

  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { email_verified, phone_verified, verification_status } = req.body;

      const updateData = {};
      if (email_verified !== undefined) updateData.email_verified = email_verified;
      if (phone_verified !== undefined) updateData.phone_verified = phone_verified;
      if (verification_status !== undefined) updateData.verification_status = verification_status;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: 'User status updated successfully',
        data
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status'
      });
    }
  },

  async verifyUser(req, res) {
    try {
      const { userId } = req.params;

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          email_verified: true,
          phone_verified: true,
          verification_status: 'approved',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: 'User verified successfully',
        data
      });
    } catch (error) {
      console.error('Verify user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify user',
        error: error.message
      });
    }
  },

  // Ride Management
  async getAllRides(req, res) {
    try {
      const { page = 1, limit = 20, status = '', search = '' } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('rides')
        .select(`
          *,
          user_profiles!rides_driver_id_fkey(first_name, email),
          vehicles(make, model, year, license_plate)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`origin.ilike.%${search}%,destination.ilike.%${search}%`);
      }

      const { data: rides, error } = await query;

      if (error) throw error;

      const { count } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true });

      res.json({
        success: true,
        data: {
          rides: rides || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all rides error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch rides'
      });
    }
  },

  async getRideDetails(req, res) {
    try {
      const { rideId } = req.params;

      // Get ride details
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select(`
          *,
          user_profiles!rides_driver_id_fkey(first_name, email, phone),
          vehicles(make, model, year, license_plate, color)
        `)
        .eq('id', rideId)
        .single();

      if (rideError) throw rideError;

      // Get ride requests
      const { data: requests, error: requestsError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          user_profiles!ride_requests_passenger_id_fkey(first_name, email, phone)
        `)
        .eq('ride_id', rideId)
        .order('created_at', { ascending: false });

      // Get payments for this ride
      const { data: payments } = await supabase
        .from('service_fee_payments')
        .select(`
          *,
          user_profiles!service_fee_payments_user_id_fkey(first_name, email)
        `)
        .in('ride_request_id', (requests || []).map(r => r.id));

      res.json({
        success: true,
        data: {
          ride,
          requests: requests || [],
          payments: payments || []
        }
      });
    } catch (error) {
      console.error('Get ride details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ride details'
      });
    }
  },

  async updateRideStatus(req, res) {
    try {
      const { rideId } = req.params;
      const { status } = req.body;

      const validStatuses = ['active', 'completed', 'cancelled', 'pending_payment'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const { data, error } = await supabase
        .from('rides')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', rideId)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: 'Ride status updated successfully',
        data
      });
    } catch (error) {
      console.error('Update ride status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update ride status'
      });
    }
  },

  // Payment Management
  async getAllPayments(req, res) {
    try {
      const { page = 1, limit = 20, status = '', search = '' } = req.query;
      const offset = (page - 1) * limit;

      // Union M-Pesa (service_fee_payments) + Paystack (paystack_payments).
      // Fetch each separately, merge in code — avoids PostgREST embed ambiguity.
      const buildMpesaQuery = () => {
        let q = supabase
          .from('service_fee_payments')
          .select('*')
          .order('created_at', { ascending: false });
        if (status) q = q.eq('status', status === 'success' ? 'completed' : status);
        if (search) q = q.or(`transaction_ref.ilike.%${search}%,mpesa_receipt_number.ilike.%${search}%`);
        return q;
      };

      const buildPaystackQuery = () => {
        let q = supabase
          .from('paystack_payments')
          .select('*')
          .order('created_at', { ascending: false });
        if (status) q = q.eq('status', status);
        if (search) q = q.ilike('reference', `%${search}%`);
        return q;
      };

      const [mpesaRes, paystackRes] = await Promise.all([
        buildMpesaQuery(),
        buildPaystackQuery()
      ]);

      const mpesaRows = (mpesaRes.data || []).map((r) => ({
        id: r.id,
        provider: 'mpesa',
        reference: r.transaction_ref || r.mpesa_receipt_number,
        amount: r.amount,
        status: r.status === 'completed' ? 'success' : r.status,
        user_id: r.user_id,
        ride_request_id: r.ride_request_id,
        created_at: r.created_at
      }));

      const paystackRows = (paystackRes.data || []).map((r) => ({
        id: r.id,
        provider: 'paystack',
        reference: r.reference,
        amount: Number(r.amount),
        status: r.status,
        user_id: r.user_id,
        ride_id: r.ride_id,
        ride_request_id: r.ride_request_id,
        purpose: r.purpose,
        created_at: r.created_at
      }));

      const merged = [...mpesaRows, ...paystackRows]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(offset, offset + Number(limit));

      // Hydrate user_profiles for the unique user_ids on this page
      const userIds = [...new Set(merged.map((p) => p.user_id).filter(Boolean))];
      let profilesById = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, first_name, email')
          .in('id', userIds);
        profilesById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      }

      const payments = merged.map((p) => ({
        ...p,
        user_profiles: profilesById[p.user_id] || null,
        transaction_reference: p.reference
      }));

      const total = mpesaRows.length + paystackRows.length;

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payments',
        error: error.message
      });
    }
  },

  async getPaymentDetails(req, res) {
    try {
      const { paymentId } = req.params;

      const { data: payment, error } = await supabase
        .from('service_fee_payments')
        .select(`
          *,
          user_profiles!service_fee_payments_user_id_fkey(*),
          ride_requests!service_fee_payments_ride_request_id_fkey(
            *,
            rides!inner(*)
          )
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      console.error('Get payment details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment details'
      });
    }
  },

  async refundPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { reason = 'Admin refund' } = req.body;

      // TODO: Implement actual refund logic with M-Pesa
      // For now, we'll just mark as refunded in the database

      const { data, error } = await supabase
        .from('service_fee_payments')
        .update({
          status: 'refunded',
          result_description: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: 'Payment refunded successfully',
        data
      });
    } catch (error) {
      console.error('Refund payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refund payment'
      });
    }
  },

  // Analytics
  async getUserAnalytics(req, res) {
    try {
      const { period = '7d' } = req.query;
      
      // Calculate date range
      let daysBack = 7;
      switch (period) {
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
      }

      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      // Get user registration trends
      const { data: registrations } = await supabase
        .from('user_profiles')
        .select('created_at, user_type')
        .gte('created_at', startDate)
        .order('created_at');

      // Group by date
      const trends = {};
      registrations?.forEach(user => {
        const date = user.created_at.split('T')[0];
        if (!trends[date]) {
          trends[date] = { drivers: 0, passengers: 0, total: 0 };
        }
        trends[date][user.user_type]++;
        trends[date].total++;
      });

      res.json({
        success: true,
        data: {
          period,
          trends: Object.entries(trends).map(([date, data]) => ({
            date,
            ...data
          }))
        }
      });
    } catch (error) {
      console.error('User analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user analytics'
      });
    }
  },

  async getRideAnalytics(req, res) {
    try {
      const { period = '7d' } = req.query;
      
      let daysBack = 7;
      switch (period) {
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
      }

      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      // Get ride creation trends
      const { data: rides } = await supabase
        .from('rides')
        .select('created_at, status')
        .gte('created_at', startDate)
        .order('created_at');

      // Group by date
      const trends = {};
      rides?.forEach(ride => {
        const date = ride.created_at.split('T')[0];
        if (!trends[date]) {
          trends[date] = { created: 0, completed: 0, cancelled: 0 };
        }
        trends[date].created++;
        if (ride.status === 'completed') trends[date].completed++;
        if (ride.status === 'cancelled') trends[date].cancelled++;
      });

      res.json({
        success: true,
        data: {
          period,
          trends: Object.entries(trends).map(([date, data]) => ({
            date,
            ...data
          }))
        }
      });
    } catch (error) {
      console.error('Ride analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ride analytics'
      });
    }
  },

  async getPaymentAnalytics(req, res) {
    try {
      const { period = '7d' } = req.query;
      
      let daysBack = 7;
      switch (period) {
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
      }

      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      // Get payment trends
      const { data: payments } = await supabase
        .from('service_fee_payments')
        .select('created_at, status, amount')
        .gte('created_at', startDate)
        .order('created_at');

      // Group by date
      const trends = {};
      payments?.forEach(payment => {
        const date = payment.created_at.split('T')[0];
        if (!trends[date]) {
          trends[date] = { total: 0, completed: 0, failed: 0, revenue: 0 };
        }
        trends[date].total++;
        if (payment.status === 'completed') {
          trends[date].completed++;
          trends[date].revenue += parseFloat(payment.amount || 0);
        }
        if (payment.status === 'failed') trends[date].failed++;
      });

      res.json({
        success: true,
        data: {
          period,
          trends: Object.entries(trends).map(([date, data]) => ({
            date,
            ...data
          }))
        }
      });
    } catch (error) {
      console.error('Payment analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment analytics'
      });
    }
  },

  // Driver Verification Management
  async getAllVerifications(req, res) {
    try {
      const { status } = req.query;

      let query = supabase
        .from('driver_verification_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: documents, error } = await query;
      if (error) throw error;

      // Fetch user profiles separately to avoid the ambiguous FK embed
      // (driver_verification_documents has both user_id and reviewed_by → user_profiles)
      const userIds = [...new Set((documents || []).map((d) => d.user_id).filter(Boolean))];

      let profilesById = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, first_name, email, phone, user_type')
          .in('id', userIds);

        if (profileError) throw profileError;
        profilesById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      }

      const verifications = (documents || []).map((d) => ({
        ...d,
        user_profiles: profilesById[d.user_id] || null
      }));

      res.json({
        success: true,
        data: { verifications }
      });
    } catch (error) {
      console.error('Get verifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verifications',
        error: error.message
      });
    }
  },

  async reviewDocument(req, res) {
    try {
      const { documentId } = req.params;
      const { status, rejectionReason } = req.body;

      if (!['verified', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be "verified" or "rejected"'
        });
      }

      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting a document'
        });
      }

      const updateData = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: req.user.id
      };

      if (status === 'rejected') {
        updateData.rejection_reason = rejectionReason;
      }

      const { data, error } = await supabase
        .from('driver_verification_documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: `Document ${status} successfully`,
        data
      });
    } catch (error) {
      console.error('Review document error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to review document',
        error: error.message
      });
    }
  }
};

module.exports = adminController;