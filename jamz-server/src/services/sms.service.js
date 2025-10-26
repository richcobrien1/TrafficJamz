// jamz-server/src/services/sms.service.js
// SMS Service using Twilio for text message invitations

/**
 * SMS Service for sending text message invitations
 * 
 * Setup Instructions:
 * 1. Sign up for Twilio: https://www.twilio.com/try-twilio
 * 2. Get $15 free credit (no credit card required)
 * 3. Get your Account SID and Auth Token from console
 * 4. Get a Twilio phone number (free with trial)
 * 5. Add to .env:
 *    TWILIO_ACCOUNT_SID=your_account_sid
 *    TWILIO_AUTH_TOKEN=your_auth_token
 *    TWILIO_PHONE_NUMBER=+1234567890
 *    SMS_ENABLED=true (set to false to disable SMS)
 * 
 * Testing:
 * - Trial accounts can send to verified phone numbers only
 * - Add test numbers in Twilio console under Verified Caller IDs
 * - Set SMS_ENABLED=false for local development without sending
 */

const twilio = require('twilio');

class SMSService {
  constructor() {
    this.enabled = process.env.SMS_ENABLED === 'true';
    this.testMode = process.env.NODE_ENV !== 'production';
    
    // Initialize Twilio client if enabled
    if (this.enabled) {
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
    } else {
      console.log('📱 SMS Service disabled (SMS_ENABLED=false). Messages will be logged only.');
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
    console.log(`   To: ${to}`);
    console.log(`   From: ${this.phoneNumber}`);
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
      // Send via Twilio
      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: to
      });
      
      console.log(`   ✅ Sent! SID: ${result.sid}`);
      console.log(`   Status: ${result.status}`);
      
      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        dateCreated: result.dateCreated
      };
      
    } catch (error) {
      console.error('   ❌ SMS Send Failed:', error.message);
      
      // Provide helpful error messages
      if (error.code === 21211) {
        console.error('   → Invalid phone number format. Use E.164: +12025551234');
      } else if (error.code === 21608) {
        console.error('   → Trial account: Phone number not verified. Add it in Twilio console.');
      } else if (error.code === 21610) {
        console.error('   → Phone number has unsubscribed from your messages.');
      }
      
      throw error;
    }
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
