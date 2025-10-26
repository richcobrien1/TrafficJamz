# Vonage (Nexmo) SMS Setup - No Phone Required! 🎉

## Why Vonage?
- ✅ **Email only** - No phone verification needed
- ✅ **$2 free credit** - About 250 messages
- ✅ **Simple API** - Similar to Twilio
- ✅ **No credit card** for testing

## Quick Setup (3 minutes)

### 1. Sign Up
1. Go to https://dashboard.nexmo.com/sign-up
2. Enter your email and create password
3. **No phone verification required!**
4. You get $2 credit immediately

### 2. Get Your Credentials
1. After signup, you're at the dashboard
2. **API Key** - Shows on main dashboard
3. **API Secret** - Click "Show" to reveal
4. Copy both values

### 3. Configure TrafficJamz

Update your `jamz-server/.env`:

```bash
# SMS Service - Vonage (No phone required!)
SMS_PROVIDER=vonage
SMS_ENABLED=true
VONAGE_API_KEY=abc123def
VONAGE_API_SECRET=xyz789abc123
VONAGE_BRAND_NAME=TrafficJamz

# Frontend URL
FRONTEND_URL=https://jamz.v2u.us
```

### 4. Restart Server

```bash
cd jamz-server
npm run dev
```

You should see:
```
✅ Vonage SMS Service initialized
📱 Sending from: TrafficJamz
```

## Send Test Message

1. Go to any group
2. Click "Invitations" tab
3. Click "+ Invite Member"
4. Fill in:
   - Email: test@example.com
   - Phone: +12025551234 (your real number)
   - Custom Message: "Join our group!"
5. Click "Send Invitation"

You'll receive SMS:
```
Join our group!

Richard invited you to join "Snow Warriors" on TrafficJamz.

Accept invitation: https://jamz.v2u.us/invitations/...

Reply STOP to unsubscribe.
```

## Phone Number Format

Vonage accepts E.164 format:
- ✅ `+12025551234` (US)
- ✅ `+447911123456` (UK)
- ✅ `+61412345678` (Australia)

The system auto-formats for you!

## Cost Breakdown

### Free Credit
- **$2 free** on signup
- **US SMS**: ~$0.0076 per message
- **Free credit = ~263 messages**

### After Free Credit
- **No monthly fee**
- **US SMS**: $0.0076 per message
- **International**: $0.01-$0.08 per message
- See pricing: https://www.vonage.com/communications-apis/sms/pricing/

### Example Costs (after free credit)
- 100 invitations/month: $0.76
- 1,000 invitations/month: $7.60
- 10,000 invitations/month: $76.00

## Important Settings

### Brand Name
The `VONAGE_BRAND_NAME` appears as the sender:
- Max 11 characters for best delivery
- Use your app name
- Examples: `TrafficJamz`, `SkiGroup`, `MyApp`

### Test vs Production
- **Test**: Set `SMS_ENABLED=false` to log without sending
- **Production**: Set `SMS_ENABLED=true` to send real SMS

## Troubleshooting

### Error: "Invalid API credentials"
- Double-check API Key and Secret
- Make sure no extra spaces in .env file
- API Secret is case-sensitive

### Error: "Insufficient credit"
- Check balance at https://dashboard.nexmo.com/
- Add payment method to buy more credit
- Free $2 should work for testing

### SMS not received
1. Check Vonage dashboard for delivery logs
2. Verify phone number format (+12025551234)
3. Check spam/blocked messages on phone
4. Try a different phone number

### "Brand name too long"
- Keep brand name under 11 characters
- Longer names may be truncated
- Use short, recognizable name

## Compare: Vonage vs Twilio

| Feature | Vonage | Twilio |
|---------|--------|--------|
| **Signup** | Email only ✅ | Requires phone ❌ |
| **Free Credit** | $2 | $15 |
| **Free Messages** | ~263 | ~1,800 |
| **US SMS Cost** | $0.0076 | $0.0079 |
| **Sender ID** | Custom name | Phone number |
| **Trial Limits** | None | Verified numbers only |

## Switch from Twilio

Already have Twilio setup? Easy switch:

1. Sign up for Vonage
2. Update `.env`:
   ```bash
   SMS_PROVIDER=vonage  # Changed from 'twilio'
   VONAGE_API_KEY=abc123
   VONAGE_API_SECRET=xyz789
   ```
3. Restart server - done!

The code automatically detects which provider you're using.

## Production Checklist

Before going live:

- [ ] Sign up for Vonage account
- [ ] Add payment method (required after $2)
- [ ] Set `SMS_ENABLED=true` in production .env
- [ ] Set `SMS_PROVIDER=vonage`
- [ ] Add VONAGE_API_KEY and VONAGE_API_SECRET
- [ ] Test with real phone numbers
- [ ] Monitor dashboard for delivery rates

## Support

- **Vonage Docs**: https://developer.vonage.com/messaging/sms/overview
- **Dashboard**: https://dashboard.nexmo.com/
- **Support**: https://developer.vonage.com/support

## Summary

✅ **No phone verification** - Just email  
✅ **Free $2 credit** - Test without payment  
✅ **Easy setup** - 3 environment variables  
✅ **Works immediately** - No waiting for approval  
✅ **Cheaper than Twilio** - $0.0076 vs $0.0079 per SMS  

Perfect for getting started! 🚀
