-- Active: 1742414253668@@127.0.0.1@5432@audiogroupapp@public
-----------------------------
-- Core User Management
-----------------------------
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ,
    auth_token VARCHAR(512),
    token_version INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-----------------------------
-- Group Management
-----------------------------
CREATE TABLE groups (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(100) NOT NULL,
    owner_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    encryption_key BYTEA NOT NULL,
    max_members INTEGER DEFAULT 20
);

CREATE TABLE group_members (
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) CHECK (role IN ('owner', 'admin', 'member')),
    PRIMARY KEY (group_id, user_id)
);

-----------------------------
-- Location Tracking
-----------------------------
CREATE TABLE locations (
    location_id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,  -- PostGIS geometry type
    altitude DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    session_id UUID NOT NULL,
    battery_level SMALLINT
);

-- Spatial index for fast proximity queries
CREATE INDEX idx_locations_geom ON locations USING GIST(location);
CREATE INDEX idx_locations_user ON locations(user_id);
CREATE INDEX idx_locations_session ON locations(session_id);

-----------------------------
-- Audio Sessions
-----------------------------
CREATE TABLE audio_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    current_song_id VARCHAR(255),
    playback_position INTERVAL,
    encryption_iv BYTEA NOT NULL,
    rtmp_url VARCHAR(512)
);

-----------------------------
-- Messaging (Optional)
-----------------------------
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    content BYTEA NOT NULL,  -- Encrypted message
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    message_type VARCHAR(20) CHECK (message_type IN ('text', 'audio', 'command'))
);

-----------------------------
-- Security & Encryption
-----------------------------
CREATE TABLE encryption_keys (
    key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    key_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    algorithm VARCHAR(50) NOT NULL,
    expires_at TIMESTAMPTZ
);

-- Indexes for security tables
CREATE INDEX idx_encryption_keys_group ON encryption_keys(group_id);