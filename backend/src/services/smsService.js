// SMS service backed by Africa's Talking.
//
// Replaces the previous Twilio implementation, which never worked reliably for
// Kenyan numbers without geo-permission approval. AT is the local default and
// works out of the box with a sandbox account.
//
// Env vars:
//   AT_API_KEY    — Africa's Talking API key
//   AT_USERNAME   — 'sandbox' for testing, your AT username for live
//   AT_SENDER_ID  — optional sender ID (default: AT picks one)

class SMSService {
  constructor() {
    this.apiKey = process.env.AT_API_KEY;
    this.username = process.env.AT_USERNAME;

    // Sandbox doesn't accept a custom sender ID — it returns InvalidSenderId.
    // Only honor AT_SENDER_ID for live accounts that have an approved sender.
    this.senderId =
      this.username && this.username !== 'sandbox' && process.env.AT_SENDER_ID
        ? process.env.AT_SENDER_ID
        : undefined;

    if (this.apiKey && this.username) {
      const AfricasTalking = require('africastalking')({
        apiKey: this.apiKey,
        username: this.username,
      });
      this.sms = AfricasTalking.SMS;
      this.enabled = true;
      console.log(`SMS service initialized with Africa's Talking (${this.username})`);
    } else {
      this.enabled = false;
      console.log("Africa's Talking credentials not found — SMS will be simulated");
    }
  }

  // Generate a 6-digit verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Normalize phone number to international format (Kenyan defaults)
  formatPhoneNumber(phoneNumber) {
    const cleaned = String(phoneNumber).replace(/[^+\d]/g, '');
    if (cleaned.startsWith('+254')) return cleaned;
    if (cleaned.startsWith('254')) return '+' + cleaned;
    if (cleaned.startsWith('0')) return '+254' + cleaned.substring(1);
    if (/^[7][0-9]{8}$/.test(cleaned)) return '+254' + cleaned;
    if (/^\d{10,15}$/.test(cleaned) && !cleaned.startsWith('+')) return '+' + cleaned;
    return cleaned;
  }

  // Core: send a raw SMS message
  async sendSMS(phoneNumber, message) {
    const to = this.formatPhoneNumber(phoneNumber);

    if (!this.enabled) {
      console.log(`[SMS DEV] To: ${to}`);
      console.log(`[SMS DEV] Message: ${message}`);
      return { success: true, sid: 'dev-' + Date.now(), to };
    }

    try {
      const options = { to: [to], message };
      if (this.senderId) options.from = this.senderId;

      const result = await this.sms.send(options);
      const recipient = result?.SMSMessageData?.Recipients?.[0];

      // AT returns Recipients with statusCode 101 (sent) or others (failed)
      // See: https://developers.africastalking.com/docs/sms/sending/python
      if (recipient && (recipient.statusCode === 101 || recipient.statusCode === 100)) {
        console.log(`[SMS] Sent to ${to} — messageId ${recipient.messageId}`);
        return {
          success: true,
          sid: recipient.messageId,
          status: recipient.status,
          to,
        };
      }

      // No recipient block or non-success status
      const errMsg = recipient?.status || result?.SMSMessageData?.Message || 'SMS send failed';
      console.error(`[SMS] Send failed to ${to}: ${errMsg}`, result);
      return { success: false, error: errMsg, to };
    } catch (error) {
      console.error(`[SMS] Send error to ${to}:`, error.message || error);
      throw error;
    }
  }

  // Send a verification code via SMS. The code itself is generated and stored
  // by the auth controller; this just delivers it.
  async sendVerificationCode(phoneNumber, code) {
    const message = `Your ShareLyft verification code is: ${code}. This code expires in 10 minutes. Do not share it with anyone.`;
    const result = await this.sendSMS(phoneNumber, message);
    return { ...result, usesTwilioVerify: false };
  }

  // Kept for interface compatibility with the old Twilio Verify path.
  // AT doesn't have an equivalent — verification codes are checked against
  // our own DB by authController.verifyPhone. Always returns null so the
  // controller falls through to its custom-code-check path.
  async verifyPhoneCode(_phoneNumber, _code) {
    return null;
  }

  async sendWelcomeSMS(phoneNumber, name) {
    const message = `Hi ${name || 'there'}! Welcome to ShareLyft. Your phone number is verified. Start sharing rides today!`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendRideNotification(phoneNumber, message) {
    return await this.sendSMS(phoneNumber, `ShareLyft: ${message}`);
  }
}

module.exports = new SMSService();
