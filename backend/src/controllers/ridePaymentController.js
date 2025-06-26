const supabase = require('../config/supabase');

// Pay ride posting fee
exports.payRidePostingFee = async (req, res) => {
  try {
    const { user } = req;
    const { id: rideId } = req.params;
    const { payment_method_id, amount } = req.body;

    // Validate required fields
    if (!payment_method_id || !amount) {
      return res.status(400).json({ message: 'Payment method and amount are required' });
    }

    // Verify the ride belongs to the user and is in pending_payment status
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .eq('driver_id', user.id)
      .eq('status', 'pending_payment')
      .single();

    if (rideError || !ride) {
      return res.status(404).json({ message: 'Ride not found or not in pending payment status' });
    }

    // Verify the payment method belongs to the user and is verified
    const { data: paymentMethod, error: paymentError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', payment_method_id)
      .eq('user_id', user.user_id)
      .eq('is_verified', true)
      .single();

    if (paymentError || !paymentMethod) {
      return res.status(400).json({ message: 'Invalid or unverified payment method' });
    }

    // Validate amount (should be the service fee)
    const SERVICE_FEE = 50; // KES 50
    if (parseFloat(amount) !== SERVICE_FEE) {
      return res.status(400).json({ message: `Invalid amount. Service fee is KES ${SERVICE_FEE}` });
    }

    // Process payment based on payment method type
    let paymentSuccess = false;
    let transactionId = null;

    try {
      switch (paymentMethod.type) {
        case 'mpesa':
          // In production, integrate with Safaricom M-Pesa API
          // For demo purposes, simulate payment
          paymentSuccess = true;
          transactionId = `MP${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
          break;

        case 'card':
          // In production, integrate with Stripe or other card processor
          // For demo purposes, simulate payment
          paymentSuccess = true;
          transactionId = `CD${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
          break;

        case 'bank':
          // In production, integrate with bank API or payment processor
          // For demo purposes, simulate payment
          paymentSuccess = true;
          transactionId = `BK${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
          break;

        default:
          throw new Error('Unsupported payment method type');
      }

      if (!paymentSuccess) {
        throw new Error('Payment processing failed');
      }

      // Create payment record
      const { error: paymentRecordError } = await supabase
        .from('ride_payments')
        .insert([{
          ride_id: rideId,
          user_id: user.user_id,
          payment_method_id: payment_method_id,
          amount: amount,
          currency: 'KES',
          payment_type: 'service_fee',
          transaction_id: transactionId,
          status: 'completed',
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        }]);

      if (paymentRecordError) {
        console.error('Error creating payment record:', paymentRecordError);
        // Continue anyway since payment was processed
      }

      // Update ride status to active
      const { error: updateError } = await supabase
        .from('rides')
        .update({
          status: 'active',
          posted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', rideId);

      if (updateError) {
        console.error('Error updating ride status:', updateError);
        return res.status(500).json({ message: 'Payment processed but failed to activate ride' });
      }

      // Update payment method last used
      await supabase
        .from('payment_methods')
        .update({
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment_method_id);

      res.json({
        message: 'Payment processed successfully',
        transaction_id: transactionId,
        ride_id: rideId,
        status: 'completed'
      });

    } catch (paymentError) {
      console.error('Payment processing error:', paymentError);
      
      // Record failed payment
      await supabase
        .from('ride_payments')
        .insert([{
          ride_id: rideId,
          user_id: user.user_id,
          payment_method_id: payment_method_id,
          amount: amount,
          currency: 'KES',
          payment_type: 'service_fee',
          status: 'failed',
          error_message: paymentError.message,
          created_at: new Date().toISOString()
        }]);

      return res.status(400).json({ 
        message: 'Payment processing failed',
        error: paymentError.message 
      });
    }

  } catch (error) {
    console.error('Ride payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get ride payment history
exports.getRidePayments = async (req, res) => {
  try {
    const { user } = req;

    const { data, error } = await supabase
      .from('ride_payments')
      .select(`
        *,
        payment_methods (
          type,
          name,
          details:phone_number
        ),
        rides (
          origin,
          destination,
          departure_time
        )
      `)
      .eq('user_id', user.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get ride payments error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get payment statistics
exports.getPaymentStats = async (req, res) => {
  try {
    const { user } = req;

    // Get total payments made
    const { data: totalPayments, error: totalError } = await supabase
      .from('ride_payments')
      .select('amount')
      .eq('user_id', user.user_id)
      .eq('status', 'completed');

    if (totalError) {
      return res.status(400).json({ message: totalError.message });
    }

    // Get payment count by method
    const { data: paymentsByMethod, error: methodError } = await supabase
      .from('ride_payments')
      .select(`
        payment_methods (type),
        amount
      `)
      .eq('user_id', user.user_id)
      .eq('status', 'completed');

    if (methodError) {
      return res.status(400).json({ message: methodError.message });
    }

    // Calculate statistics
    const totalAmount = totalPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const totalTransactions = totalPayments.length;

    const methodStats = paymentsByMethod.reduce((acc, payment) => {
      const method = payment.payment_methods?.type || 'unknown';
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0 };
      }
      acc[method].count += 1;
      acc[method].amount += parseFloat(payment.amount);
      return acc;
    }, {});

    res.json({
      total_amount: totalAmount,
      total_transactions: totalTransactions,
      payment_methods: methodStats,
      currency: 'KES'
    });

  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ message: error.message });
  }
};