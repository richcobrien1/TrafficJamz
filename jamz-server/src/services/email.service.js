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
          The TrafficJamz Team 🎧
        `,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff0055, #ff9900); color: #000; padding: 2em; border-radius: 12px;">
            <h1 style="text-align: center; font-size: 2em; margin-bottom: 0.5em;">🎶 You've Been Invited to TrafficJamz!</h1>
            <div style="text-align: center; margin-bottom: 1.5em;">
              <img src="https://www.v2u.us/Jamz-sking.png" alt="TrafficJamz in action" style="max-width: 100%; border-radius: 8px;" />
            </div>
            <p style="font-size: 1.1em; line-height: 1.6;">
              <strong>${inviterName}</strong> has invited you to join the group <strong>"${groupName}"</strong> on <strong>TrafficJamz</strong>—the real-time audio and location-sharing app for connected crews.
            </p>
            <p style="font-size: 1.1em; line-height: 1.6;">
              Whether you're skiing, cruising, or holiday traveling, Jamz lets you hear, speak, and track your group in real time. It's audio, location, and vibes—all in one.
            </p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="background-color: #000; color: #ff9900; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">🎧 Accept Invitation</a>
            </p>
            <p style="font-size: 1em;">This invitation will expire in 7 days.</p>
            <p style="font-size: 1em;">If you did not request this invitation, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #000; font-size: 12px; text-align: center;">Best regards,<br>The TrafficJamz Team</p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
    
      console.log('Email sent successfully with messageId:', info.messageId);
      // Log additional transporter/send response details for troubleshooting (useful for SMTP providers)
      try {
        console.log('Email send info accepted:', info.accepted);
        console.log('Email send info rejected:', info.rejected);
        console.log('Email send response:', info.response);
      } catch (e) {
        // non-fatal if structure differs between transports
      }
    
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
