# Clerk Authentication Setup for TrafficJamz

## Overview
TrafficJamz now uses Clerk for authentication, replacing the custom email/password system.

## Setup Instructions

### 1. Create a Clerk Account
1. Go to https://clerk.com and sign up
2. Create a new application named "TrafficJamz"
3. Choose your authentication methods (Email, Google, GitHub, etc.)

### 2. Get Your Keys
From the Clerk dashboard:
- Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)

### 3. Configure Environment Variables

**Development (.env.development):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

**Production (.env.production):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
```

### 4. Configure Clerk Dashboard

#### Application Settings
1. Go to **Configure** → **Settings** in your Clerk dashboard
2. Set these URLs:

**Development:**
- Home URL: `http://localhost:5175`
- Sign in URL: `http://localhost:5175/auth/login`
- Sign up URL: `http://localhost:5175/auth/register`
- After sign in URL: `http://localhost:5175/dashboard`
- After sign up URL: `http://localhost:5175/dashboard`

**Production:**
- Home URL: `https://jamz.v2u.us`
- Sign in URL: `https://jamz.v2u.us/auth/login`
- Sign up URL: `https://jamz.v2u.us/auth/register`
- After sign in URL: `https://jamz.v2u.us/dashboard`
- After sign up URL: `https://jamz.v2u.us/dashboard`

#### Social Connections (Optional)
1. Go to **User & Authentication** → **Social Connections**
2. Enable providers you want (Google, GitHub, Facebook, etc.)
3. Configure each provider with your OAuth credentials

## Features

### What's Included
- ✅ Email/password authentication
- ✅ Social OAuth (Google, GitHub, etc.) - configure in Clerk dashboard
- ✅ Password reset
- ✅ Email verification
- ✅ Multi-factor authentication (MFA) - optional
- ✅ Session management
- ✅ User profile management
- ✅ Protected routes

### Code Changes Made
1. **App.jsx** - Wrapped with `ClerkProvider`
2. **Login.jsx** - Now uses Clerk's `<SignIn />` component
3. **Register.jsx** - Now uses Clerk's `<SignUp />` component  
4. **ProtectedRoute.jsx** - Uses `useUser()` hook from Clerk
5. **Environment files** - Added `VITE_CLERK_PUBLISHABLE_KEY`

## Usage

### In Components
```jsx
import { useUser, useAuth } from '@clerk/clerk-react';

function MyComponent() {
  const { isLoaded, isSignedIn, user } = useUser();
  
  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <div>Not signed in</div>;
  
  return <div>Hello {user.firstName}!</div>;
}
```

### User Data
```jsx
const { user } = useUser();

// Access user data
user.id                    // Unique Clerk user ID
user.firstName             // First name
user.lastName              // Last name
user.emailAddresses[0]     // Primary email
user.profileImageUrl       // Avatar URL
```

### Sign Out
```jsx
import { useClerk } from '@clerk/clerk-react';

function SignOutButton() {
  const { signOut } = useClerk();
  
  return <button onClick={() => signOut()}>Sign Out</button>;
}
```

## Backend Integration

### Getting User ID in API Calls
When a user is signed in, Clerk automatically includes a JWT in requests. You can verify this on your backend:

1. Install Clerk SDK on backend:
```bash
npm install @clerk/clerk-sdk-node
```

2. Verify tokens in your API:
```javascript
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

app.use('/api', ClerkExpressRequireAuth());

app.get('/api/profile', (req, res) => {
  const userId = req.auth.userId; // Clerk user ID
  // Use userId to fetch/update user data
});
```

## Migration from Old Auth System

### User Data Migration
If you have existing users, you'll need to:
1. Export users from your database
2. Use Clerk's User Import API to create matching accounts
3. Send password reset emails for users to set new passwords

### AuthContext
The old `AuthContext` is still in the project but no longer handles authentication. You may want to:
- Remove it entirely, OR
- Repurpose it for app-specific state (user preferences, etc.)

## Customization

### Styling
Customize Clerk components in `Login.jsx` and `Register.jsx`:
```jsx
<SignIn 
  appearance={{
    elements: {
      rootBox: 'custom-class',
      card: 'custom-card-class',
      // ... more customization
    },
    variables: {
      colorPrimary: '#1976d2',
      // ... more theme variables
    }
  }}
/>
```

See Clerk's [theming docs](https://clerk.com/docs/components/customization/overview) for all options.

## Testing

### Development
1. Start the dev server: `npm run dev:host`
2. Go to http://localhost:5175
3. Try signing up and signing in
4. Check protected routes redirect correctly

### Production
1. Deploy to production
2. Ensure environment variable is set: `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...`
3. Test authentication flow
4. Verify social OAuth providers work

## Troubleshooting

### "Missing Clerk Publishable Key" Error
- Check that `VITE_CLERK_PUBLISHABLE_KEY` is set in your `.env` file
- Restart the dev server after changing `.env` files

### Sign-in/Sign-up Not Working
- Verify URLs in Clerk dashboard match your app URLs
- Check browser console for errors
- Ensure you're using the correct publishable key (test vs live)

### Protected Routes Not Working
- Verify `ClerkProvider` wraps your entire app
- Check that `ProtectedRoute` uses `useUser()` hook correctly

## Resources
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk React SDK](https://clerk.com/docs/references/react/overview)
- [Clerk Components](https://clerk.com/docs/components/overview)
