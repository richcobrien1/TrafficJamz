// jamz-server/src/services/sms.service.js
// SMS Service using Twilio for text message invitations

/**
 * SMS Service for sending text message invitations
 * 
 * TWILIO Setup (Requires phone verification):
 * 1. Sign up: https://www.twilio.com/try-twilio
 * 2. Get Account SID, Auth Token, and Phone Number
 * 3. Add to .env:
 *    SMS_PROVIDER=twilio
 *    TWILIO_ACCOUNT_SID=ACxxxxxxxx
 *    TWILIO_AUTH_TOKEN=your_token
 *    TWILIO_PHONE_NUMBER=+15551234567
 * 
 * VONAGE Setup (Email only, no phone required):
 * 1. Sign up: https://dashboard.nexmo.com/sign-up
 * 2. Get API Key and API Secret from dashboard
 * 3. Add to .env:
 *    SMS_PROVIDER=vonage
 *    VONAGE_API_KEY=your_api_key
 *    VONAGE_API_SECRET=your_api_secret
 *    VONAGE_BRAND_NAME=TrafficJamz
 * 
 * Common settings:
 *    SMS_ENABLED=true (set to false to disable SMS)
 *    SMS_ENABLED=false for local development without sending
 */

const twilio = require('twilio');
const { Vonage } = require('@vonage/server-sdk');

class SMSService {
  constructor() {
    this.enabled = process.env.SMS_ENABLED === 'true';
    this.provider = process.env.SMS_PROVIDER || 'twilio';
    this.testMode = process.env.NODE_ENV !== 'production';
    
    if (!this.enabled) {
      console.log('📱 SMS Service disabled (SMS_ENABLED=false). Messages will be logged only.');
      return;
    }

    // Initialize based on provider
    if (this.provider === 'vonage') {
      this.initVonage();
    } else {
      this.initTwilio();
    }
  }

  initTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !this.phoneNumber) {
      console.warn('⚠️  SMS_ENABLED=true but Twilio credentials missing. SMS will be logged only.');
      this.enabled = false;
    } else {
      this.client = twilio(accountSid, authToken);
      console.log('✅ Twilio SMS Service initialized');
      console.log(`📱 Sending from: ${this.phoneNumber}`);
    }
  }

  initVonage() {
    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;
    this.brandName = process.env.VONAGE_BRAND_NAME || 'TrafficJamz';
    
    if (!apiKey || !apiSecret) {
      console.warn('⚠️  SMS_ENABLED=true but Vonage credentials missing. SMS will be logged only.');
      this.enabled = false;
    } else {
      this.client = new Vonage({
        apiKey: apiKey,
        apiSecret: apiSecret
      });
      console.log('✅ Vonage SMS Service initialized');
      console.log(`📱 Sending from: ${this.brandName}`);
    }
  }

  /**
   * Send group invitation via SMS
   * @param {string} phoneNumber - Recipient phone number (E.164 format: +1234567890)
   * @param {Object} invitationData - Invitation details
   * @returns {Promise<Object>} - Send result
   */
  async sendGroupInvitation(phoneNumber, invitationData) {
    const { groupName, inviterName, invitationLink, customMessage } = invitationData;
    
    // Build message
    let message = customMessage || `Hi! ${inviterName} invited you to join "${groupName}" on TrafficJamz.`;
    message += `\n\nAccept invitation: ${invitationLink}`;
    message += `\n\nReply STOP to unsubscribe.`;
    
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send SMS (generic)
   * @param {string} to - Recipient phone number (E.164 format: +1234567890)
   * @param {string} message - Message body (max 1600 chars)
   * @returns {Promise<Object>} - Send result
   */
  async sendSMS(to, message) {
    // Validate phone number format
    if (!to || !to.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +12025551234)');
    }
    
    // Truncate message if too long
    if (message.length > 1600) {
      message = message.substring(0, 1597) + '...';
    }
    
    console.log('\n📱 SMS Request:');
    console.log(`   Provider: ${this.provider}`);
    console.log(`   To: ${to}`);
    console.log(`   From: ${this.phoneNumber || this.brandName}`);
    console.log(`   Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    
    // If SMS disabled, just log and return mock success
    if (!this.enabled) {
      console.log('   Status: LOGGED ONLY (SMS_ENABLED=false)');
      return {
        success: true,
        logged: true,
        message: 'SMS logged but not sent (service disabled)',
        to,
        body: message
      };
    }
    
    try {
      if (this.provider === 'vonage') {
        return await this.sendVonageSMS(to, message);
      } else {
        return await this.sendTwilioSMS(to, message);
      }
    } catch (error) {
      console.error('   ❌ SMS Send Failed:', error.message);
      throw error;
    }
  }

  async sendTwilioSMS(to, message) {
    const result = await this.client.messages.create({
      body: message,
      from: this.phoneNumber,
      to: to
    });
    
    console.log(`   ✅ Sent! SID: ${result.sid}`);
    console.log(`   Status: ${result.status}`);
    
    return {
      success: true,
      provider: 'twilio',
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
      dateCreated: result.dateCreated
    };
  }

  async sendVonageSMS(to, message) {
    return new Promise((resolve, reject) => {
      this.client.sms.send({
        to: to.replace('+', ''),
        from: this.brandName,
        text: message
      }, (err, responseData) => {
        if (err) {
          reject(err);
        } else {
          if (responseData.messages[0].status === '0') {
            console.log(`   ✅ Sent! Message ID: ${responseData.messages[0]['message-id']}`);
            resolve({
              success: true,
              provider: 'vonage',
              messageId: responseData.messages[0]['message-id'],
              status: 'sent',
              to: to,
              from: this.brandName
            });
          } else {
            reject(new Error(`Vonage error: ${responseData.messages[0]['error-text']}`));
          }
        }
      });
    });
  }

  /**
   * Format phone number to E.164 (best effort)
   * @param {string} phone - Phone number in various formats
   * @param {string} defaultCountryCode - Default country code (default: +1 for US)
   * @returns {string} - E.164 formatted number
   */
  formatPhoneNumber(phone, defaultCountryCode = '+1') {
    if (!phone) return null;
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If already has country code (11 digits for US), add +
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+' + cleaned;
    }
    
    // If 10 digits, assume US and add +1
    if (cleaned.length === 10) {
      return defaultCountryCode + cleaned;
    }
    
    // If already formatted correctly
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Otherwise, prepend default country code
    return defaultCountryCode + cleaned;
  }

  /**
   * Validate phone number
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} - True if valid E.164 format
   */
  isValidPhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;
    
    // Basic E.164 validation: starts with +, 7-15 digits total
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    return e164Regex.test(phoneNumber);
  }
}

// Export singleton instance
module.exports = new SMSService();
