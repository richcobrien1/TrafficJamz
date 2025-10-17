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
  
  const { groupName, inviterName, inviterFullName, inviterHandle, inviterFirstName, inviterLastName, invitationLink, inviter_profile } = invitationData;
      // Development-only: log full invitation payload so we can see exactly what fields were passed
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.log('Full invitationData:', JSON.stringify(invitationData, null, 2));
        } catch (e) {
          console.log('Full invitationData (toString):', String(invitationData));
        }
      }

      // Helper: convert a value into a concise, human-friendly string.
      const toStringSafe = (v) => {
        if (v == null) return '';
        if (typeof v === 'string') return v.trim();
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (Array.isArray(v)) return v.map(toStringSafe).filter(Boolean).join(' ');
        if (typeof v === 'object') {
          // Try common name fields on nested objects
          const candidates = [];
          const pushIf = (x) => { if (x) candidates.push(String(x).trim()); };
          pushIf(v.first_name || v.first || v.given_name || v.givenName);
          pushIf(v.last_name || v.last || v.family_name || v.familyName);
          pushIf(v.full_name || v.fullName || v.full || v.name || v.displayName || v.display_name);
          if (candidates.length) return candidates.filter(Boolean).join(' ');
          try { return JSON.stringify(v); } catch (e) { return String(v); }
        }
        return String(v);
      };

      // Normalize into a single display string. This tolerates nested objects or arrays.
      let inviterDisplay = '';
      let displaySource = '';

  // If the invitation includes a snapshot of the inviter's profile, prefer that
  // for first/last name values.
  const fName = toStringSafe(inviter_profile && (inviter_profile.first_name || inviter_profile.firstName)) || toStringSafe(inviterFirstName);
  const lName = toStringSafe(inviter_profile && (inviter_profile.last_name || inviter_profile.lastName)) || toStringSafe(inviterLastName);

      if (fName || lName) {
        inviterDisplay = [fName, lName].filter(Boolean).join(' ');
        displaySource = 'first_last_fields';
      } else if (toStringSafe(inviterFullName) || (inviter_profile && toStringSafe(inviter_profile.full_name))) {
        inviterDisplay = toStringSafe(inviterFullName) || toStringSafe(inviter_profile.full_name);
        displaySource = inviterFullName ? 'inviterFullName' : 'inviter_profile.full_name';
      } else if (toStringSafe(inviterName)) {
        inviterDisplay = toStringSafe(inviterName);
        displaySource = 'inviterName';
      } else if (toStringSafe(inviterHandle)) {
        inviterDisplay = toStringSafe(inviterHandle);
        displaySource = 'inviterHandle';
      } else {
        inviterDisplay = 'A user';
        displaySource = 'fallback';
      }

      console.log('Invitation data:', { groupName, inviterDisplay, invitationLink, displaySource });

      // Make a safe, displayable version of inviterDisplay
      const escapeHtml = (str) => String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      // inviterDisplay is now guaranteed to be a string; still guard against weird types
      const displayableText = String(inviterDisplay);

      // For HTML, escape and preserve line breaks
      const displayableHtml = escapeHtml(displayableText).replace(/\n/g, '<br/>');

      // Also include the full raw invitationData for debugging in both text and HTML
      let rawInvitationText = '';
      let rawInvitationHtml = '';
      try {
        rawInvitationText = JSON.stringify(invitationData, null, 2);
        rawInvitationHtml = escapeHtml(rawInvitationText).replace(/\n/g, '<br/>');
      } catch (e) {
        rawInvitationText = String(invitationData);
        rawInvitationHtml = escapeHtml(rawInvitationText);
      }

      // Build combined text and HTML bodies (include raw invitationData for debugging)
      const textBody = [
        'Hello,',
        '',
        `${displayableText} has invited you to join the group "${groupName}" on TrafficJamz.`,
        '',
        'To accept this invitation, please click on the following link:',
        invitationLink,
        '',
        'This invitation will expire in 7 days.',
        '',
        'If you did not request this invitation, please ignore this email.',
        '',
        'Best regards,',
        'The TrafficJamz Team 🎧',
        '',
        '--- RAW invitationData (debug) ---',
        rawInvitationText
      ].join('\n');

      const htmlBody = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #FF0037FF, #FFAE00FF); color: #000; padding: 2em; border-radius: 12px;">
          <h1 style="text-align: center; font-size: 2em; margin-bottom: 0.5em;">🎶 You've Been Invited to TrafficJamz!</h1>
          <div style="text-align: center; margin-bottom: 1.5em;">
            <img src="https://www.v2u.us/Jamz-sking.png" alt="TrafficJamz in action" style="display: block; margin: 0 auto; width: 100%; max-width: 480px; border-radius: 8px;" />
          </div>
            <p style="font-size: 1.1em; line-height: 1.6; text-align: center;">
              <strong>${displayableHtml}</strong> has invited you to join the group <strong>"${groupName}"</strong> on <strong>TrafficJamz</strong>—the real-time audio and location-sharing app for connected crews.
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
          <h3>Raw invitationData (debug)</h3>
          <pre style="white-space: pre-wrap; background: #f6f6f6; padding: 12px; border-radius: 6px;">${rawInvitationHtml}</pre>
          <p style="color: #000; font-size: 12px; text-align: center;">Best regards,<br/>The TrafficJamz Team</p>
        </div>
      `;

      const mailOptions = {
        from: this.testAccount 
          ? `"TrafficJamz" <${this.testAccount.user}>`
          : `"TrafficJamz" <${process.env.SMTP_USER}>`,
        to,
        subject: `You've been invited to join ${groupName}`,
        text: textBody,
        html: htmlBody
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
