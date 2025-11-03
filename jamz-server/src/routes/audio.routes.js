const express = require('express');
const router = express.Router();
const audioService = require('../services/audio.service');
const passport = require('passport');
const { body, param, validationResult } = require('express-validator');
const s3Service = require('../services/s3.service');
const path = require('path');

// Middleware to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route POST /api/audio/sessions
 * @desc Create a new audio session for a group
 * @access Private
 */
router.post('/sessions',
  passport.authenticate('jwt', { session: false }),
  [
    body('group_id').isMongoId().withMessage('Valid group ID is required'),
    body('session_type').optional().isIn(['voice_only', 'voice_with_music']).withMessage('Invalid session type'),
    body('recording_enabled').optional().isBoolean().withMessage('Recording enabled must be a boolean'),
    body('device_type').optional().isIn(['ios', 'android', 'web']).withMessage('Invalid device type'),
    validate
  ],
  async (req, res) => {
    try {
      const sessionData = {
        session_type: req.body.session_type || 'voice_only',
        recording_enabled: req.body.recording_enabled || false,
        device_type: req.body.device_type || 'web'
      };

      const result = await audioService.createAudioSession(req.body.group_id, sessionData, req.user.user_id);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/audio/sessions/group/:groupId
 * @desc Get active audio session for a group
 * @access Private
 */
router.get('/sessions/group/:groupId',
  passport.authenticate('jwt', { session: false }),
  [
    param('groupId').isMongoId().withMessage('Valid group ID is required'),
    validate
  ],
  async (req, res) => {
    // Set no-cache headers to prevent 304 responses
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    try {
      const result = await audioService.getActiveAudioSession(req.params.groupId);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/join
 * @desc Join an audio session
 * @access Private
 */
router.post('/sessions/:sessionId/join',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    body('device_type').optional().isIn(['ios', 'android', 'web']).withMessage('Invalid device type'),
    validate
  ],
  async (req, res) => {
    try {
      const result = await audioService.joinAudioSession(
        req.params.sessionId,
        req.user.user_id,
        req.body.device_type || 'web'
      );
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/transport
 * @desc Create WebRTC transport
 * @access Private
 */
router.post('/sessions/:sessionId/transport',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    body('direction').isIn(['send', 'receive']).withMessage('Direction must be send or receive'),
    validate
  ],
  async (req, res) => {
    try {
      const transport = await audioService.createWebRtcTransport(
        req.params.sessionId,
        req.user.user_id,
        req.body.direction
      );
      res.json({ success: true, transport });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/transport/:transportId/connect
 * @desc Connect WebRTC transport
 * @access Private
 */
router.post('/sessions/:sessionId/transport/:transportId/connect',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    param('transportId').exists().withMessage('Valid transport ID is required'),
    body('dtlsParameters').isObject().withMessage('DTLS parameters are required'),
    validate
  ],
  async (req, res) => {
    try {
      await audioService.connectWebRtcTransport(
        req.params.sessionId,
        req.params.transportId,
        req.body.dtlsParameters
      );
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/transport/:transportId/produce
 * @desc Create producer for audio
 * @access Private
 */
router.post('/sessions/:sessionId/transport/:transportId/produce',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    param('transportId').exists().withMessage('Valid transport ID is required'),
    body('rtpParameters').isObject().withMessage('RTP parameters are required'),
    validate
  ],
  async (req, res) => {
    try {
      const producer = await audioService.createProducer(
        req.params.sessionId,
        req.params.transportId,
        req.body.rtpParameters
      );
      res.json({ success: true, producer });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/transport/:transportId/consume
 * @desc Create consumer for audio
 * @access Private
 */
router.post('/sessions/:sessionId/transport/:transportId/consume',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    param('transportId').exists().withMessage('Valid transport ID is required'),
    body('producerId').exists().withMessage('Producer ID is required'),
    body('rtpCapabilities').isObject().withMessage('RTP capabilities are required'),
    validate
  ],
  async (req, res) => {
    try {
      const consumer = await audioService.createConsumer(
        req.params.sessionId,
        req.params.transportId,
        req.body.producerId,
        req.body.rtpCapabilities
      );
      res.json({ success: true, consumer });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/consumer/:consumerId/resume
 * @desc Resume consumer
 * @access Private
 */
router.post('/sessions/:sessionId/consumer/:consumerId/resume',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    param('consumerId').exists().withMessage('Valid consumer ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      await audioService.resumeConsumer(
        req.params.sessionId,
        req.params.consumerId
      );
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route PUT /api/audio/sessions/:sessionId/status
 * @desc Update participant status
 * @access Private
 */
router.put('/sessions/:sessionId/status',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    body('mic_muted').optional().isBoolean().withMessage('Mic muted must be a boolean'),
    body('speaker_muted').optional().isBoolean().withMessage('Speaker muted must be a boolean'),
    validate
  ],
  async (req, res) => {
    try {
      const status = {
        mic_muted: req.body.mic_muted,
        speaker_muted: req.body.speaker_muted
      };

      const participant = await audioService.updateParticipantStatus(
        req.params.sessionId,
        req.user.user_id,
        status
      );
      res.json({ success: true, participant });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/leave
 * @desc Leave audio session
 * @access Private
 */
router.post('/sessions/:sessionId/leave',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      await audioService.leaveAudioSession(req.params.sessionId, req.user.user_id);
      res.json({ success: true, message: 'Left audio session successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/end
 * @desc End audio session
 * @access Private
 */
router.post('/sessions/:sessionId/end',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      const session = await audioService.endAudioSession(req.params.sessionId, req.user.user_id);
      res.json({ success: true, session });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/music/playlist
 * @desc Add music to session playlist
 * @access Private
 */
router.post('/sessions/:sessionId/music/playlist',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    body('title').exists().withMessage('Track title is required'),
    body('artist').optional(),
    body('album').optional(),
    body('duration').optional().isNumeric().withMessage('Duration must be a number'),
    validate
  ],
  async (req, res) => {
    try {
      const track = {
        title: req.body.title,
        artist: req.body.artist,
        album: req.body.album,
        duration: req.body.duration
      };

      const playlist = await audioService.addMusicToPlaylist(
        req.params.sessionId,
        track,
        req.user.user_id
      );
      res.status(201).json({ success: true, playlist });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/music/control
 * @desc Control music playback
 * @access Private
 */
router.post('/sessions/:sessionId/music/control',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    body('action').isIn(['play', 'pause', 'next', 'previous']).withMessage('Invalid action'),
    body('track_id').optional(),
    body('position').optional().isNumeric().withMessage('Position must be a number'),
    validate
  ],
  async (req, res) => {
    try {
      const options = {
        trackId: req.body.track_id,
        position: req.body.position
      };

      const music = await audioService.controlMusicPlayback(
        req.params.sessionId,
        req.body.action,
        options,
        req.user.user_id
      );
      res.json({ success: true, music });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * @route GET /api/audio-session/:groupId/status
 * @desc Check if an audio session is active for a group
 * @access Private
 */
router.get('/audio-session/:groupId/status',
  passport.authenticate('jwt', { session: false }),
  [
    param('groupId').isMongoId().withMessage('Valid group ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      const result = await audioService.getActiveAudioSession(req.params.groupId);
      // If we found a session, it's active
      res.json({ 
        success: true, 
        active: result && result.session ? true : false,
        sessionId: result?.session?._id || null
      });
    } catch (error) {
      // No active session found
      res.json({ success: true, active: false });
    }
  }
);

/**
 * @route PATCH /api/audio/sessions/:sessionId/enable-music
 * @desc Enable music for an existing session by updating session_type
 * @access Private
 */
router.patch('/sessions/:sessionId/enable-music',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      const AudioSession = require('../models/audio-session.model');
      const session = await AudioSession.findById(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Audio session not found'
        });
      }

      // Update session type to support music
      session.session_type = 'voice_with_music';
      await session.save();

      res.json({
        success: true,
        message: 'Music enabled for session',
        session: {
          id: session._id,
          session_type: session.session_type
        }
      });
    } catch (error) {
      console.error('Error enabling music for session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enable music: ' + error.message
      });
    }
  }
);

/**
 * @route POST /api/audio/sessions/:sessionId/upload-music
 * @desc Upload music file to session
 * @access Private
 */
router.post('/sessions/:sessionId/upload-music',
  passport.authenticate('jwt', { session: false }),
  s3Service.audioUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      const { sessionId } = req.params;
      
      // Validate session exists
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }
      
      // Check if Supabase is configured
      if (!s3Service.isSupabaseConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Storage service not configured'
        });
      }
      
      // Generate unique filename for music file
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(req.file.originalname);
      const filename = `music-${sessionId}-${uniqueSuffix}${extension}`;
      const filePath = `session-music/${filename}`;
      
      console.log('Uploading music file:', { 
        filePath, 
        sessionId, 
        originalName: req.file.originalname,
        size: req.file.buffer.length,
        mimetype: req.file.mimetype
      });
      
      // Upload to Supabase
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
          cacheControl: '3600'
        });
      
      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      console.log('Music file uploaded successfully:', data);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);
      
      // Add to playlist
      const track = {
        title: req.file.originalname.replace(extension, ''),
        fileUrl: urlData.publicUrl,
        duration: 0, // Will be determined by client
        uploadedBy: req.user.user_id
      };
      
      const playlist = await audioService.addMusicToPlaylist(
        sessionId,
        track,
        req.user.user_id
      );
      
      res.json({
        success: true,
        fileUrl: urlData.publicUrl,
        track: track,
        playlist: playlist
      });
    } catch (error) {
      console.error('Music upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload music file'
      });
    }
  }
);

module.exports = router;
