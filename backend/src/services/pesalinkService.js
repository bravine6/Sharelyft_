const axios = require('axios');

class PesalinkService {
  constructor() {
    this.apiKey = process.env.PESALINK_API_KEY;
    this.merchantId = process.env.PESALINK_MERCHANT_ID;
    this.baseURL = process.env.PESALINK_ENVIRONMENT === 'production' 
      ? 'https://api.pesalink.co.ke' 
      : 'https://sandbox.pesalink.co.ke';
    
    // Validate configuration (optional for now since PesaLink might not be fully set up)
    this.validateConfig();
  }

  validateConfig() {
    // For now, just log if credentials are missing
    if (!this.apiKey || !this.merchantId) {
      console.warn('PesaLink credentials not configured. Service will use mock responses.');
    }
  }

  formatPhoneNumber(phone) {
    // Remove any non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      // Convert 0712345678 to 254712345678
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      // Convert 712345678 to 254712345678
      cleaned = '254' + cleaned;
    } else if (!cleaned.startsWith('254')) {
      // If doesn't start with 254, assume it's Kenyan number
      cleaned = '254' + cleaned;
    }
    
    // Validate length (should be 12 digits for 254XXXXXXXXX)
    if (cleaned.length !== 12) {
      throw new Error('Invalid phone number format');
    }
    
    return cleaned;
  }

  async initiatePayment(phoneNumber, amount, reference, description) {
    try {
      // If no real credentials, return mock response
      if (!this.apiKey || !this.merchantId) {
        return this.mockPaymentResponse(phoneNumber, amount, reference);
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      const paymentData = {
        merchant_id: this.merchantId,
        phone_number: formattedPhone,
        amount: amount,
        reference: reference,
        description: description,
        callback_url: `${process.env.BACKEND_URL || 'https://sharelyft-backend.vercel.app'}/api/pesalink/callback`,
        timestamp: new Date().toISOString()
      };

      console.log('PesaLink Payment Request:', paymentData);

      const response = await axios.post(
        `${this.baseURL}/api/payments/initiate`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        transaction_id: response.data.transaction_id,
        status: response.data.status,
        message: response.data.message,
        reference: reference
      };
    } catch (error) {
      console.error('PesaLink Payment Error:', error.response?.data || error.message);
      
      // Return mock response on error for demo purposes
      return this.mockPaymentResponse(phoneNumber, amount, reference);
    }
  }

  async checkPaymentStatus(transactionId) {
    try {
      if (!this.apiKey || !this.merchantId) {
        return this.mockStatusResponse(transactionId);
      }

      const response = await axios.get(
        `${this.baseURL}/api/payments/${transactionId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        transaction_id: transactionId,
        status: response.data.status,
        amount: response.data.amount,
        phone_number: response.data.phone_number,
        completed_at: response.data.completed_at
      };
    } catch (error) {
      console.error('PesaLink Status Check Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  parseCallback(callbackData) {
    try {
      // Parse PesaLink callback format
      return {
        transaction_id: callbackData.transaction_id,
        status: callbackData.status,
        amount: callbackData.amount,
        phone_number: callbackData.phone_number,
        reference: callbackData.reference,
        completed_at: callbackData.completed_at,
        result_code: callbackData.result_code === 'SUCCESS' ? 0 : 1,
        result_description: callbackData.message
      };
    } catch (error) {
      console.error('PesaLink Callback Parse Error:', error.message);
      throw new Error('Failed to parse PesaLink callback');
    }
  }

  // Mock responses for demo/testing
  mockPaymentResponse(phoneNumber, amount, reference) {
    return {
      success: true,
      transaction_id: 'MOCK_PL_' + Date.now(),
      status: 'PENDING',
      message: 'Payment initiated successfully. User will receive SMS prompt.',
      reference: reference,
      mock: true
    };
  }

  mockStatusResponse(transactionId) {
    // Simulate random success/failure for demo
    const isSuccess = Math.random() > 0.3; // 70% success rate
    
    return {
      success: true,
      transaction_id: transactionId,
      status: isSuccess ? 'COMPLETED' : 'FAILED',
      amount: 50,
      phone_number: '254712345678',
      completed_at: isSuccess ? new Date().toISOString() : null,
      mock: true
    };
  }

  // Validate bank account for PesaLink (banks participating in PesaLink)
  validateBankAccount(bankCode, accountNumber) {
    const pesalinkBanks = [
      'KCB', 'EQUITY', 'COOP', 'ABSA', 'STANBIC', 'STANDARD', 'DTB', 'I&M',
      'FAMILY', 'GULF', 'MIDDLE_EAST', 'PRIME', 'VICTORIA', 'SIDIAN'
    ];

    if (!pesalinkBanks.includes(bankCode.toUpperCase())) {
      return {
        valid: false,
        error: 'Bank not participating in PesaLink network'
      };
    }

    // Basic account number validation
    if (!accountNumber || accountNumber.length < 6) {
      return {
        valid: false,
        error: 'Invalid account number format'
      };
    }

    return {
      valid: true,
      bank_code: bankCode.toUpperCase(),
      account_number: accountNumber
    };
  }
}

module.exports = new PesalinkService();