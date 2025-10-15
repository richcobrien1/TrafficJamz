// src/services/email.service.js
const nodemailer = require('nodemailer');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.testAccount = null;
  }

  async init() {
    if (this.initialized) return;

    // Use real SMTP if configured, otherwise use Ethereal for testing
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS &&
        !process.env.SMTP_USER.includes('your-') && !process.env.SMTP_PASS.includes('your-')) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('Email service initialized with real SMTP:', process.env.SMTP_HOST);
    } else {
      // For development/testing without SMTP config, use Ethereal
      this.testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass
        }
      });
      console.log('Email service initialized with Ethereal for testing:', this.testAccount.user);
    }

    this.initialized = true;
  }

  async sendInvitationEmail(to, invitationData) {
    try {
      await this.init();
      console.log('Sending invitation email to:', to);
  
      const { groupName, inviterName, invitationLink } = invitationData;
      console.log('Invitation data:', { groupName, inviterName, invitationLink });

      const mailOptions = {
        from: this.testAccount 
          ? `"TrafficJamz" <${this.testAccount.user}>`
          : `"TrafficJamz" <${process.env.SMTP_USER}>`,
        to,
        subject: `You've been invited to join ${groupName}`,
        text: `
          Hello,

          ${inviterName} has invited you to join the group "${groupName}" on TrafficJamz.

          To accept this invitation, please click on the following link:
          ${invitationLink}

          This invitation will expire in 7 days.

          If you did not request this invitation, please ignore this email.

          Best regards,
          The TrafficJamz Team
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited to join a group!</h2>
            <p><strong>${inviterName}</strong> has invited you to join the group <strong>"${groupName}"</strong> on TrafficJamz.</p>
            <p>To accept this invitation, please click on the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
            </p>
            <p>This invitation will expire in 7 days.</p>
            <p>If you did not request this invitation, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #777; font-size: 12px;">Best regards,<br>The TrafficJamz Team</p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
    
      console.log('Email sent successfully with messageId:', info.messageId);
    
      // For Ethereal emails, provide the preview URL
      if (this.testAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL:', previewUrl);
        return {
          messageId: info.messageId,
          previewUrl
        };
      }
  
      return {
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }
  }
}

// At the bottom of your email.service.js file
const emailService = new EmailService();

// Initialize the service immediately when it's first required
(async () => {
  try {
    await emailService.init();
    console.log('Email service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize email service:', error);
  }
})();

// Export the initialized instance (not a new one) so callers receive the same service
module.exports = emailService;
