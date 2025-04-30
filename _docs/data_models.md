# Data Models for Group Audio Communication App

## Overview
This document defines the data models for the group audio communication and location tracking application. These models represent the core entities in the system and their relationships.

## User Model

```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "phone_number": "string",
  "password_hash": "string",
  "first_name": "string",
  "last_name": "string",
  "profile_image_url": "string",
  "date_of_birth": "date",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "last_login": "timestamp",
  "status": "enum(active, inactive, suspended)",
  "preferences": {
    "notifications": {
      "push_enabled": "boolean",
      "email_enabled": "boolean",
      "proximity_alerts": "boolean",
      "group_invites": "boolean"
    },
    "privacy": {
      "share_location": "boolean",
      "location_history_enabled": "boolean",
      "appear_offline": "boolean"
    },
    "audio": {
      "auto_mute_on_join": "boolean",
      "noise_cancellation": "boolean",
      "music_volume": "number",
      "voice_volume": "number"
    }
  },
  "subscription": {
    "plan_id": "string",
    "status": "enum(active, inactive, trial, expired)",
    "start_date": "date",
    "end_date": "date",
    "auto_renew": "boolean",
    "payment_method_id": "string"
  },
  "devices": [
    {
      "id": "uuid",
      "type": "enum(ios, android, web)",
      "name": "string",
      "push_token": "string",
      "last_active": "timestamp"
    }
  ],
  "mfa_enabled": "boolean",
  "mfa_methods": ["enum(sms, authenticator, email)"]
}
```

## Group Model

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "owner_id": "uuid",
  "avatar_url": "string",
  "status": "enum(active, inactive, archived)",
  "privacy_level": "enum(public, private, secret)",
  "max_members": "number",
  "settings": {
    "join_approval_required": "boolean",
    "members_can_invite": "boolean",
    "location_sharing_required": "boolean",
    "music_sharing_enabled": "boolean",
    "proximity_alert_distance": "number",
    "default_mute_on_join": "boolean"
  },
  "members": [
    {
      "user_id": "uuid",
      "role": "enum(owner, admin, member)",
      "joined_at": "timestamp",
      "status": "enum(active, inactive, muted)",
      "nickname": "string",
      "last_active": "timestamp"
    }
  ],
  "invitations": [
    {
      "email": "string",
      "invited_by": "uuid",
      "invited_at": "timestamp",
      "status": "enum(pending, accepted, declined, expired)",
      "expires_at": "timestamp"
    }
  ]
}
```

## Audio Session Model

```json
{
  "id": "uuid",
  "group_id": "uuid",
  "created_at": "timestamp",
  "ended_at": "timestamp",
  "status": "enum(active, ended, paused)",
  "creator_id": "uuid",
  "session_type": "enum(voice_only, voice_with_music)",
  "recording_enabled": "boolean",
  "recording_url": "string",
  "participants": [
    {
      "user_id": "uuid",
      "joined_at": "timestamp",
      "left_at": "timestamp",
      "mic_muted": "boolean",
      "speaker_muted": "boolean",
      "connection_quality": "enum(excellent, good, fair, poor)",
      "device_type": "enum(ios, android, web)"
    }
  ],
  "music": {
    "currently_playing": {
      "title": "string",
      "artist": "string",
      "album": "string",
      "duration": "number",
      "position": "number",
      "controlled_by": "uuid",
      "started_at": "timestamp"
    },
    "playlist": [
      {
        "id": "uuid",
        "title": "string",
        "artist": "string",
        "album": "string",
        "duration": "number",
        "added_by": "uuid"
      }
    ]
  }
}
```

## Location Model

```json
{
  "user_id": "uuid",
  "timestamp": "timestamp",
  "coordinates": {
    "latitude": "number",
    "longitude": "number",
    "altitude": "number",
    "accuracy": "number",
    "altitude_accuracy": "number",
    "heading": "number",
    "speed": "number"
  },
  "device_id": "uuid",
  "battery_level": "number",
  "connection_type": "enum(wifi, cellular, offline)",
  "address": {
    "formatted_address": "string",
    "country": "string",
    "administrative_area": "string",
    "locality": "string",
    "postal_code": "string"
  },
  "shared_with_group_ids": ["uuid"],
  "privacy_level": "enum(precise, approximate, hidden)"
}
```

## Location History Model

```json
{
  "user_id": "uuid",
  "group_id": "uuid",
  "date": "date",
  "points": [
    {
      "timestamp": "timestamp",
      "coordinates": {
        "latitude": "number",
        "longitude": "number"
      },
      "accuracy": "number",
      "speed": "number"
    }
  ],
  "total_distance": "number",
  "average_speed": "number",
  "max_speed": "number",
  "start_time": "timestamp",
  "end_time": "timestamp"
}
```

## Subscription Plan Model

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "price": "number",
  "currency": "string",
  "billing_cycle": "enum(monthly, quarterly, annual)",
  "features": {
    "max_groups": "number",
    "max_members_per_group": "number",
    "location_history_retention_days": "number",
    "high_quality_audio": "boolean",
    "music_sharing": "boolean",
    "recording": "boolean",
    "priority_support": "boolean"
  },
  "trial_period_days": "number",
  "active": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Payment Model

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "subscription_id": "uuid",
  "amount": "number",
  "currency": "string",
  "status": "enum(pending, completed, failed, refunded)",
  "payment_method": {
    "type": "enum(credit_card, paypal, apple_pay, google_pay)",
    "last_four": "string",
    "expiry_date": "string",
    "billing_address": {
      "line1": "string",
      "line2": "string",
      "city": "string",
      "state": "string",
      "postal_code": "string",
      "country": "string"
    }
  },
  "invoice_url": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Notification Model

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "enum(group_invite, proximity_alert, subscription, system)",
  "title": "string",
  "body": "string",
  "data": {
    "group_id": "uuid",
    "sender_id": "uuid",
    "action_url": "string"
  },
  "read": "boolean",
  "created_at": "timestamp",
  "expires_at": "timestamp",
  "priority": "enum(low, normal, high, critical)"
}
```

## Device Token Model

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "device_id": "string",
  "token": "string",
  "platform": "enum(ios, android, web)",
  "app_version": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "last_used": "timestamp"
}
```

## Proximity Alert Model

```json
{
  "id": "uuid",
  "group_id": "uuid",
  "user_id": "uuid",
  "target_user_id": "uuid",
  "distance_threshold": "number",
  "current_distance": "number",
  "status": "enum(active, triggered, dismissed)",
  "created_at": "timestamp",
  "triggered_at": "timestamp"
}
```

## Relationships Between Models

1. **User to Group**: Many-to-Many
   - Users can be members of multiple groups
   - Groups have multiple user members

2. **User to Subscription Plan**: Many-to-One
   - Many users can have the same subscription plan
   - Each user has one active subscription plan

3. **Group to Audio Session**: One-to-Many
   - A group can have multiple audio sessions (historical)
   - Each audio session belongs to one group

4. **User to Audio Session**: Many-to-Many
   - Users can participate in multiple audio sessions
   - Audio sessions have multiple participants

5. **User to Location**: One-to-Many
   - A user has many location records over time
   - Each location record belongs to one user

6. **User to Payment**: One-to-Many
   - A user can have multiple payment records
   - Each payment record belongs to one user

7. **User to Notification**: One-to-Many
   - A user can have multiple notifications
   - Each notification is for one user

8. **User to Device Token**: One-to-Many
   - A user can have multiple device tokens (multiple devices)
   - Each device token belongs to one user

9. **Group to Proximity Alert**: One-to-Many
   - A group can have multiple proximity alerts
   - Each proximity alert belongs to one group

## Database Implementation Considerations

1. **PostgreSQL Tables**:
   - Users
   - Groups
   - GroupMembers (junction table)
   - SubscriptionPlans
   - UserSubscriptions
   - Payments
   - DeviceTokens
   - Notifications

2. **MongoDB Collections**:
   - UserProfiles (for flexible user preferences)
   - GroupSettings (for flexible group settings)

3. **Redis**:
   - User online status
   - Active audio sessions
   - Temporary location data

4. **InfluxDB**:
   - Location history
   - Performance metrics

5. **Indexing Strategy**:
   - Index on user_id, group_id for quick lookups
   - Geospatial indexing for location queries
   - Composite indexes for common query patterns

6. **Sharding Considerations**:
   - Shard location data by user_id or group_id
   - Shard historical data by time periods
