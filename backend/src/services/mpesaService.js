const axios = require('axios');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortCode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.baseURL = process.env.MPESA_ENVIRONMENT === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
    
    // Validate required environment variables
    this.validateConfig();
  }

  validateConfig() {
    const required = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`M-Pesa configuration incomplete. Missing: ${missing.join(', ')}. M-Pesa payments will be disabled.`);
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
    }
  }

  async getAccessToken() {
    if (!this.isConfigured) {
      throw new Error('M-Pesa service is not configured');
    }
    
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('M-Pesa Auth Error:', error.response?.data || error.message);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  generatePassword(timestamp) {
    const data = this.shortCode + this.passkey + timestamp;
    return Buffer.from(data).toString('base64');
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

  async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc, callbackUrl) {
    if (!this.isConfigured) {
      throw new Error('M-Pesa service is not configured');
    }
    
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const stkPushData = {
        BusinessShortCode: this.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
      };

      console.log('STK Push Request:', stkPushData);

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('STK Push Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('STK Push Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'STK Push failed');
    }
  }

  async queryTransaction(checkoutRequestId) {
    if (!this.isConfigured) {
      throw new Error('M-Pesa service is not configured');
    }
    
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const queryData = {
        BusinessShortCode: this.shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        queryData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Transaction Query Error:', error.response?.data || error.message);
      throw new Error('Failed to query transaction status');
    }
  }

  parseCallback(callbackData) {
    try {
      const { Body } = callbackData;
      const { stkCallback } = Body;
      
      if (!stkCallback) {
        throw new Error('Invalid callback format');
      }

      const result = {
        merchantRequestId: stkCallback.MerchantRequestID,
        checkoutRequestId: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc,
        amount: null,
        mpesaReceiptNumber: null,
        transactionDate: null,
        phoneNumber: null
      };

      // If payment was successful, extract additional details
      if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata) {
        const { Item } = stkCallback.CallbackMetadata;
        
        Item.forEach(item => {
          switch (item.Name) {
            case 'Amount':
              result.amount = item.Value;
              break;
            case 'MpesaReceiptNumber':
              result.mpesaReceiptNumber = item.Value;
              break;
            case 'TransactionDate':
              result.transactionDate = item.Value;
              break;
            case 'PhoneNumber':
              result.phoneNumber = item.Value;
              break;
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Callback Parse Error:', error.message);
      throw new Error('Failed to parse M-Pesa callback');
    }
  }
}

module.exports = new MpesaService();