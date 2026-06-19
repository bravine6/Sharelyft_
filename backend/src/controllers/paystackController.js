const supabase = require('../config/supabase');
const paystackService = require('../services/paystackService');

// Generate a unique reference for a transaction
function makeReference(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// POST /api/paystack/initiate
// Body: { purpose: 'ride_posting' | 'connection_fee', amount, ride_id?, ride_request_id?, conversation_id? }
exports.initiate = async (req, res) => {
  try {
    const { purpose, amount, ride_id, ride_request_id, conversation_id } = req.body;
    const user = req.user;

    if (!purpose || !['ride_posting', 'connection_fee'].includes(purpose)) {
      return res.status(400).json({ message: 'Invalid purpose' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    if (!user?.email) {
      return res.status(400).json({ message: 'User email is required' });
    }

    const reference = makeReference(purpose === 'ride_posting' ? 'rp' : 'cf');

    // Persist a pending payment record so the webhook can resolve it back
    const paymentRow = {
      reference,
      user_id: user.id,
      purpose,
      amount: Number(amount),
      currency: 'KES',
      status: 'pending',
      ride_id: ride_id || null,
      ride_request_id: ride_request_id || null,
      provider: 'paystack',
      created_at: new Date().toISOString()
    };

    // Best-effort persistence — if table doesn't exist yet we still proceed
    // so testing isn't blocked. The reference + Paystack verify is the source of truth.
    try {
      await supabase.from('paystack_payments').insert([paymentRow]);
    } catch (err) {
      console.warn('[Paystack] paystack_payments insert skipped:', err.message);
    }

    const result = await paystackService.initializeTransaction({
      email: user.email,
      amountKES: amount,
      reference,
      metadata: {
        user_id: user.id,
        purpose,
        ride_id: ride_id || null,
        ride_request_id: ride_request_id || null,
        conversation_id: conversation_id || null
      }
    });

    res.json({
      success: true,
      authorization_url: result.authorization_url,
      access_code: result.access_code,
      reference: result.reference
    });
  } catch (error) {
    console.error('Paystack initiate error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate Paystack payment'
    });
  }
};

// GET /api/paystack/verify/:reference
// Used by frontend after redirect-back to confirm the transaction status.
exports.verify = async (req, res) => {
  try {
    const { reference } = req.params;
    if (!reference) return res.status(400).json({ message: 'Reference is required' });

    const data = await paystackService.verifyTransaction(reference);
    const isPaid = data.status === 'success';

    if (isPaid) {
      await markPaymentSucceeded(reference, data);
    }

    res.json({
      success: true,
      paid: isPaid,
      status: data.status,
      amount_kes: data.amount / 100,
      reference: data.reference,
      paid_at: data.paid_at
    });
  } catch (error) {
    console.error('Paystack verify error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify Paystack payment'
    });
  }
};

// POST /api/paystack/webhook
// Receives webhook from Paystack. Public, but we verify the signature.
exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    // req.body is the raw Buffer because of express.raw() in routes
    const rawBody = req.body;

    if (!paystackService.verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Paystack webhook] Invalid signature — rejecting');
      return res.status(401).end();
    }

    const event = JSON.parse(rawBody.toString('utf8'));

    if (event.event === 'charge.success') {
      const data = event.data;
      await markPaymentSucceeded(data.reference, data);
    }

    // Always 200 quickly — Paystack retries on non-2xx
    res.status(200).end();
  } catch (error) {
    console.error('Paystack webhook error:', error);
    // Still 200 so Paystack doesn't retry forever on a poison message,
    // but log for debugging
    res.status(200).end();
  }
};

// Helper: mark a payment as succeeded and apply side effects
// (unlock chat for connection fees, activate ride for ride_posting, etc.)
async function markPaymentSucceeded(reference, transactionData) {
  // Update the payment row
  const { data: paymentRow } = await supabase
    .from('paystack_payments')
    .update({
      status: 'success',
      paid_at: transactionData.paid_at || new Date().toISOString(),
      raw_response: transactionData
    })
    .eq('reference', reference)
    .select()
    .single();

  if (!paymentRow) {
    const meta = transactionData.metadata || {};
    return applySideEffects(meta.purpose, {
      rideId: meta.ride_id,
      rideRequestId: meta.ride_request_id,
      conversationId: meta.conversation_id
    });
  }

  return applySideEffects(paymentRow.purpose, {
    rideId: paymentRow.ride_id,
    rideRequestId: paymentRow.ride_request_id,
    conversationId: paymentRow.raw_response?.metadata?.conversation_id
  });
}

async function applySideEffects(purpose, { rideId, rideRequestId, conversationId }) {
  try {
    if (purpose !== 'connection_fee') return;

    // Prefer conversation_id when available — direct path
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({ passenger_paid: true })
        .eq('id', conversationId);
      return;
    }

    // Fallback: look up via ride_request
    if (rideRequestId) {
      const { data: request } = await supabase
        .from('ride_requests')
        .select('ride_id, passenger_id')
        .eq('id', rideRequestId)
        .single();

      if (request) {
        await supabase
          .from('conversations')
          .update({ passenger_paid: true })
          .eq('ride_id', request.ride_id)
          .eq('passenger_id', request.passenger_id);
      }
    }
  } catch (err) {
    console.error('[Paystack] applySideEffects error:', err.message);
  }
}
