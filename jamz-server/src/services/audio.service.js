const AudioSession = require('../models/audio-session.model');
const Group = require('../models/group.model');
const mediasoupConfig = require('../config/mediasoup');
const { v4: uuidv4 } = require('uuid');

/**
 * Audio service for handling real-time audio communication
 */
class AudioService {
  constructor() {
    this.workers = [];
    this.rooms = new Map(); // Map of active audio sessions by group ID
    this.initialize();
  }

  /**
   * Initialize mediasoup workers
   */
  async initialize() {
    try {
      // Skip MediaSoup initialization if disabled (for testing/development)
      if (process.env.DISABLE_MEDIASOUP === 'true') {
        console.log('MediaSoup initialization skipped (DISABLE_MEDIASOUP=true)');
        return;
      }

      // Create mediasoup workers (CPU cores - 1, minimum 1)
      const numWorkers = Math.max(1, require('os').cpus().length - 1);
      await mediasoupConfig.createWorkers(numWorkers);
      console.log(`AudioService initialized with ${numWorkers} mediasoup workers`);
    } catch (error) {
      console.error('Error initializing AudioService:', error);
    }
  }

  /**
   * Create a new audio session for a group
   * @param {string} groupId - Group ID
   * @param {Object} sessionData - Session creation data
   * @param {string} creatorId - User ID of the creator
   * @returns {Promise<Object>} - Newly created audio session
   */
  async createAudioSession(groupId, sessionData, creatorId) {
    try {
      // Check if group exists
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is a member of the group
      if (!group.isMember(creatorId)) {
        throw new Error('User is not a member of this group');
      }

      // Check if there's already an active session
      const existingSession = await AudioSession.findActiveByGroupId(groupId);
      if (existingSession) {
        throw new Error('An active audio session already exists for this group');
      }

      // Check if MediaSoup is available
      const mediasoupEnabled = process.env.DISABLE_MEDIASOUP !== 'true';
      let router = null;
      let router_id = null;
      let rtpCapabilities = null;

      if (mediasoupEnabled) {
        try {
          // Create mediasoup router
          router = await mediasoupConfig.createRouter();
          router_id = router.id;
          rtpCapabilities = router.rtpCapabilities;
        } catch (error) {
          console.warn('MediaSoup router creation failed, falling back to peer-to-peer mode:', error.message);
        }
      }

      // Create new audio session (works with or without MediaSoup)
      const audioSession = new AudioSession({
        group_id: groupId,
        creator_id: creatorId,
        session_type: sessionData.session_type || 'voice_only',
        recording_enabled: sessionData.recording_enabled || false,
        router_id: router_id,
        participants: [{
          user_id: creatorId,
          joined_at: new Date(),
          device_type: sessionData.device_type || 'web'
        }],
        mode: router ? 'mediasoup' : 'p2p' // Track which mode we're using
      });

      await audioSession.save();

      // Store router in memory if available
      if (router) {
        this.rooms.set(audioSession.id.toString(), {
          router,
          transports: new Map(),
          producers: new Map(),
          consumers: new Map()
        });
      } else {
        // For P2P mode, create a minimal room entry
        this.rooms.set(audioSession.id.toString(), {
          router: null,
          transports: new Map(),
          producers: new Map(),
          consumers: new Map(),
          mode: 'p2p'
        });
      }

      return {
        session: audioSession,
        rtpCapabilities: rtpCapabilities,
        mode: router ? 'mediasoup' : 'p2p'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get active audio session for a group
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} - Active audio session
   */
  async getActiveAudioSession(groupId) {
    try {
      const session = await AudioSession.findActiveByGroupId(groupId);
      if (!session) {
        throw new Error('No active audio session found for this group');
      }

      // Get router
      const room = this.rooms.get(session.id.toString());
      if (!room) {
        // Router not in memory, recreate it
        const router = await mediasoupConfig.createRouter();
        this.rooms.set(session.id.toString(), {
          router,
          transports: new Map(),
          producers: new Map(),
          consumers: new Map()
        });

        return {
          session,
          rtpCapabilities: router.rtpCapabilities
        };
      }

      return {
        session,
        rtpCapabilities: room.router.rtpCapabilities
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Join an audio session
   * @param {string} sessionId - Audio session ID
   * @param {string} user_id - User ID
   * @param {string} deviceType - Device type
   * @returns {Promise<Object>} - Updated audio session
   */
  async joinAudioSession(sessionId, user_id, deviceType = 'web') {
    try {
      const session = await AudioSession.findById(sessionId);
      if (!session) {
        throw new Error('Audio session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Audio session is not active');
      }

      // Check if user is a member of the group
      const group = await Group.findById(session.group_id);
      if (!group || !group.isMember(user_id)) {
        throw new Error('User is not a member of this group');
      }

      // Add user to participants if not already there
      session.addParticipant(user_id, deviceType);
      await session.save();

      // Get router
      const room = this.rooms.get(sessionId);
      if (!room) {
        throw new Error('Audio session room not found');
      }

      return {
        session,
        rtpCapabilities: room.router.rtpCapabilities
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create WebRTC transport for a participant
   * @param {string} sessionId - Audio session ID
   * @param {string} user_id - User ID
   * @param {string} direction - Transport direction (send/receive)
   * @returns {Promise<Object>} - Transport parameters
   */
  async createWebRtcTransport(sessionId, user_id, direction) {
    try {
      // Get room
      const room = this.rooms.get(sessionId);
      if (!room) {
        throw new Error('Audio session room not found');
      }

      // Create transport
      const transport = await mediasoupConfig.createWebRtcTransport(room.router);

      // Generate a client ID for this transport
      const clientId = uuidv4();

      // Store transport
      room.transports.set(transport.id, {
        transport,
        user_id,
        clientId,
        direction
      });

      // Update session in database
      const session = await AudioSession.findById(sessionId);
      if (session) {
        session.transports.push({
          id: transport.id,
          user_id: user_id,
          client_id: clientId,
          direction
        });
        await session.save();
      }

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        clientId
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Connect WebRTC transport
   * @param {string} sessionId - Audio session ID
   * @param {string} transportId - Transport ID
   * @param {Object} dtlsParameters - DTLS parameters
   * @returns {Promise<boolean>} - Success status
   */
  async connectWebRtcTransport(sessionId, transportId, dtlsParameters) {
    try {
      // Get room
      const room = this.rooms.get(sessionId);
      if (!room) {
        throw new Error('Audio session room not found');
      }

      // Get transport
      const transportData = room.transports.get(transportId);
      if (!transportData) {
        throw new Error('Transport not found');
      }

      // Connect transport
      await transportData.transport.connect({ dtlsParameters });
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create producer for audio
   * @param {string} sessionId - Audio session ID
   * @param {string} transportId - Transport ID
   * @param {Object} rtpParameters - RTP parameters
   * @returns {Promise<Object>} - Producer ID
   */
  async createProducer(sessionId, transportId, rtpParameters) {
    try {
      // Get room
      const room = this.rooms.get(sessionId);
      if (!room) {
        throw new Error('Audio session room not found');
      }

      // Get transport
      const transportData = room.transports.get(transportId);
      if (!transportData) {
        throw new Error('Transport not found');
      }

      // Create producer
      const producer = await transportData.transport.produce({
        kind: 'audio',
        rtpParameters
      });

      // Store producer
      room.producers.set(producer.id, {
        producer,
        user_id: transportData.user_id
      });

      // Update session in database
      const session = await AudioSession.findById(sessionId);
      if (session) {
        session.producers.push({
          id: producer.id,
          user_id: transportData.user_id,
          kind: 'audio',
          transport_id: transportId
        });
        await session.save();
      }

      return { user_id: producer.id };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create consumer for audio
   * @param {string} sessionId - Audio session ID
   * @param {string} transportId - Transport ID
   * @param {string} producerId - Producer ID
   * @param {Object} rtpCapabilities - RTP capabilities
   * @returns {Promise<Object>} - Consumer parameters
   */
  async createConsumer(sessionId, transportId, producerId, rtpCapabilities) {
    try {
      // Get room
      const room = this.rooms.get(sessionId);
      if (!room) {
        throw new Error('Audio session room not found');
      }

      // Get transport
      const transportData = room.transports.get(transportId);
      if (!transportData) {
        throw new Error('Transport not found');
      }

      // Get producer
      const producerData = room.producers.get(producerId);
      if (!producerData) {
        throw new Error('Producer not found');
      }

      // Check if consumer can consume the producer
      if (!room.router.canConsume({
        producerId,
        rtpCapabilities
      })) {
        throw new Error('Cannot consume this producer');
      }

      // Create consumer
      const consumer = await transportData.transport.consume({
        producerId,
        rtpCapabilities,
        paused: true // Start paused, client will resume
      });

      // Store consumer
      room.consumers.set(consumer.id, {
        consumer,
        user_id: transportData.user_id,
        producerId
      });

      // Update session in database
      const session = await AudioSession.findById(sessionId);
      if (session) {
        session.consumers.push({
          id: consumer.id,
          user_id: transportData.user_id,
          producer_id: producerId,
          transport_id: transportId
        });
        await session.save();
      }

      return {
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        producerUserId: producerData.user_id
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resume consumer
   * @param {string} sessionId - Audio session ID
   * @param {string} consumerId - Consumer ID
   * @returns {Promise<boolean>} - Success status
   */
  async resumeConsumer(sessionId, consumerId) {
    try {
      // Get room
      const room = this.rooms.get(sessionId);
      if (!room) {
        throw new Error('Audio session room not found');
      }

      // Get consumer
      const consumerData = room.consumers.get(consumerId);
      if (!consumerData) {
        throw new Error('Consumer not found');
      }

      // Resume consumer
      await consumerData.consumer.resume();
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Add to audio.service.js
  // Music synchronization function
  async syncMusicPlayback(sessionId, trackData, position, isPlaying) {
    try {
      const session = await AudioSession.findById(sessionId);
      if (!session) {
        throw new Error('Audio session not found');
      }
      
      // Update currently playing track
      session.music.currently_playing = {
        ...trackData,
        position: position,
        started_at: new Date(Date.now() - position),
        is_playing: isPlaying
      };
      
      await session.save();
      
      // Broadcast to all participants via WebSocket/Kafka
      const musicEvent = {
        type: isPlaying ? 'music_play' : 'music_pause',
        sessionId,
        trackData,
        position,
        timestamp: Date.now()
      };
      
      // Use your existing Kafka producer or WebSocket to broadcast
      kafkaProducer.send({
        topic: 'audio-events',
        messages: [{ value: JSON.stringify(musicEvent) }]
      });
      
      return session;
    } catch (error) {
      console.error('Error syncing music playback:', error);
      throw error;
    }
  };

  /**
   * Update participant status
   * @param {string} sessionId - Audio session ID
   * @param {string} user_id - User ID
   * @param {Object} status - Status updates
   * @returns {Promise<Object>} - Updated participant
   */
  async updateParticipantStatus(sessionId, user_id, status) {
    try {
      const session = await AudioSession.findById(sessionId);
      if (!session) {
        throw new Error('Audio session not found');
      }

      // Update participant status
      session.updateParticipantStatus(user_id, status);
      await session.save();

      // Get participant
      const participant = session.participants.find(p => p.user_id === user_id && !p.left_at);
      return participant;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Leave audio session
   * @param {string} sessionId - Audio session ID
   * @param {string} user_id - User ID
   * @returns {Promise<boolean>} - Success status
   */
  async leaveAudioSession(sessionId, user_id) {
    try {
      const session = await AudioSession.findById(sessionId);
      if (!session) {
        throw new Error('Audio session not found');
      }

      // Remove participant
      session.removeParticipant(user_id);
      await session.save();

      // Clean up WebRTC resources
      const room = this.rooms.get(sessionId);
      if (room) {
        // Close all transports for this user
        for (const [transportId, transportData] of room.transports.entries()) {
          if (transportData.user_id === user_id) {
            transportData.transport.close();
            room.transports.delete(transportId);
          }
        }

        // Close all producers for this user
        for (const [producerId, producerData] of room.producers.entries()) {
          if (producerData.user_id === user_id) {
            producerData.producer.close();
            room.producers.delete(producerId);
          }
        }

        // Close all consumers for this user
        for (const [consumerId, consumerData] of room.consumers.entries()) {
          if (consumerData.user_id === user_id) {
            consumerData.consumer.close();
            room.consumers.delete(consumerId);
          }
        }
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * End audio session
   * @param {string} sessionId - Audio session ID
   * @param {string} user_id - User ID making the request
   * @returns {Promise<Object>} - Updated audio session
   */
  async endAudioSession(sessionId, user_id) {
    try {
      const session = await AudioSession.findById(sessionId);
      if (!session) {
        throw new Error('Audio session not found');
      }

      // Check if user is the creator or an admin
      const group = await Group.findById(session.group_id);
      if (!group || (!group.isAdmin(user_id) && session.creator_id !== user_id)) {
        throw new Error('Permission denied');
      }

      // Update session status
      session.status = 'ended';
      session.ended_at = new Date();
      await session.save();

      // Clean up WebRTC resources
      const room = this.rooms.get(sessionId);
      if (room) {
        // Close all transports
        for (const [, transportData] of room.transports.entries()) {
          transportData.transport.close();
        }

        // Remove room
        this.rooms.delete(sessionId);
      }

      return session;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add music to session playlist
   * @param {string} sessionId - Audio session ID
   * @param {Object} track - Track data
   * @param {string} user_id - User ID adding the track
   * @returns {Promise<Object>} - Updated playlist
   */
  async addMusicToPlaylist(sessionId, track, user_id) {
    try {
      const session = await AudioSession.findById(sessionId);
      if (!session) {
        throw new Error('Audio session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Audio session is not active');
      }

      if (session.session_type !== 'voice_with_music') {
        throw new Error('This session does not support music sharing');
      }

      // Add track to playlist
      session.addToPlaylist(track, user_id);
      await session.save();

      return session.music.playlist;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Control music playback
   * @param {string} sessionId - Audio session ID
   * @param {string} action - Playback action
   * @param {Object} options - Additional options
   * @param {string} user_id - User ID controlling playback
   * @returns {Promise<Object>} - Updated music status
   */
  async controlMusicPlayback(sessionId, action, options, user_id) {
    try {
      const session = await AudioSession.findById(sessionId);
      if (!session) {
        throw new Error('Audio session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Audio session is not active');
      }

      if (session.session_type !== 'voice_with_music') {
        throw new Error('This session does not support music sharing');
      }

      // Initialize music object if it doesn't exist
      if (!session.music) {
        session.music = { playlist: [] };
      }

      switch (action) {
        case 'play':
          if (options.trackId) {
            // Play specific track from playlist
            const track = session.music.playlist.find(t => t.id === options.trackId);
            if (!track) {
              throw new Error('Track not found in playlist');
            }
            session.updateCurrentlyPlaying(track, user_id);
          } else if (session.music.currently_playing) {
            // Resume current track
            session.music.currently_playing.controlled_by = user_id;
            session.music.currently_playing.position = options.position || 0;
            session.music.currently_playing.started_at = new Date();
          } else if (session.music.playlist.length > 0) {
            // Play first track in playlist
            session.updateCurrentlyPlaying(session.music.playlist[0], user_id);
          } else {
            throw new Error('No tracks in playlist');
          }
          break;

        case 'pause':
          if (!session.music.currently_playing) {
            throw new Error('No track is currently playing');
          }
          session.music.currently_playing.controlled_by = user_id;
          session.music.currently_playing.position = options.position || 0;
          break;

        case 'next':
          if (!session.music.currently_playing || !session.music.playlist.length) {
            throw new Error('No tracks in playlist');
          }
          
          // Find current track index
          const currentIndex = session.music.playlist.findIndex(
            t => t.id === session.music.currently_playing.id
          );
          
          // Get next track
          const nextIndex = (currentIndex + 1) % session.music.playlist.length;
          session.updateCurrentlyPlaying(session.music.playlist[nextIndex], user_id);
          break;

        case 'previous':
          if (!session.music.currently_playing || !session.music.playlist.length) {
            throw new Error('No tracks in playlist');
          }
          
          // Find current track index
          const currIndex = session.music.playlist.findIndex(
            t => t.id === session.music.currently_playing.id
          );
          
          // Get previous track
          const prevIndex = (currIndex - 1 + session.music.playlist.length) % session.music.playlist.length;
          session.updateCurrentlyPlaying(session.music.playlist[prevIndex], user_id);
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      await session.save();
      return session.music;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AudioService();
