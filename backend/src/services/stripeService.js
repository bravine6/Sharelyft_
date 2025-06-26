const Stripe = require('stripe');

class StripeService {
  constructor() {
    this.stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Validate required environment variables
    this.validateConfig();
  }

  validateConfig() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }
  }

  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      // Convert KSh to USD (rough conversion for demo - 1 USD = 150 KSh)
      // In production, use real exchange rates
      const amountInCents = currency === 'usd' 
        ? Math.round((amount / 150) * 100) // Convert KSh to USD cents
        : amount * 100; // Amount in cents

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency,
        metadata: {
          ...metadata,
          original_amount_ksh: amount,
          service: 'sharelyft',
          fee_type: 'service_fee'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentIntent: paymentIntent,
        client_secret: paymentIntent.client_secret,
        amount: amountInCents,
        currency: currency
      };
    } catch (error) {
      console.error('Stripe Payment Intent Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        success: true,
        status: paymentIntent.status,
        paymentIntent: paymentIntent
      };
    } catch (error) {
      console.error('Stripe Payment Confirmation Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createCustomer(email, name, phone) {
    try {
      const customer = await this.stripe.customers.create({
        email: email,
        name: name,
        phone: phone,
        metadata: {
          service: 'sharelyft'
        }
      });

      return {
        success: true,
        customer: customer
      };
    } catch (error) {
      console.error('Stripe Customer Creation Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processWebhook(body, signature) {
    try {
      if (!this.webhookSecret) {
        throw new Error('Webhook secret not configured');
      }

      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret
      );

      return {
        success: true,
        event: event
      };
    } catch (error) {
      console.error('Stripe Webhook Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async refundPayment(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason: reason,
        metadata: {
          service: 'sharelyft',
          refund_type: 'service_fee'
        }
      };

      if (amount) {
        refundData.amount = amount;
      }

      const refund = await this.stripe.refunds.create(refundData);

      return {
        success: true,
        refund: refund
      };
    } catch (error) {
      console.error('Stripe Refund Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get payment method for card details
  async getPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      return {
        success: true,
        paymentMethod: paymentMethod
      };
    } catch (error) {
      console.error('Stripe Payment Method Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Format currency for display
  formatAmount(amount, currency = 'usd') {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
    return formatter.format(amount / 100);
  }
}

module.exports = new StripeService();