# SMS Invitation Setup Guide

## Overview
TrafficJamz now supports sending group invitations via SMS (text message) in addition to email. This guide will help you set up Twilio for SMS functionality.

## Quick Start (Free Testing)

### 1. Sign Up for Twilio (5 minutes)
1. Go to https://www.twilio.com/try-twilio
2. Click "Sign up and start building"
3. Fill in your details (no credit card required)
4. Verify your email and phone number
5. You'll get **$15 free credit** - enough for ~1,800 text messages!

### 2. Get Your Credentials
After signing up, you'll be taken to the Twilio Console:

1. **Account SID** - Find this on the dashboard (starts with `AC...`)
2. **Auth Token** - Click "Show" to reveal it
3. **Phone Number** - Click "Get a Trial Number" (free)

### 3. Configure TrafficJamz Backend

Add these to your `.env` file in `jamz-server/`:

```bash
# SMS Service (Twilio)
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# Frontend URL (for invitation links)
FRONTEND_URL=https://jamz.v2u.us
```

### 4. Install Twilio Package

```bash
cd jamz-server
npm install twilio
```

### 5. Restart Backend

```bash
npm run dev
```

You should see:
```
✅ Twilio SMS Service initialized
📱 Sending from: +15551234567
```

## Testing SMS Invitations

### Trial Account Limitations
- **Can only send to verified phone numbers**
- Messages include "Sent from your Twilio trial account"
- Perfect for development/testing

### Verify Test Phone Numbers
1. Go to Twilio Console
2. Click "Phone Numbers" → "Verified Caller IDs"
3. Click "Add a new Caller ID"
4. Enter the phone number you want to test with
5. Verify via SMS or call

### Send a Test Invitation
1. Open TrafficJamz
2. Go to a group
3. Click "Invitations" tab
4. Click "+ Invite Member"
5. Fill in:
   - **Email**: test@example.com
   - **Mobile Phone**: +12025551234 (your verified number)
   - **Custom Message**: "Hey! Join our ski group!"
6. Click "Send Invitation"

You should receive an SMS like:
```
Hey! Join our ski group!

Richard invited you to join "Snow Warriors" on TrafficJamz.

Accept invitation: https://jamz.v2u.us/invitations/...

Reply STOP to unsubscribe.
```

## Phone Number Format

### Recommended: E.164 Format
Always use international format:
- ✅ `+12025551234` (US)
- ✅ `+447911123456` (UK)
- ✅ `+61412345678` (Australia)

### Auto-Formatting
The system will attempt to format US numbers automatically:
- `2025551234` → `+12025551234`
- `(202) 555-1234` → `+12025551234`
- `202-555-1234` → `+12025551234`

## Production Setup

### Upgrade to Paid Account
When ready for production:

1. Add payment method to Twilio account
2. Messages will no longer show "trial account" text
3. Can send to any phone number (not just verified)
4. Pricing: ~$0.0079/SMS (US domestic)

### Best Practices
- ✅ Always include "Reply STOP to unsubscribe"
- ✅ Keep messages under 160 characters when possible
- ✅ Test with multiple carriers (AT&T, Verizon, T-Mobile)
- ✅ Monitor deliverability in Twilio console

## Disable SMS (Development Only)

To test without sending real SMS:

```bash
SMS_ENABLED=false
```

Messages will be logged to console but not sent:
```
📱 SMS Request:
   To: +12025551234
   From: +15551234567
   Message: Richard invited you to join "Snow Warriors"...
   Status: LOGGED ONLY (SMS_ENABLED=false)
```

## Troubleshooting

### Error: "Invalid phone number format"
- Ensure number starts with `+` and country code
- Use E.164 format: `+12025551234`

### Error: "Phone number not verified" (Error 21608)
- Trial accounts can only send to verified numbers
- Add number in Twilio Console → Verified Caller IDs

### Error: "Phone number has unsubscribed" (Error 21610)
- User replied STOP to previous message
- Cannot send until they opt back in

### No SMS received
1. Check Twilio Console logs for delivery status
2. Verify phone number is correct
3. Check carrier spam filters
4. Try a different phone number

## Costs

### Trial Account
- **Free**: $15 credit
- **SMS Cost**: ~$0.0079 per US message
- **Credit = ~1,800 messages**

### Pay-As-You-Go
- **No monthly fee**
- **US SMS**: $0.0079 per message
- **International**: Varies by country
- See: https://www.twilio.com/sms/pricing

### Example Costs
- 100 invitations/month: ~$0.79
- 1,000 invitations/month: ~$7.90
- 10,000 invitations/month: ~$79.00

## Alternative SMS Services

If you prefer a different provider:

### AWS SNS
- Good if already using AWS
- $0.00645 per US SMS
- No free tier for SMS

### MessageBird
- Similar pricing to Twilio
- Better international coverage
- Good for European users

### Custom Implementation
To use a different provider, modify:
```
jamz-server/src/services/sms.service.js
```

## Support

- **Twilio Docs**: https://www.twilio.com/docs/sms
- **Twilio Support**: support@twilio.com
- **TrafficJamz Issues**: Create an issue in the GitHub repo

## Summary

✅ **Free testing** with $15 Twilio credit  
✅ **Easy setup** - just 3 environment variables  
✅ **Auto-formats** phone numbers  
✅ **Optional** - email still works without SMS  
✅ **Production ready** - upgrade when needed  

Happy inviting! 📱
