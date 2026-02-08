# Clerk Backend Integration Reference

## Quick Start

### 1. Install Dependencies
```bash
npm install @clerk/clerk-sdk-node
```

### 2. Environment Variables
Add to `.env.local`:
```env
CLERK_SECRET_KEY="sk_test_YOUR_SECRET_KEY"
CLERK_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY"
```

## Using Clerk Middleware

### Import Middleware
```javascript
const { requireAuth, withAuth, getUserInfo } = require('./middleware/clerk.middleware');
```

### Protected Routes (Authentication Required)
```javascript
// User MUST be signed in
app.get('/api/user/profile', requireAuth(), (req, res) => {
  const userInfo = getUserInfo(req);
  
  res.json({
    userId: userInfo.userId,      // Clerk user ID
    sessionId: userInfo.sessionId, // Session ID
    claims: userInfo.claims        // JWT claims
  });
});
```

### Optional Authentication
```javascript
// Works for both signed-in and anonymous users
app.get('/api/public/data', withAuth(), (req, res) => {
  const userInfo = getUserInfo(req);
  
  if (userInfo) {
    // User is signed in - personalized response
    res.json({ message: `Hello ${userInfo.userId}` });
  } else {
    // Anonymous user - public response
    res.json({ message: 'Hello guest' });
  }
});
```

## User Info Structure

```javascript
{
  userId: "user_abc123",           // Clerk user ID
  sessionId: "sess_xyz789",        // Current session ID
  claims: {                        // JWT payload
    sub: "user_abc123",
    email: "user@example.com",
    // ... other claims
  }
}
```

## Getting Full User Data

For complete user details (email, name, metadata), use Clerk SDK:

```javascript
const { clerkClient } = require('@clerk/clerk-sdk-node');

app.get('/api/user/details', requireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  
  try {
    // Fetch full user object from Clerk
    const user = await clerkClient.users.getUser(userId);
    
    res.json({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImageUrl,
      createdAt: user.createdAt,
      metadata: user.publicMetadata
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
```

## Updating User Metadata

```javascript
app.post('/api/user/preferences', requireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  const { theme, notifications } = req.body;
  
  try {
    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        theme,
        notifications
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Error Handling

```javascript
app.get('/api/protected', requireAuth(), (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    
    if (!userInfo) {
      return res.status(401).json({ 
        error: 'Unauthorized' 
      });
    }
    
    // Handle request...
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});
```

## WebSocket Authentication

For Socket.IO with Clerk:

```javascript
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    // Verify Clerk session token
    const { data, error } = await clerkClient.sessions.verifyToken(token);
    
    if (error) {
      return next(new Error('Authentication failed'));
    }
    
    // Attach user info to socket
    socket.userId = data.userId;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

## Example Routes Added

The following example routes are now available in `index.js`:

- **GET `/api/user/profile`** - Protected route (requires sign-in)
  - Returns authenticated user info
  
- **GET `/api/public/info`** - Public route (optional auth)
  - Returns different data for signed-in vs anonymous users

## Testing with curl

### Test protected endpoint (will fail without auth):
```bash
curl http://localhost:5000/api/user/profile
# Response: 401 Unauthorized
```

### Test with authentication:
```bash
# Get token from Clerk frontend (req.auth.token)
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
     http://localhost:5000/api/user/profile
```

## Next Steps

1. Replace existing auth routes (`/api/auth/login`, `/api/auth/register`) with Clerk-based versions
2. Update existing protected routes to use `requireAuth()` instead of passport
3. Migrate user data to Clerk (or sync Clerk user IDs with existing database)
4. Remove old passport/JWT authentication code

## Resources

- [Clerk Backend SDK Docs](https://clerk.com/docs/references/backend/overview)
- [Clerk Express Integration](https://clerk.com/docs/references/backend/express)
- [User Management API](https://clerk.com/docs/references/backend/user/overview)
