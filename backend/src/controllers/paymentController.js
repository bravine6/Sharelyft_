const supabase = require('../config/supabase');

// Fixed service fees (KSh 50 each)
const DRIVER_SERVICE_FEE = 50.00;
const PASSENGER_SERVICE_FEE = 50.00;

// Process service fee payment (driver or passenger pays KSh 50 to ShareLyft)
exports.payServiceFee = async (req, res) => {
  try {
    const { ride_request_id, payment_method_type, payment_method_id, payer_type } = req.body;
    const payer_id = req.user.id;

    // Validate input
    if (!ride_request_id || !payment_method_type || !payer_type) {
      return res.status(400).json({ message: 'Ride request ID, payment method, and payer type are required' });
    }

    if (!['driver', 'passenger'].includes(payer_type)) {
      return res.status(400).json({ message: 'Payer type must be either driver or passenger' });
    }

    // Get ride request details
    const { data: rideRequest, error: requestError } = await supabase
      .from('ride_requests')
      .select(`
        *,
        ride:ride_id (
          *,
          driver:driver_id (*)
        )
      `)
      .eq('id', ride_request_id)
      .single();

    if (requestError || !rideRequest) {
      return res.status(404).json({ message: 'Ride request not found' });
    }

    if (rideRequest.status !== 'accepted') {
      return res.status(400).json({ message: 'Service fee can only be paid for accepted ride requests' });
    }

    // Verify user is authorized to pay this fee
    const isDriver = rideRequest.ride.driver_id === payer_id;
    const isPassenger = rideRequest.passenger_id === payer_id;
    
    if (payer_type === 'driver' && !isDriver) {
      return res.status(403).json({ message: 'Only the driver can pay the driver service fee' });
    }
    
    if (payer_type === 'passenger' && !isPassenger) {
      return res.status(403).json({ message: 'Only the passenger can pay the passenger service fee' });
    }

    // Check if payment already exists for this payer
    const { data: existingPayment } = await supabase
      .from('service_fee_payments')
      .select('*')
      .eq('ride_request_id', ride_request_id)
      .eq('payer_id', payer_id)
      .eq('payer_type', payer_type)
      .single();

    if (existingPayment) {
      return res.status(400).json({ message: `${payer_type} service fee already paid for this ride` });
    }

    // Determine service fee amount
    const serviceFee = payer_type === 'driver' ? DRIVER_SERVICE_FEE : PASSENGER_SERVICE_FEE;

    // Create service fee payment record
    const paymentData = {
      ride_request_id: ride_request_id,
      payer_id: payer_id,
      payer_type: payer_type,
      amount: serviceFee,
      payment_method_type: payment_method_type,
      payment_method_id: payment_method_id,
      status: 'pending'
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (paymentError) {
      return res.status(400).json({ message: paymentError.message });
    }

    // Process payment based on method type
    let paymentResult;
    switch (payment_method_type) {
      case 'mpesa':
        paymentResult = await processMpesaPayment(payment, req.body.mpesa_phone);
        break;
      case 'card':
        paymentResult = await processCardPayment(payment, payment_method_id);
        break;
      case 'wallet':
        paymentResult = await processWalletPayment(payment, payer_id);
        break;
      default:
        return res.status(400).json({ message: 'Unsupported payment method' });
    }

    if (!paymentResult.success) {
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ 
          status: 'failed', 
          failure_reason: paymentResult.error,
          failed_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      return res.status(400).json({ message: paymentResult.error });
    }

    // Update payment with external reference
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'processing',
        external_payment_id: paymentResult.external_id,
        external_reference: paymentResult.reference,
        processed_at: new Date().toISOString()
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Error updating payment status' });
    }

    res.status(201).json({
      payment: updatedPayment,
      payment_url: paymentResult.payment_url,
      message: 'Payment initiated successfully'
    });

  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Confirm payment completion
exports.confirmPayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { external_payment_id } = req.body;

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'processing') {
      return res.status(400).json({ message: 'Payment is not in processing state' });
    }

    // Verify payment with external provider
    let verificationResult;
    switch (payment.payment_method_type) {
      case 'mpesa':
        verificationResult = await verifyMpesaPayment(external_payment_id);
        break;
      case 'card':
        verificationResult = await verifyCardPayment(external_payment_id);
        break;
      case 'wallet':
        verificationResult = { success: true }; // Wallet payments are instant
        break;
      default:
        return res.status(400).json({ message: 'Unsupported payment method' });
    }

    if (!verificationResult.success) {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: verificationResult.error,
          failed_at: new Date().toISOString()
        })
        .eq('id', payment_id);

      return res.status(400).json({ message: verificationResult.error });
    }

    // Payment successful - move to escrow
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', payment_id);

    // Create escrow record
    await supabase
      .from('payment_escrow')
      .insert([{
        payment_id: payment_id,
        amount: payment.driver_amount,
        status: 'held'
      }]);

    // Record platform earnings
    await supabase
      .from('platform_earnings')
      .insert([{
        payment_id: payment_id,
        amount: payment.platform_fee,
        fee_type: 'platform_fee'
      }]);

    res.json({ message: 'Payment confirmed and moved to escrow' });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Release payment from escrow (after ride completion)
exports.releasePayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { release_reason = 'ride_completed' } = req.body;

    // Get payment and escrow details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        payment_escrow (*)
      `)
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const escrow = payment.payment_escrow[0];
    if (!escrow || escrow.status !== 'held') {
      return res.status(400).json({ message: 'No funds in escrow for this payment' });
    }

    // Release funds from escrow
    await supabase
      .from('payment_escrow')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        release_reason: release_reason
      })
      .eq('id', escrow.id);

    // In a real implementation, you would transfer funds to driver's account here
    // For now, we'll just update the status

    res.json({ message: 'Payment released from escrow successfully' });

  } catch (error) {
    console.error('Error releasing payment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get payment history for a user
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        ride_request:ride_request_id (
          *,
          ride:ride_id (
            origin,
            destination,
            departure_time
          )
        ),
        payer:payer_id (name),
        recipient:recipient_id (name)
      `)
      .or(`payer_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json(payments);

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's wallet balance
exports.getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: wallet, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      return res.status(500).json({ message: error.message });
    }

    res.json({ balance: wallet?.balance || 0 });

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add funds to wallet
exports.topUpWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, payment_method_type, payment_method_id } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    // Process external payment first
    let paymentResult;
    switch (payment_method_type) {
      case 'mpesa':
        paymentResult = await processMpesaPayment({ total_amount: amount }, req.body.mpesa_phone);
        break;
      case 'card':
        paymentResult = await processCardPayment({ total_amount: amount }, payment_method_id);
        break;
      default:
        return res.status(400).json({ message: 'Unsupported payment method for wallet top-up' });
    }

    if (!paymentResult.success) {
      return res.status(400).json({ message: paymentResult.error });
    }

    // Get or create wallet
    let { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create it
      const { data: newWallet, error: createError } = await supabase
        .from('user_wallets')
        .insert([{ user_id: userId, balance: 0 }])
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ message: createError.message });
      }
      wallet = newWallet;
    } else if (walletError) {
      return res.status(500).json({ message: walletError.message });
    }

    // Update wallet balance
    const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
    await supabase
      .from('user_wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id);

    // Record transaction
    await supabase
      .from('wallet_transactions')
      .insert([{
        wallet_id: wallet.id,
        transaction_type: 'credit',
        amount: amount,
        balance_after: newBalance,
        description: `Wallet top-up via ${payment_method_type}`,
        reference_type: 'topup',
        reference_id: paymentResult.external_id
      }]);

    res.json({ 
      message: 'Wallet topped up successfully',
      new_balance: newBalance
    });

  } catch (error) {
    console.error('Error topping up wallet:', error);
    res.status(500).json({ message: error.message });
  }
};

// Payment method processing functions (mock implementations)
async function processMpesaPayment(payment, phoneNumber) {
  // Mock M-Pesa STK Push implementation
  // In production, integrate with Safaricom Daraja API
  console.log(`Processing M-Pesa payment of ${payment.total_amount} to ${phoneNumber}`);
  
  return {
    success: true,
    external_id: 'MPESA_' + Date.now(),
    reference: 'REF_' + Math.random().toString(36).substr(2, 9),
    payment_url: null // STK push doesn't need URL
  };
}

async function processCardPayment(payment, paymentMethodId) {
  // Mock Stripe payment implementation
  // In production, integrate with Stripe API
  console.log(`Processing card payment of ${payment.total_amount} with method ${paymentMethodId}`);
  
  return {
    success: true,
    external_id: 'STRIPE_' + Date.now(),
    reference: 'pi_' + Math.random().toString(36).substr(2, 24),
    payment_url: null
  };
}

async function processWalletPayment(payment, userId) {
  // Process wallet payment
  const { data: wallet, error } = await supabase
    .from('user_wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !wallet) {
    return { success: false, error: 'Wallet not found' };
  }

  if (wallet.balance < payment.total_amount) {
    return { success: false, error: 'Insufficient wallet balance' };
  }

  // Deduct from wallet
  const newBalance = parseFloat(wallet.balance) - parseFloat(payment.total_amount);
  await supabase
    .from('user_wallets')
    .update({ balance: newBalance })
    .eq('id', wallet.id);

  // Record transaction
  await supabase
    .from('wallet_transactions')
    .insert([{
      wallet_id: wallet.id,
      transaction_type: 'debit',
      amount: payment.total_amount,
      balance_after: newBalance,
      description: 'Payment for ride',
      reference_type: 'payment',
      reference_id: payment.id
    }]);

  return {
    success: true,
    external_id: 'WALLET_' + Date.now(),
    reference: 'WLT_' + Math.random().toString(36).substr(2, 9)
  };
}

async function verifyMpesaPayment(transactionId) {
  // Mock M-Pesa verification
  console.log(`Verifying M-Pesa payment: ${transactionId}`);
  return { success: true };
}

async function verifyCardPayment(paymentIntentId) {
  // Mock Stripe verification
  console.log(`Verifying Stripe payment: ${paymentIntentId}`);
  return { success: true };
}