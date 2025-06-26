const mpesaService = require('../services/mpesaService');
const { supabase } = require('../config/supabase');

const mpesaController = {
  // Initiate STK Push for service fee payment
  async initiateServiceFeePayment(req, res) {
    try {
      const { phoneNumber, rideRequestId } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!phoneNumber || !rideRequestId) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and ride request ID are required'
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

      // Check if user is either the driver or passenger of this ride
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
      
      // Service fee amount (50 KSh)
      const amount = 50;
      
      // Create callback URL
      const callbackUrl = `${process.env.BACKEND_URL || 'https://sharelyft-backend.vercel.app'}/api/mpesa/callback`;
      
      // Initiate STK Push
      const stkResponse = await mpesaService.initiateSTKPush(
        phoneNumber,
        amount,
        transactionRef,
        `ShareLyft Service Fee - ${rideRequest.ride.origin} to ${rideRequest.ride.destination}`,
        callbackUrl
      );

      if (stkResponse.ResponseCode !== '0') {
        return res.status(400).json({
          success: false,
          message: stkResponse.ResponseDescription || 'Payment initiation failed'
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
          payment_method_type: 'mpesa',
          mpesa_phone: phoneNumber,
          transaction_reference: transactionRef,
          checkout_request_id: stkResponse.CheckoutRequestID,
          merchant_request_id: stkResponse.MerchantRequestID,
          status: 'pending',
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
        message: 'Payment initiated successfully. Please check your phone for M-Pesa prompt.',
        data: {
          checkoutRequestId: stkResponse.CheckoutRequestID,
          merchantRequestId: stkResponse.MerchantRequestID,
          transactionReference: transactionRef,
          amount: amount,
          paymentId: payment.id
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

  // M-Pesa callback handler
  async handleCallback(req, res) {
    try {
      console.log('M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));

      const callbackData = mpesaService.parseCallback(req.body);
      
      // Find the payment record
      const { data: payment, error: findError } = await supabase
        .from('service_fee_payments')
        .select('*')
        .eq('checkout_request_id', callbackData.checkoutRequestId)
        .single();

      if (findError || !payment) {
        console.error('Payment record not found:', callbackData.checkoutRequestId);
        return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
      }

      // Update payment status
      let updateData = {
        mpesa_receipt_number: callbackData.mpesaReceiptNumber,
        transaction_date: callbackData.transactionDate ? new Date(callbackData.transactionDate.toString()) : null,
        result_code: callbackData.resultCode,
        result_description: callbackData.resultDesc,
        updated_at: new Date().toISOString()
      };

      if (callbackData.resultCode === 0) {
        // Payment successful
        updateData.status = 'completed';
        updateData.paid_at = new Date().toISOString();
      } else {
        // Payment failed
        updateData.status = 'failed';
      }

      const { error: updateError } = await supabase
        .from('service_fee_payments')
        .update(updateData)
        .eq('id', payment.id);

      if (updateError) {
        console.error('Failed to update payment:', updateError);
      }

      // If payment successful, check if both parties have paid and unlock connection
      if (callbackData.resultCode === 0) {
        await this.checkAndUnlockConnection(payment.ride_request_id);
      }

      // Acknowledge receipt to M-Pesa
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Success'
      });

    } catch (error) {
      console.error('Callback handling error:', error);
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Success'
      });
    }
  },

  // Check payment status
  async checkPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.user.id;

      const { data: payment, error } = await supabase
        .from('service_fee_payments')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', userId)
        .single();

      if (error || !payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // If payment is still pending, query M-Pesa for status
      if (payment.status === 'pending' && payment.checkout_request_id) {
        try {
          const queryResult = await mpesaService.queryTransaction(payment.checkout_request_id);
          
          if (queryResult.ResultCode === '0') {
            // Update payment as completed
            await supabase
              .from('service_fee_payments')
              .update({
                status: 'completed',
                paid_at: new Date().toISOString(),
                result_code: 0,
                result_description: 'Payment completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', paymentId);

            payment.status = 'completed';
            await this.checkAndUnlockConnection(payment.ride_request_id);
          }
        } catch (queryError) {
          console.error('Payment query error:', queryError);
        }
      }

      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amount,
          mpesaReceiptNumber: payment.mpesa_receipt_number,
          transactionDate: payment.transaction_date,
          createdAt: payment.created_at
        }
      });

    } catch (error) {
      console.error('Payment status check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check payment status'
      });
    }
  },

  // Helper function to check if both parties paid and unlock connection
  async checkAndUnlockConnection(rideRequestId) {
    try {
      // Get the ride request details
      const { data: rideRequest } = await supabase
        .from('ride_requests')
        .select(`
          *,
          rides!inner(driver_id)
        `)
        .eq('id', rideRequestId)
        .single();

      if (!rideRequest) return;

      // Check if both driver and passenger have paid
      const { data: payments } = await supabase
        .from('service_fee_payments')
        .select('user_id')
        .eq('ride_request_id', rideRequestId)
        .eq('status', 'completed');

      const driverId = rideRequest.rides.driver_id;
      const passengerId = rideRequest.passenger_id;

      const driverPaid = payments.some(p => p.user_id === driverId);
      const passengerPaid = payments.some(p => p.user_id === passengerId);

      if (driverPaid && passengerPaid) {
        // Unlock the connection
        await supabase
          .from('ride_requests')
          .update({
            connection_unlocked: true,
            chat_enabled: true,
            contact_info_revealed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', rideRequestId);

        console.log(`Connection unlocked for ride request: ${rideRequestId}`);
      }
    } catch (error) {
      console.error('Error checking connection unlock:', error);
    }
  }
};

module.exports = mpesaController;