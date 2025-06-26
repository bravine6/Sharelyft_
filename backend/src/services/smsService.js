const crypto = require('crypto');

class SMSService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Twilio configuration
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioServiceSid = process.env.TWILIO_SERVICE_SID || 'VA08234ee8500dc47e3a337fec254ab483';
    
    // Initialize Twilio client if credentials are available
    if (this.twilioAccountSid && this.twilioAuthToken) {
      this.twilioClient = require('twilio')(this.twilioAccountSid, this.twilioAuthToken);
      this.twilioEnabled = true;
      console.log('Twilio SMS service initialized successfully');
    } else {
      this.twilioEnabled = false;
      console.log('Twilio credentials not found - SMS will be simulated');
    }
  }

  // Generate a 6-digit verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Format phone number to international format
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add Kenya country code if phone starts with 0
    if (cleaned.startsWith('0')) {
      return '+254' + cleaned.substring(1);
    }
    
    // Add + if it doesn't exist
    if (!cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  }

  async sendSMS(phoneNumber, message) {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      if (this.twilioEnabled) {
        // Use Twilio Verify API for better deliverability and international support
        if (this.twilioServiceSid) {
          console.log(`[SMS] Sending via Twilio Verify to ${formattedNumber}: ${message}`);
          
          // For verification codes, use Twilio Verify API
          if (message.includes('verification code')) {
            try {
              const verification = await this.twilioClient.verify.services(this.twilioServiceSid)
                .verifications
                .create({
                  to: formattedNumber,
                  channel: 'sms'
                });
              
              console.log(`[SMS] Twilio Verify sent successfully. SID: ${verification.sid}`);
              return { 
                success: true, 
                sid: verification.sid,
                status: verification.status,
                to: formattedNumber 
              };
            } catch (verifyError) {
              console.log('[SMS] Twilio Verify failed, falling back to regular SMS:', verifyError.message);
              // Fall back to regular SMS
            }
          }
          
          // Regular SMS fallback or for non-verification messages
          const result = await this.twilioClient.messages.create({
            body: message,
            messagingServiceSid: this.twilioServiceSid,
            to: formattedNumber
          });
          
          console.log(`[SMS] Twilio SMS sent successfully. SID: ${result.sid}`);
          return { 
            success: true, 
            sid: result.sid,
            status: result.status,
            to: formattedNumber 
          };
        } else {
          throw new Error('Twilio Service SID not configured');
        }
      } else {
        // Development mode - just log the SMS
        console.log(`[SMS DEV] To: ${formattedNumber}`);
        console.log(`[SMS DEV] Message: ${message}`);
        return { success: true, sid: 'dev-sid-' + Date.now(), to: formattedNumber };
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      
      // In development, don't throw error - just log and simulate success
      if (!this.twilioEnabled) {
        console.log('[SMS DEV] Simulating SMS send success despite error');
        return { success: true, sid: 'dev-error-sid-' + Date.now(), error: error.message };
      }
      
      throw error;
    }
  }

  async sendVerificationCode(phoneNumber, code) {
    // If using Twilio Verify, send verification request
    if (this.twilioEnabled && this.twilioServiceSid) {
      try {
        const formattedNumber = this.formatPhoneNumber(phoneNumber);
        const verification = await this.twilioClient.verify.services(this.twilioServiceSid)
          .verifications
          .create({
            to: formattedNumber,
            channel: 'sms'
          });
        
        console.log(`[SMS] Twilio Verify code sent to ${formattedNumber}. SID: ${verification.sid}`);
        return { 
          success: true, 
          sid: verification.sid,
          status: verification.status,
          to: formattedNumber,
          usesTwilioVerify: true
        };
      } catch (error) {
        console.log('[SMS] Twilio Verify failed, falling back to custom code:', error.message);
        // Fall back to sending custom code via regular SMS
      }
    }
    
    // Fallback: send custom verification code via regular SMS
    const message = `Your ShareLyft verification code is: ${code}. This code will expire in 10 minutes. Do not share this code with anyone.`;
    const result = await this.sendSMS(phoneNumber, message);
    return { ...result, usesTwilioVerify: false };
  }

  async verifyPhoneCode(phoneNumber, code) {
    // If using Twilio Verify, verify the code through Twilio
    if (this.twilioEnabled && this.twilioServiceSid) {
      try {
        const formattedNumber = this.formatPhoneNumber(phoneNumber);
        const verificationCheck = await this.twilioClient.verify.services(this.twilioServiceSid)
          .verificationChecks
          .create({
            to: formattedNumber,
            code: code
          });
        
        console.log(`[SMS] Twilio Verify check result: ${verificationCheck.status}`);
        return {
          success: verificationCheck.status === 'approved',
          status: verificationCheck.status,
          sid: verificationCheck.sid
        };
      } catch (error) {
        console.error('[SMS] Twilio Verify check failed:', error.message);
        return { success: false, error: error.message };
      }
    }
    
    // If not using Twilio Verify, return null to indicate manual verification needed
    return null;
  }

  async sendWelcomeSMS(phoneNumber, name) {
    const message = `Hi ${name}! Welcome to ShareLyft. Your phone number has been verified successfully. Start sharing rides and saving money today!`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendRideNotification(phoneNumber, message) {
    return await this.sendSMS(phoneNumber, `ShareLyft: ${message}`);
  }
}

module.exports = new SMSService();