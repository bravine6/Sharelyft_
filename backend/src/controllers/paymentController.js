const stripeService = require('../services/stripeService');
const pesalinkService = require('../services/pesalinkService');
const supabase = require('../config/supabase');

const paymentController = {
  // Get available payment methods
  async getPaymentMethods(req, res) {
    try {
      const methods = [
        {
          id: 'stripe',
          name: 'Credit/Debit Card',
          description: 'Pay with Visa, Mastercard, or other cards',
          icon: 'credit-card',
          enabled: !!process.env.STRIPE_SECRET_KEY,
          currencies: ['USD'],
          processing_fee: '2.9% + $0.30'
        },
        {
          id: 'pesalink',
          name: 'PesaLink',
          description: 'Pay directly from your bank account',
          icon: 'bank',
          enabled: true, // Always available as fallback
          currencies: ['KES'],
          processing_fee: 'KSh 5'
        }
      ];

      res.json({
        success: true,
        payment_methods: methods.filter(method => method.enabled),
        service_fee_amount: 50,
        currency: 'KES'
      });
    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment methods'
      });
    }
  },

  // Initiate service fee payment with multiple options
  async initiateServiceFeePayment(req, res) {
    try {
      const { rideRequestId, paymentMethod, phoneNumber, bankAccount } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!rideRequestId || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Ride request ID and payment method are required'
        });
      }

      // Check if ride request exists and user is authorized
      const { data: rideRequest, error: rideError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          ride:ride_id(
            id,
            driver_id,
            origin,
            destination,
            departure_time
          )
        `)
        .eq('id', rideRequestId)
        .single();

      if (rideError || !rideRequest) {
        return res.status(404).json({
          success: false,
          message: 'Ride request not found'
        });
      }

      // Check authorization
      const isDriver = rideRequest.ride.driver_id === userId;
      const isPassenger = rideRequest.passenger_id === userId;

      if (!isDriver && !isPassenger) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized for this payment'
        });
      }

      // Check if user has already paid
      const { data: existingPayment } = await supabase
        .from('service_fee_payments')
        .select('*')
        .eq('ride_request_id', rideRequestId)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .single();

      if (existingPayment) {
        return res.status(400).json({
          success: false,
          message: 'Service fee already paid'
        });
      }

      // Generate unique transaction reference
      const transactionRef = `SL${Date.now()}${userId.slice(-4)}`;
      const amount = 50; // KSh 50 service fee

      let paymentResult;
      
      // Process payment based on method
      switch (paymentMethod) {
        case 'stripe':
          paymentResult = await paymentController.processStripePayment(amount, transactionRef, rideRequest);
          break;
        case 'pesalink':
          if (!phoneNumber && !bankAccount) {
            return res.status(400).json({
              success: false,
              message: 'Phone number or bank account required for PesaLink'
            });
          }
          paymentResult = await paymentController.processPesalinkPayment(phoneNumber || bankAccount, amount, transactionRef, rideRequest);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported payment method'
          });
      }

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: paymentResult.error || 'Payment initiation failed'
        });
      }

      // Store payment record
      const { data: payment, error: paymentError } = await supabase
        .from('service_fee_payments')
        .insert({
          id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ride_request_id: rideRequestId,
          user_id: userId,
          amount: amount,
          payment_method_type: paymentMethod,
          bank_account: bankAccount,
          transaction_reference: transactionRef,
          external_payment_id: paymentResult.external_id,
          external_reference: paymentResult.external_reference,
          status: paymentResult.status || 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Payment record creation error:', paymentError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create payment record'
        });
      }

      res.json({
        success: true,
        message: paymentResult.message || 'Payment initiated successfully',
        data: {
          paymentId: payment.id,
          transactionReference: transactionRef,
          amount: amount,
          paymentMethod: paymentMethod,
          ...paymentResult.data
        }
      });

    } catch (error) {
      console.error('Service fee payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Payment initiation failed'
      });
    }
  },

  // Process Stripe payment
  async processStripePayment(amount, reference, rideRequest) {
    try {
      const result = await stripeService.createPaymentIntent(
        amount,
        'usd', // Convert KSh to USD
        {
          ride_request_id: rideRequest.id,
          reference: reference,
          route: `${rideRequest.ride.origin} to ${rideRequest.ride.destination}`
        }
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        external_id: result.paymentIntent.id,
        external_reference: reference,
        status: 'requires_payment_method',
        message: 'Payment intent created. Complete payment on frontend.',
        data: {
          client_secret: result.client_secret,
          amount_usd: result.amount
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },


  // Process PesaLink payment
  async processPesalinkPayment(phoneOrAccount, amount, reference, rideRequest) {
    try {
      const result = await pesalinkService.initiatePayment(
        phoneOrAccount,
        amount,
        reference,
        `ShareLyft Service Fee - ${rideRequest.ride.origin} to ${rideRequest.ride.destination}`
      );

      return {
        success: true,
        external_id: result.transaction_id,
        external_reference: reference,
        status: 'pending',
        message: result.message,
        data: {
          transaction_id: result.transaction_id,
          mock: result.mock
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = paymentController;