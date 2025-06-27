const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.emailEnabled = false;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@sharelyft.com';
    
    // Configure email transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      // Use SendGrid in production
      if (process.env.SENDGRID_API_KEY) {
        this.transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        });
        this.emailEnabled = true;
        console.log('Email service initialized with SendGrid');
      } else {
        console.log('SendGrid API key not found - emails will be simulated');
      }
    } else {
      // Use Gmail SMTP for development
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          secure: true,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD // App password for Gmail
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        this.emailEnabled = true;
        console.log('Email service initialized with Gmail');
      } else {
        console.log('Gmail credentials not found - emails will be simulated');
      }
    }
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      if (!this.emailEnabled) {
        console.log(`[EMAIL DEV] To: ${to}`);
        console.log(`[EMAIL DEV] Subject: ${subject}`);
        console.log(`[EMAIL DEV] Body: ${text || html.replace(/<[^>]*>/g, '')}`);
        return { success: true, messageId: 'dev-email-' + Date.now() };
      }

      const mailOptions = {
        from: this.fromEmail,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      
      // In development/deployment without credentials, don't throw error
      if (!this.emailEnabled) {
        console.log('[EMAIL DEV] Simulating email send success despite error');
        return { success: true, messageId: 'dev-error-email-' + Date.now(), error: error.message };
      }
      
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    const subject = 'Reset Your ShareLyft Password';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ShareLyft</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>You recently requested to reset your password for your ShareLyft account. Click the button below to reset it.</p>
            <p><a href="${resetUrl}" class="button">Reset Password</a></p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This password reset link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>This email was sent by ShareLyft. If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendEmailVerificationEmail(email, verificationToken, verificationUrl) {
    const subject = 'Verify Your ShareLyft Email Address';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ShareLyft!</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for signing up for ShareLyft! To complete your registration, please verify your email address by clicking the button below.</p>
            <p><a href="${verificationUrl}" class="button">Verify Email</a></p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create a ShareLyft account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This email was sent by ShareLyft. If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendWelcomeEmail(email, name) {
    const subject = 'Welcome to ShareLyft!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to ShareLyft</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ShareLyft!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name}!</h2>
            <p>Welcome to ShareLyft, the smart way to share rides and save money!</p>
            <p>Your account has been successfully verified and you're ready to:</p>
            <ul>
              <li>Find and book rides with other travelers</li>
              <li>Share your own rides and earn money</li>
              <li>Connect with your community</li>
              <li>Save on transportation costs</li>
            </ul>
            <p>We're excited to have you as part of the ShareLyft community!</p>
          </div>
          <div class="footer">
            <p>This email was sent by ShareLyft. Happy riding!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }
}

module.exports = new EmailService();