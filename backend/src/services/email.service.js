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

    // For production, you would use your actual SMTP settings
    if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // For development/testing, use Ethereal
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
      console.log('Ethereal Email account created for testing:', this.testAccount.user);
    }

    this.initialized = true;
  }

  async sendInvitationEmail(to, invitationData) {
    await this.init();

    const { groupName, inviterName, invitationLink } = invitationData;

    const mailOptions = {
      from: `"Group App" <${this.testAccount ? this.testAccount.user : process.env.SMTP_USER}>`,
      to,
      subject: `You've been invited to join ${groupName}`,
      text: `
        Hello,

        ${inviterName} has invited you to join the group "${groupName}" on our app.

        To accept this invitation, please click on the following link:
        ${invitationLink}

        This invitation will expire in 7 days.

        If you did not request this invitation, please ignore this email.

        Best regards,
        The Group App Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to join a group!</h2>
          <p><strong>${inviterName}</strong> has invited you to join the group <strong>"${groupName}"</strong> on our app.</p>
          <p>To accept this invitation, please click on the button below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
          </p>
          <p>This invitation will expire in 7 days.</p>
          <p>If you did not request this invitation, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #777; font-size: 12px;">Best regards,<br>The Group App Team</p>
        </div>
      `
    };

    const info = await this.transporter.sendMail(mailOptions);
    
    // For Ethereal emails, provide the preview URL
    if (this.testAccount) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      return {
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };
    }

    return {
      messageId: info.messageId
    };
  }
}

module.exports = new EmailService();
