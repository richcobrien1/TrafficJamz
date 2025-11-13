const express = require('express');
const router = express.Router();
const audioService = require('../services/audio.service');
const passport = require('passport');
const { body, param, validationResult } = require('express-validator');
const s3Service = require('../services/s3.service');
const path = require('path');
const { parseBuffer } = require('music-metadata');

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
 * @route GET /api/audio/sessions/:sessionId
 * @desc Get audio session by ID with playlist
 * @access Private
 */
router.get('/sessions/:sessionId',
  // TODO: Re-enable authentication after testing
  // passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    validate
  ],
  async (req, res) => {
    // TEMPORARY: Hardcode user for testing
    req.user = { user_id: '2f089fec-0f70-47c2-b485-fa83ec034e0f' };
    
    // Set no-cache headers to prevent 304 responses
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    try {
      const AudioSession = require('../models/audio-session.model');
      const session = await AudioSession.findById(req.params.sessionId).lean();
      
      if (!session) {
        return res.status(404).json({ success: false, message: 'Audio session not found' });
      }
      
      // Check if user is a participant
      const isParticipant = session.participants.some(
        p => p.user_id.toString() === req.user.user_id.toString()
      );
      
      if (!isParticipant) {
        return res.status(403).json({ success: false, message: 'Not a participant in this session' });
      }
      
      console.log('📖 GET session:', req.params.sessionId, 'Playlist tracks:', session.music?.playlist?.length || 0);
      if (session.music?.playlist) {
        console.log('📋 Session playlist:', JSON.stringify(session.music.playlist.map(t => ({ 
          title: t.title, 
          artist: t.artist,
          hasAlbumArt: !!t.albumArt,
          albumArtLength: t.albumArt?.length 
        }))));
      }
      
      res.json({ success: true, session });
    } catch (error) {
      console.error('Error fetching audio session:', error);
      res.status(500).json({ success: false, message: error.message });
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
    body('artist').optional({ nullable: true }),
    body('album').optional({ nullable: true }),
    body('duration').optional({ nullable: true }).custom(value => value === null || value === undefined || !isNaN(value)).withMessage('Duration must be a number'),
    body('fileUrl').optional({ nullable: true }),
    body('uploadedBy').optional({ nullable: true }),
    body('source').optional({ nullable: true }).isIn(['local', 'spotify', 'youtube', 'apple_music', null]).withMessage('Invalid source'),
    body('spotifyId').optional({ nullable: true }),
    body('spotifyPreviewUrl').optional({ nullable: true }),
    body('albumArt').optional({ nullable: true }),
    validate
  ],
  async (req, res) => {
    try {
      const track = {
        title: req.body.title,
        artist: req.body.artist,
        album: req.body.album,
        duration: req.body.duration,
        fileUrl: req.body.fileUrl,
        uploadedBy: req.body.uploadedBy,
        source: req.body.source,
        spotifyId: req.body.spotifyId,
        spotifyPreviewUrl: req.body.spotifyPreviewUrl,
        albumArt: req.body.albumArt
      };

      const playlist = await audioService.addMusicToPlaylist(
        req.params.sessionId,
        track,
        req.user.user_id
      );
      res.json({ success: true, playlist });
    } catch (error) {
      res.status(400).json({ success: false, errors: [{ msg: error.message }] });
    }
  }
);

/**
 * @route DELETE /api/audio/sessions/:sessionId/music/playlist/clear
 * @desc Clear all tracks from session playlist
 * @access Private
 */
router.delete('/sessions/:sessionId/music/playlist/clear',
  passport.authenticate('jwt', { session: false }),
  [
    param('sessionId').isMongoId().withMessage('Valid session ID is required'),
    validate
  ],
  async (req, res) => {
    try {
      const userId = req.user.user_id || req.user.id;
      await audioService.clearPlaylist(req.params.sessionId, userId);
      res.json({ success: true, message: 'Playlist cleared' });
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
 * @desc Upload music file to session (uploads to Cloudflare R2, NOT Supabase)
 * @access Private
 * @note Music files are stored in Cloudflare R2 bucket for free egress and CDN
 */
router.post('/sessions/:sessionId/upload-music',
  // TODO: Re-enable authentication after testing
  // passport.authenticate('jwt', { session: false }),
  s3Service.audioUpload.single('file'),
  async (req, res) => {
    // TEMPORARY: Hardcode user for testing
    req.user = { user_id: '2f089fec-0f70-47c2-b485-fa83ec034e0f' };
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
      
      // Check if R2 is configured
      const { uploadToR2, isR2Configured } = require('../services/r2.service');
      
      if (!isR2Configured()) {
        return res.status(503).json({
          success: false,
          message: 'R2 storage not configured. Please set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ACCOUNT_ID or R2_ENDPOINT environment variables.'
        });
      }
      
      console.log('Uploading music file to R2:', { 
        sessionId, 
        originalName: req.file.originalname,
        size: req.file.buffer.length,
        mimetype: req.file.mimetype
      });
      
      // Extract MP3 metadata (ID3 tags) before uploading
      let metadata = null;
      let albumArt = null;
      try {
        metadata = await parseBuffer(req.file.buffer, req.file.mimetype);
        console.log('Extracted metadata:', {
          title: metadata.common.title,
          artist: metadata.common.artist,
          album: metadata.common.album,
          duration: metadata.format.duration
        });
        
        // Extract album artwork if available
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const picture = metadata.common.picture[0];
          
          // Debug the picture.data type
          console.log('Picture data type:', typeof picture.data);
          console.log('Picture data is Buffer:', Buffer.isBuffer(picture.data));
          console.log('Picture data is Uint8Array:', picture.data instanceof Uint8Array);
          console.log('Picture data length:', picture.data.length);
          
          // Ensure picture.data is a Buffer and convert to base64
          const dataBuffer = Buffer.isBuffer(picture.data) 
            ? picture.data 
            : Buffer.from(picture.data);
          
          const base64 = dataBuffer.toString('base64');
          console.log('Base64 type:', typeof base64);
          console.log('Base64 first 50 chars:', base64.substring(0, 50));
          
          // Create the data URL
          albumArt = `data:${picture.format};base64,${base64}`;
          console.log('Extracted album artwork:', picture.format, 'size:', picture.data.length);
          console.log('AlbumArt prefix (first 100 chars):', albumArt.substring(0, 100));
          console.log('AlbumArt type:', typeof albumArt, 'length:', albumArt.length);
        }
      } catch (metadataError) {
        console.warn('Failed to extract metadata, using defaults:', metadataError.message);
      }
      
      // Upload to Cloudflare R2
      
      const publicUrl = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.user.user_id
      );
      
      console.log('Music file uploaded successfully to R2:', publicUrl);
      
      // Prepare track data with extracted metadata
      const extension = path.extname(req.file.originalname);
      const filenameWithoutExt = req.file.originalname.replace(extension, '');
      
      // Add to playlist
      const track = {
        title: metadata?.common?.title || filenameWithoutExt,
        artist: metadata?.common?.artist || 'Unknown Artist',
        album: metadata?.common?.album || null,
        duration: metadata?.format?.duration ? Math.round(metadata.format.duration) : 0,
        albumArt: albumArt,
        fileUrl: publicUrl,
        uploadedBy: req.user.user_id
      };
      
      const playlist = await audioService.addMusicToPlaylist(
        sessionId,
        track,
        req.user.user_id
      );
      
      console.log('✅ Track added to playlist. Total tracks:', playlist.length);
      console.log('📋 Playlist:', JSON.stringify(playlist.map(t => ({ 
        title: t.title, 
        artist: t.artist,
        hasAlbumArt: !!t.albumArt,
        albumArtLength: t.albumArt?.length
      }))));
      
      // Debug: Check track.albumArt before sending response
      console.log('🖼️ Response track.albumArt:', {
        hasAlbumArt: !!track.albumArt,
        type: typeof track.albumArt,
        length: track.albumArt?.length,
        prefix: track.albumArt?.substring(0, 100)
      });
      
      res.json({
        success: true,
        fileUrl: publicUrl,
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

/**
 * @route POST /api/audio/sessions/:sessionId/import-track
 * @desc Import track from music platform (Spotify, YouTube, Apple Music)
 * @access Private
 */
router.post('/sessions/:sessionId/import-track',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { track } = req.body;
      
      // Validate session exists
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }
      
      // Validate track data
      if (!track || !track.title || !track.artist) {
        return res.status(400).json({
          success: false,
          message: 'Track title and artist are required'
        });
      }
      
      console.log('Importing track from platform:', { 
        sessionId, 
        title: track.title,
        artist: track.artist,
        source: track.source,
        youtubeId: track.youtubeId,
        hasYoutubeId: !!track.youtubeId
      });
      
      // Determine the playable URL from various possible sources
      const playableUrl = track.url || track.fileUrl || track.previewUrl || track.spotifyPreviewUrl || track.streamUrl || track.youtubeUrl;
      
      // Skip tracks without any playable URL
      if (!playableUrl) {
        console.warn(`⚠️ Skipping track without playable URL: ${track.title} by ${track.artist}`);
        return res.status(400).json({
          success: false,
          message: `Track "${track.title}" has no playable URL - may not have Spotify preview available`
        });
      }
      
      // Create track object for playlist
      const importedTrack = {
        id: track.externalId || `${track.source}-${Date.now()}`,
        title: track.title,
        artist: track.artist,
        album: track.album || 'Unknown Album',
        duration: track.duration || 0,
        albumArt: track.albumArt || null,
        source: track.source, // 'spotify', 'youtube', 'appleMusic'
        externalId: track.externalId,
        url: playableUrl, // Use the determined playable URL
        previewUrl: track.previewUrl || playableUrl,
        spotifyPreviewUrl: track.spotifyPreviewUrl || null,
        streamUrl: track.streamUrl || null,
        youtubeUrl: track.youtubeUrl || null,
        youtubeId: track.youtubeId || null,
        uploadedBy: req.user.user_id,
        importedAt: new Date()
      };
      
      console.log('✅ Created importedTrack:', {
        title: importedTrack.title,
        source: importedTrack.source,
        hasUrl: !!importedTrack.url,
        hasYoutubeId: !!importedTrack.youtubeId,
        youtubeId: importedTrack.youtubeId
      });
      
      // Add to playlist
      const playlist = await audioService.addMusicToPlaylist(
        sessionId,
        importedTrack,
        req.user.user_id
      );
      
      res.json({
        success: true,
        track: importedTrack,
        playlist: playlist
      });
    } catch (error) {
      console.error('Track import error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to import track'
      });
    }
  }
);

module.exports = router;
