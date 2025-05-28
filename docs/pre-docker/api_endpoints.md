# API Endpoints for Group Audio Communication App

## Overview
This document defines the API endpoints for the group audio communication and location tracking application. The API follows RESTful principles with additional WebSocket endpoints for real-time communication.

## Base URL
- Production: `https://api.audiogroupapp.com/v1`
- Staging: `https://staging-api.audiogroupapp.com/v1`
- Development: `https://dev-api.audiogroupapp.com/v1`

## Authentication
All API requests (except authentication endpoints) require authentication using JWT tokens.

- **Header**: `Authorization: Bearer {token}`
- **Token Expiration**: 24 hours
- **Refresh Token Expiration**: 30 days

## Rate Limiting
- Standard tier: 100 requests per minute
- Premium tier: 300 requests per minute
- Enterprise tier: 1000 requests per minute

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "pagination": {
      "total": 100,
      "per_page": 20,
      "current_page": 1,
      "last_page": 5,
      "next_page_url": "https://api.audiogroupapp.com/v1/resource?page=2",
      "prev_page_url": null
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details
    }
  }
}
```

## REST API Endpoints

### Authentication Endpoints

#### Register User
- **URL**: `/auth/register`
- **Method**: `POST`
- **Description**: Register a new user
- **Request Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string",
    "first_name": "string",
    "last_name": "string",
    "phone_number": "string"
  }
  ```
- **Response**: User object with token

#### Login
- **URL**: `/auth/login`
- **Method**: `POST`
- **Description**: Authenticate user and get token
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string",
    "device_info": {
      "type": "enum(ios, android, web)",
      "name": "string",
      "push_token": "string"
    }
  }
  ```
- **Response**: User object with token

#### Refresh Token
- **URL**: `/auth/refresh`
- **Method**: `POST`
- **Description**: Get new access token using refresh token
- **Request Body**:
  ```json
  {
    "refresh_token": "string"
  }
  ```
- **Response**: New access token and refresh token

#### Logout
- **URL**: `/auth/logout`
- **Method**: `POST`
- **Description**: Invalidate current token
- **Response**: Success message

#### Request Password Reset
- **URL**: `/auth/password/reset/request`
- **Method**: `POST`
- **Description**: Request password reset email
- **Request Body**:
  ```json
  {
    "email": "string"
  }
  ```
- **Response**: Success message

#### Reset Password
- **URL**: `/auth/password/reset`
- **Method**: `POST`
- **Description**: Reset password with token
- **Request Body**:
  ```json
  {
    "token": "string",
    "email": "string",
    "password": "string",
    "password_confirmation": "string"
  }
  ```
- **Response**: Success message

#### Setup MFA
- **URL**: `/auth/mfa/setup`
- **Method**: `POST`
- **Description**: Set up multi-factor authentication
- **Request Body**:
  ```json
  {
    "method": "enum(sms, authenticator, email)"
  }
  ```
- **Response**: MFA setup information

#### Verify MFA
- **URL**: `/auth/mfa/verify`
- **Method**: `POST`
- **Description**: Verify MFA code
- **Request Body**:
  ```json
  {
    "code": "string"
  }
  ```
- **Response**: Success message

### User Endpoints

#### Get Current User
- **URL**: `/users/me`
- **Method**: `GET`
- **Description**: Get current user profile
- **Response**: User object

#### Update User
- **URL**: `/users/me`
- **Method**: `PUT`
- **Description**: Update user profile
- **Request Body**:
  ```json
  {
    "first_name": "string",
    "last_name": "string",
    "profile_image_url": "string",
    "phone_number": "string"
  }
  ```
- **Response**: Updated user object

#### Update User Preferences
- **URL**: `/users/me/preferences`
- **Method**: `PATCH`
- **Description**: Update user preferences
- **Request Body**:
  ```json
  {
    "notifications": {
      "push_enabled": "boolean",
      "email_enabled": "boolean",
      "proximity_alerts": "boolean"
    },
    "privacy": {
      "share_location": "boolean",
      "location_history_enabled": "boolean"
    },
    "audio": {
      "auto_mute_on_join": "boolean",
      "noise_cancellation": "boolean"
    }
  }
  ```
- **Response**: Updated preferences object

#### Get User Devices
- **URL**: `/users/me/devices`
- **Method**: `GET`
- **Description**: Get user's registered devices
- **Response**: Array of device objects

#### Remove Device
- **URL**: `/users/me/devices/{device_id}`
- **Method**: `DELETE`
- **Description**: Remove a device from user's account
- **Response**: Success message

#### Get User Subscription
- **URL**: `/users/me/subscription`
- **Method**: `GET`
- **Description**: Get user's subscription details
- **Response**: Subscription object

### Group Endpoints

#### Create Group
- **URL**: `/groups`
- **Method**: `POST`
- **Description**: Create a new group
- **Request Body**:
  ```json
  {
    "name": "string",
    "description": "string",
    "privacy_level": "enum(public, private, secret)",
    "avatar_url": "string",
    "settings": {
      "join_approval_required": "boolean",
      "members_can_invite": "boolean",
      "location_sharing_required": "boolean",
      "music_sharing_enabled": "boolean",
      "proximity_alert_distance": "number"
    }
  }
  ```
- **Response**: Group object

#### Get User Groups
- **URL**: `/groups`
- **Method**: `GET`
- **Description**: Get groups the user is a member of
- **Query Parameters**:
  - `status`: Filter by group status (active, archived)
  - `role`: Filter by user role (owner, admin, member)
  - `page`: Page number
  - `per_page`: Items per page
- **Response**: Array of group objects

#### Get Group
- **URL**: `/groups/{group_id}`
- **Method**: `GET`
- **Description**: Get group details
- **Response**: Group object

#### Update Group
- **URL**: `/groups/{group_id}`
- **Method**: `PUT`
- **Description**: Update group details
- **Request Body**:
  ```json
  {
    "name": "string",
    "description": "string",
    "privacy_level": "enum(public, private, secret)",
    "avatar_url": "string"
  }
  ```
- **Response**: Updated group object

#### Update Group Settings
- **URL**: `/groups/{group_id}/settings`
- **Method**: `PATCH`
- **Description**: Update group settings
- **Request Body**:
  ```json
  {
    "join_approval_required": "boolean",
    "members_can_invite": "boolean",
    "location_sharing_required": "boolean",
    "music_sharing_enabled": "boolean",
    "proximity_alert_distance": "number"
  }
  ```
- **Response**: Updated settings object

#### Delete Group
- **URL**: `/groups/{group_id}`
- **Method**: `DELETE`
- **Description**: Delete a group (owner only)
- **Response**: Success message

#### Get Group Members
- **URL**: `/groups/{group_id}/members`
- **Method**: `GET`
- **Description**: Get all members of a group
- **Query Parameters**:
  - `status`: Filter by member status (active, inactive)
  - `role`: Filter by role (owner, admin, member)
  - `page`: Page number
  - `per_page`: Items per page
- **Response**: Array of member objects

#### Add Group Member
- **URL**: `/groups/{group_id}/members`
- **Method**: `POST`
- **Description**: Add a member to a group
- **Request Body**:
  ```json
  {
    "user_id": "uuid",
    "role": "enum(admin, member)"
  }
  ```
- **Response**: Member object

#### Update Group Member
- **URL**: `/groups/{group_id}/members/{user_id}`
- **Method**: `PATCH`
- **Description**: Update a member's role or status
- **Request Body**:
  ```json
  {
    "role": "enum(admin, member)",
    "status": "enum(active, inactive, muted)"
  }
  ```
- **Response**: Updated member object

#### Remove Group Member
- **URL**: `/groups/{group_id}/members/{user_id}`
- **Method**: `DELETE`
- **Description**: Remove a member from a group
- **Response**: Success message

#### Invite to Group
- **URL**: `/groups/{group_id}/invitations`
- **Method**: `POST`
- **Description**: Invite a user to a group
- **Request Body**:
  ```json
  {
    "email": "string"
  }
  ```
- **Response**: Invitation object

#### Get Group Invitations
- **URL**: `/groups/{group_id}/invitations`
- **Method**: `GET`
- **Description**: Get all pending invitations for a group
- **Response**: Array of invitation objects

#### Cancel Invitation
- **URL**: `/groups/{group_id}/invitations/{invitation_id}`
- **Method**: `DELETE`
- **Description**: Cancel a pending invitation
- **Response**: Success message

#### Get User Invitations
- **URL**: `/users/me/invitations`
- **Method**: `GET`
- **Description**: Get all invitations for the current user
- **Response**: Array of invitation objects

#### Accept Invitation
- **URL**: `/users/me/invitations/{invitation_id}/accept`
- **Method**: `POST`
- **Description**: Accept a group invitation
- **Response**: Group object

#### Decline Invitation
- **URL**: `/users/me/invitations/{invitation_id}/decline`
- **Method**: `POST`
- **Description**: Decline a group invitation
- **Response**: Success message

### Audio Session Endpoints

#### Create Audio Session
- **URL**: `/groups/{group_id}/audio-sessions`
- **Method**: `POST`
- **Description**: Create a new audio session for a group
- **Request Body**:
  ```json
  {
    "session_type": "enum(voice_only, voice_with_music)",
    "recording_enabled": "boolean"
  }
  ```
- **Response**: Audio session object with connection details

#### Get Active Audio Session
- **URL**: `/groups/{group_id}/audio-sessions/active`
- **Method**: `GET`
- **Description**: Get the active audio session for a group
- **Response**: Audio session object with connection details

#### Get Audio Session
- **URL**: `/groups/{group_id}/audio-sessions/{session_id}`
- **Method**: `GET`
- **Description**: Get details of a specific audio session
- **Response**: Audio session object

#### End Audio Session
- **URL**: `/groups/{group_id}/audio-sessions/{session_id}/end`
- **Method**: `POST`
- **Description**: End an active audio session
- **Response**: Updated audio session object

#### Get Audio Session Participants
- **URL**: `/groups/{group_id}/audio-sessions/{session_id}/participants`
- **Method**: `GET`
- **Description**: Get all participants in an audio session
- **Response**: Array of participant objects

#### Update Participant Status
- **URL**: `/groups/{group_id}/audio-sessions/{session_id}/participants/me`
- **Method**: `PATCH`
- **Description**: Update current user's participant status
- **Request Body**:
  ```json
  {
    "mic_muted": "boolean",
    "speaker_muted": "boolean"
  }
  ```
- **Response**: Updated participant object

#### Add Music to Session
- **URL**: `/groups/{group_id}/audio-sessions/{session_id}/music`
- **Method**: `POST`
- **Description**: Add a music track to the session playlist
- **Request Body**:
  ```json
  {
    "title": "string",
    "artist": "string",
    "album": "string",
    "duration": "number",
    "url": "string"
  }
  ```
- **Response**: Updated music playlist

#### Control Music Playback
- **URL**: `/groups/{group_id}/audio-sessions/{session_id}/music/control`
- **Method**: `POST`
- **Description**: Control music playback
- **Request Body**:
  ```json
  {
    "action": "enum(play, pause, next, previous)",
    "position": "number"
  }
  ```
- **Response**: Updated music status

### Location Endpoints

#### Update User Location
- **URL**: `/users/me/location`
- **Method**: `POST`
- **Description**: Update current user's location
- **Request Body**:
  ```json
  {
    "coordinates": {
      "latitude": "number",
      "longitude": "number",
      "altitude": "number",
      "accuracy": "number",
      "heading": "number",
      "speed": "number"
    },
    "battery_level": "number",
    "connection_type": "enum(wifi, cellular, offline)"
  }
  ```
- **Response**: Success message

#### Get Group Members Locations
- **URL**: `/groups/{group_id}/locations`
- **Method**: `GET`
- **Description**: Get locations of all members in a group
- **Response**: Array of member location objects

#### Get User Location
- **URL**: `/users/{user_id}/location`
- **Method**: `GET`
- **Description**: Get a specific user's location
- **Response**: Location object

#### Get User Location History
- **URL**: `/users/{user_id}/location/history`
- **Method**: `GET`
- **Description**: Get a user's location history
- **Query Parameters**:
  - `start_date`: Start date for history
  - `end_date`: End date for history
  - `group_id`: Filter by group
- **Response**: Array of location history objects

#### Set Location Privacy
- **URL**: `/users/me/location/privacy`
- **Method**: `PATCH`
- **Description**: Update location privacy settings
- **Request Body**:
  ```json
  {
    "privacy_level": "enum(precise, approximate, hidden)",
    "shared_with_group_ids": ["uuid"]
  }
  ```
- **Response**: Updated privacy settings

### Proximity Alert Endpoints

#### Create Proximity Alert
- **URL**: `/groups/{group_id}/proximity-alerts`
- **Method**: `POST`
- **Description**: Create a new proximity alert
- **Request Body**:
  ```json
  {
    "target_user_id": "uuid",
    "distance_threshold": "number"
  }
  ```
- **Response**: Proximity alert object

#### Get Proximity Alerts
- **URL**: `/groups/{group_id}/proximity-alerts`
- **Method**: `GET`
- **Description**: Get all proximity alerts for a group
- **Response**: Array of proximity alert objects

#### Update Proximity Alert
- **URL**: `/groups/{group_id}/proximity-alerts/{alert_id}`
- **Method**: `PATCH`
- **Description**: Update a proximity alert
- **Request Body**:
  ```json
  {
    "distance_threshold": "number",
    "status": "enum(active, dismissed)"
  }
  ```
- **Response**: Updated proximity alert object

#### Delete Proximity Alert
- **URL**: `/groups/{group_id}/proximity-alerts/{alert_id}`
- **Method**: `DELETE`
- **Description**: Delete a proximity alert
- **Response**: Success message

### Subscription Endpoints

#### Get Subscription Plans
- **URL**: `/subscription/plans`
- **Method**: `GET`
- **Description**: Get available subscription plans
- **Response**: Array of subscription plan objects

#### Subscribe
- **URL**: `/subscription/subscribe`
- **Method**: `POST`
- **Description**: Subscribe to a plan
- **Request Body**:
  ```json
  {
    "plan_id": "uuid",
    "payment_method_id": "string",
    "auto_renew": "boolean"
  }
  ```
- **Response**: Subscription object

#### Cancel Subscription
- **URL**: `/subscription/cancel`
- **Method**: `POST`
- **Description**: Cancel current subscription
- **Response**: Updated subscription object

#### Update Payment Method
- **URL**: `/subscription/payment-method`
- **Method**: `PUT`
- **Description**: Update payment method
- **Request Body**:
  ```json
  {
    "payment_method_id": "string"
  }
  ```
- **Response**: Updated payment method

#### Get Payment History
- **URL**: `/subscription/payments`
- **Method**: `GET`
- **Description**: Get payment history
- **Response**: Array of payment objects

### Notification Endpoints

#### Get Notifications
- **URL**: `/notifications`
- **Method**: `GET`
- **Description**: Get user notifications
- **Query Parameters**:
  - `read`: Filter by read status (true, false)
  - `type`: Filter by notification type
  - `page`: Page number
  - `per_page`: Items per page
- **Response**: Array of notification objects

#### Mark Notification as Read
- **URL**: `/notifications/{notification_id}/read`
- **Method**: `POST`
- **Description**: Mark a notification as read
- **Response**: Updated notification object

#### Mark All Notifications as Read
- **URL**: `/notifications/read-all`
- **Method**: `POST`
- **Description**: Mark all notifications as read
- **Response**: Success message

#### Update Notification Settings
- **URL**: `/notifications/settings`
- **Method**: `PATCH`
- **Description**: Update notification settings
- **Request Body**:
  ```json
  {
    "push_enabled": "boolean",
    "email_enabled": "boolean",
    "proximity_alerts": "boolean",
    "group_invites": "boolean"
  }
  ```
- **Response**: Updated notification settings

## WebSocket API

### Connection
- **URL**: `wss://api.audiogroupapp.com/v1/ws`
- **Authentication**: JWT token as query parameter
  - `wss://api.audiogroupapp.com/v1/ws?token={jwt_token}`

### Events

#### Connection Events
- `connection:established`: Connection established successfully
- `connection:error`: Connection error
- `connection:closed`: Connection closed

#### User Events
- `user:status_changed`: User status changed
  ```json
  {
    "user_id": "uuid",
    "status": "enum(online, offline, away)"
  }
  ```

#### Group Events
- `group:member_joined`: New member joined group
  ```json
  {
    "group_id": "uuid",
    "user": {
      "id": "uuid",
      "username": "string",
      "profile_image_url": "string"
    }
  }
  ```
- `group:member_left`: Member left group
  ```json
  {
    "group_id": "uuid",
    "user_id": "uuid"
  }
  ```
- `group:settings_updated`: Group settings updated
  ```json
  {
    "group_id": "uuid",
    "settings": {
      // Updated settings
    }
  }
  ```

#### Audio Session Events
- `audio:session_created`: New audio session created
  ```json
  {
    "group_id": "uuid",
    "session_id": "uuid",
    "creator_id": "uuid",
    "session_type": "enum(voice_only, voice_with_music)"
  }
  ```
- `audio:session_ended`: Audio session ended
  ```json
  {
    "group_id": "uuid",
    "session_id": "uuid"
  }
  ```
- `audio:participant_joined`: Participant joined audio session
  ```json
  {
    "session_id": "uuid",
    "user": {
      "id": "uuid",
      "username": "string",
      "profile_image_url": "string"
    }
  }
  ```
- `audio:participant_left`: Participant left audio session
  ```json
  {
    "session_id": "uuid",
    "user_id": "uuid"
  }
  ```
- `audio:participant_mute_changed`: Participant mute status changed
  ```json
  {
    "session_id": "uuid",
    "user_id": "uuid",
    "mic_muted": "boolean",
    "speaker_muted": "boolean"
  }
  ```
- `audio:music_updated`: Music playback updated
  ```json
  {
    "session_id": "uuid",
    "currently_playing": {
      "title": "string",
      "artist": "string",
      "position": "number",
      "controlled_by": "uuid"
    },
    "action": "enum(play, pause, next, previous)"
  }
  ```

#### Location Events
- `location:updated`: Member location updated
  ```json
  {
    "group_id": "uuid",
    "user_id": "uuid",
    "coordinates": {
      "latitude": "number",
      "longitude": "number"
    },
    "timestamp": "timestamp"
  }
  ```
- `location:privacy_changed`: Location privacy changed
  ```json
  {
    "user_id": "uuid",
    "privacy_level": "enum(precise, approximate, hidden)"
  }
  ```

#### Proximity Events
- `proximity:alert_triggered`: Proximity alert triggered
  ```json
  {
    "alert_id": "uuid",
    "group_id": "uuid",
    "user_id": "uuid",
    "target_user_id": "uuid",
    "current_distance": "number",
    "threshold_distance": "number"
  }
  ```

#### Notification Events
- `notification:received`: New notification received
  ```json
  {
    "notification": {
      "id": "uuid",
      "type": "enum(group_invite, proximity_alert, subscription, system)",
      "title": "string",
      "body": "string",
      "data": {
        // Notification data
      }
    }
  }
  ```

### Client Commands
- `ping`: Ping server to keep connection alive
- `subscribe:group`: Subscribe to group events
  ```json
  {
    "group_id": "uuid"
  }
  ```
- `unsubscribe:group`: Unsubscribe from group events
  ```json
  {
    "group_id": "uuid"
  }
  ```
- `set:status`: Set user status
  ```json
  {
    "status": "enum(online, offline, away)"
  }
  ```

## WebRTC Signaling

### Connection
- **URL**: `wss://api.audiogroupapp.com/v1/rtc/{session_id}`
- **Authentication**: JWT token as query parameter
  - `wss://api.audiogroupapp.com/v1/rtc/{session_id}?token={jwt_token}`

### Events

#### Connection Events
- `rtc:ready`: Signaling connection established
- `rtc:error`: Signaling error
  ```json
  {
    "code": "string",
    "message": "string"
  }
  ```

#### Signaling Events
- `rtc:offer`: SDP offer from peer
  ```json
  {
    "sender_id": "uuid",
    "sdp": "string"
  }
  ```
- `rtc:answer`: SDP answer from peer
  ```json
  {
    "sender_id": "uuid",
    "sdp": "string"
  }
  ```
- `rtc:ice_candidate`: ICE candidate
  ```json
  {
    "sender_id": "uuid",
    "candidate": "string"
  }
  ```
- `rtc:peer_joined`: New peer joined
  ```json
  {
    "user_id": "uuid",
    "username": "string"
  }
  ```
- `rtc:peer_left`: Peer left
  ```json
  {
    "user_id": "uuid"
  }
  ```

### Client Commands
- `rtc:join`: Join RTC session
- `rtc:leave`: Leave RTC session
- `rtc:offer`: Send SDP offer
  ```json
  {
    "target_id": "uuid",
    "sdp": "string"
  }
  ```
- `rtc:answer`: Send SDP answer
  ```json
  {
    "target_id": "uuid",
    "sdp": "string"
  }
  ```
- `rtc:ice_candidate`: Send ICE candidate
  ```json
  {
    "target_id": "uuid",
    "candidate": "string"
  }
  ```

## API Versioning
- API version is included in the URL path (`/v1`)
- New versions will be released as `/v2`, `/v3`, etc.
- Older versions will be supported for at least 12 months after a new version is released

## Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INVALID_CREDENTIALS`: Invalid credentials
- `TOKEN_EXPIRED`: Token expired
- `PERMISSION_DENIED`: Permission denied
- `RESOURCE_NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Validation error
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `SUBSCRIPTION_REQUIRED`: Subscription required
- `INTERNAL_SERVER_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: Service unavailable
