/**
 * Platform Music Streaming Service
 * Handles playback from external music platforms:
 * - Spotify Web Playback SDK
 * - YouTube IFrame Player API
 * - Apple MusicKit JS
 */

import robustYouTubePlayer from './youtube-player-robust.service';

class PlatformMusicService {
  constructor() {
    this.currentPlatform = null; // 'spotify', 'youtube', 'appleMusic', or null for file playback
    this.spotifyPlayer = null;
    this.youtubePlayer = robustYouTubePlayer; // Use robust player with guaranteed reliability
    this.appleMusicPlayer = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.volume = 1.0;
    this.initialized = false; // Track initialization state
    
    // Event callbacks
    this.onTrackChange = null;
    this.onPlayStateChange = null;
    this.onTimeUpdate = null;
    this.onError = null;
    
    // Set up robust YouTube player event handlers
    this.youtubePlayer.onStateChange = (event) => {
      console.log('🎵 YouTube state change:', event.data);
      if (event.data === 1) {
        this.isPlaying = true;
        if (this.onPlayStateChange) this.onPlayStateChange(true);
      } else if (event.data === 2) {
        this.isPlaying = false;
        if (this.onPlayStateChange) this.onPlayStateChange(false);
      } else if (event.data === 0) {
        console.log('🎵 Track ended - calling onTrackChange');
        if (this.onTrackChange) this.onTrackChange('next');
      }
    };
    
    this.youtubePlayer.onError = (event) => {
      console.error('❌ YouTube error:', event.data);
      if (this.onError) this.onError(event);
    };
  }

  /**
   * Initialize platform SDKs
   */
  async initialize() {
    if (this.initialized) {
      console.log('✅ Platform music service already initialized');
      return;
    }
    
    console.log('🎵 Initializing platform music service...');
    
    // Load Spotify SDK
    await this.loadSpotifySDK();
    
    // Robust YouTube player auto-initializes in its constructor
    console.log('✅ Using robust YouTube player (auto-initialized)');
    
    // Apple MusicKit is loaded separately when user connects
    
    this.initialized = true;
    console.log('✅ Platform music service initialized');
  }

  /**
   * Load Spotify Web Playback SDK
   * Enables full Spotify playback for Premium users
   */
  async loadSpotifySDK() {
    console.log('🎵 Loading Spotify Web Playback SDK...');
    
    return new Promise((resolve) => {
      if (window.Spotify) {
        console.log('✅ Spotify SDK already loaded');
        resolve();
        return;
      }

      // Set up SDK ready callback with error handling
      window.onSpotifyWebPlaybackSDKReady = () => {
        console.log('✅ Spotify Web Playback SDK loaded successfully');
        resolve();
      };

      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      
      // Add timeout to resolve anyway if SDK takes too long
      const timeout = setTimeout(() => {
        console.warn('⚠️ Spotify SDK load timeout - continuing without SDK');
        resolve(); // Don't block on SDK timeout
      }, 5000); // 5 second timeout
      
      script.onerror = () => {
        clearTimeout(timeout);
        console.warn('⚠️ Failed to load Spotify SDK - will use preview URLs only');
        resolve(); // Don't block on SDK failure
      };
      
      script.onload = () => {
        clearTimeout(timeout);
        // Script loaded, waiting for SDK ready callback
        console.log('📦 Spotify SDK script loaded, waiting for SDK ready...');
      };
      
      try {
        document.body.appendChild(script);
      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Error appending Spotify SDK script:', error);
        resolve(); // Continue anyway
      }
    });
  }

  /**
   * Initialize Spotify player with access token
   * Creates Web Playback SDK player for Premium users
   */
  async initializeSpotifyPlayer(accessToken) {
    if (!window.Spotify) {
      console.warn('⚠️ Spotify SDK not loaded - cannot initialize player');
      return;
    }

    if (this.spotifyPlayer) {
      console.log('✅ Spotify player already initialized');
      return;
    }

    console.log('🎵 Initializing Spotify Web Playback player...');

    const player = new window.Spotify.Player({
      name: 'TrafficJamz Player',
      getOAuthToken: cb => { cb(accessToken); },
      volume: this.volume
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => {
      console.error('❌ Spotify init error:', message);
      if (this.onError) this.onError('spotify', message);
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('❌ Spotify auth error:', message);
      if (this.onError) this.onError('spotify', message);
    });

    player.addListener('account_error', ({ message }) => {
      console.error('❌ Spotify account error:', message);
      console.log('💡 Note: Spotify Premium required for full playback. Falling back to preview URLs.');
      if (this.onError) this.onError('spotify', 'Spotify Premium required - using preview URLs');
    });

    player.addListener('playback_error', ({ message }) => {
      console.error('❌ Spotify playback error:', message);
      if (this.onError) this.onError('spotify', message);
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
      console.log('✅ Spotify Web Playback player ready! Device ID:', device_id);
      this.spotifyDeviceId = device_id;
    });

    // State updates
    player.addListener('player_state_changed', (state) => {
      if (!state) return;

      this.isPlaying = !state.paused;
      if (this.onPlayStateChange) {
        this.onPlayStateChange(this.isPlaying);
      }

      if (this.onTimeUpdate) {
        this.onTimeUpdate(state.position / 1000); // Convert ms to seconds
      }

      // Track ended
      if (state.track_window.current_track && 
          state.position === 0 && 
          state.paused) {
        console.log('🎵 Spotify track ended');
        if (this.onTrackChange) {
          this.onTrackChange('next');
        }
      }
    });

    await player.connect();
    this.spotifyPlayer = player;
    console.log('✅ Spotify Web Playback player connected');
  }

  /**
   * Load YouTube IFrame Player API
   */
  async loadYouTubeSDK() {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        console.log('✅ YouTube SDK already loaded');
        resolve();
        return;
      }

      console.log('⏳ Waiting for YouTube SDK to load...');

      // Set up callback for when SDK loads
      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        console.log('✅ YouTube SDK loaded via callback');
        if (originalCallback) originalCallback();
        resolve();
      };

      // Check if script already exists (from index.html)
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (existingScript) {
        console.log('✅ YouTube SDK script already in DOM, waiting for onYouTubeIframeAPIReady callback...');
        // Script exists, callback is set up above - now wait for it to fire
        // Don't return here - let the promise wait for the callback!
      } else {
        // If no script exists, create one (fallback)
        console.log('⚠️ YouTube SDK not found, loading it now...');
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.body.appendChild(script);
      }
    });
  }

  /**
   * Load persisted player state from localStorage
   */
  loadPersistedState() {
    try {
      const state = localStorage.getItem('youtube_player_state');
      if (state) {
        const parsed = JSON.parse(state);
        console.log('📦 Loaded persisted YouTube player state:', parsed);
        this.volume = parsed.volume || 1.0;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persisted state:', error);
    }
  }

  /**
   * Persist player state to localStorage
   */
  persistState() {
    try {
      const state = {
        volume: this.volume,
        platform: this.currentPlatform,
        timestamp: Date.now()
      };
      localStorage.setItem('youtube_player_state', JSON.stringify(state));
    } catch (error) {
      console.warn('⚠️ Failed to persist state:', error);
    }
  }

  /**
   * Start health monitoring for YouTube player
   */
  startHealthMonitoring() {
    // Check player health every 5 seconds
    this.youtubePlayerHealthCheckInterval = setInterval(() => {
      if (this.currentPlatform === 'youtube' && !this.validateYouTubePlayer(false)) {
        console.warn('⚠️ YouTube player health check failed - attempting recovery...');
        this.recoverYouTubePlayer();
      }
    }, 5000);
  }

  /**
   * Validate YouTube player is ready and has all required methods
   */
  validateYouTubePlayer(throwError = true) {
    // Use robust player's built-in validation
    return this.youtubePlayer.isPlayerValid(throwError);
  }

  /**
   * Wait for YouTube player to be ready with timeout and retries
   */
  async waitForYouTubePlayerReady(maxWaitMs = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      if (this.validateYouTubePlayer(false)) {
        console.log('✅ YouTube player is ready');
        return true;
      }
      
      // Not ready yet - wait 100ms and try again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.error('❌ YouTube player failed to become ready within', maxWaitMs, 'ms');
    return false;
  }

  /**
   * Recover YouTube player by reinitializing
   */
  async recoverYouTubePlayer() {
    console.log('🔄 Recovering YouTube player...');
    
    // Clear existing player
    this.youtubePlayer = null;
    this.youtubePlayerReady = false;
    
    // Re-initialize with retry
    try {
      await this.initializeYouTubePlayerWithRetry('youtube-player');
      console.log('✅ YouTube player recovered successfully');
    } catch (error) {
      console.error('❌ Failed to recover YouTube player:', error);
    }
  }

  /**
   * Initialize YouTube player with automatic retry logic
   */
  async initializeYouTubePlayerWithRetry(containerId, retryCount = 0) {
    if (this.youtubePlayerInitializing) {
      console.log('⏳ YouTube player initialization already in progress, waiting...');
      // Wait for existing initialization to complete
      await this.waitForYouTubePlayerReady();
      return;
    }

    if (this.youtubePlayerReady && this.validateYouTubePlayer(false)) {
      console.log('✅ YouTube player already initialized and ready');
      return;
    }

    this.youtubePlayerInitializing = true;
    
    try {
      await this.initializeYouTubePlayer(containerId);
      this.youtubePlayerRetryCount = 0; // Reset retry count on success
      console.log('✅ YouTube player initialized successfully');
    } catch (error) {
      console.error(`❌ YouTube player initialization failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < this.youtubePlayerMaxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
        console.log(`🔄 Retrying in ${delayMs}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        this.youtubePlayerInitializing = false;
        return this.initializeYouTubePlayerWithRetry(containerId, retryCount + 1);
      } else {
        this.youtubePlayerInitializing = false;
        throw new Error(`YouTube player initialization failed after ${this.youtubePlayerMaxRetries} attempts`);
      }
    } finally {
      this.youtubePlayerInitializing = false;
    }
  }

  /**
   * Initialize YouTube player (low-level implementation)
   */
  async initializeYouTubePlayer(containerId) {
    // Make sure YT API is loaded
    if (!window.YT || !window.YT.Player) {
      console.error('❌ YouTube API not loaded yet');
      // Try to load it
      await this.loadYouTubeAPI();
      
      if (!window.YT || !window.YT.Player) {
        throw new Error('YouTube API failed to load');
      }
    }

    console.log('🎵 Creating YouTube player...');

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('YouTube player creation timed out after 15 seconds'));
      }, 15000);

      try {
        this.youtubePlayer = new window.YT.Player(containerId, {
        height: '0',
        width: '0',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1
        },
        events: {
          onReady: () => {
            clearTimeout(timeoutId);
            console.log('✅ YouTube player onReady event fired');
            
            // Validate player has all required methods
            if (!this.validateYouTubePlayer(false)) {
              console.error('❌ YouTube player missing required methods after onReady');
              reject(new Error('YouTube player incomplete'));
              return;
            }
            
            this.youtubePlayer.setVolume(this.volume * 100);
            this.youtubePlayerReady = true;
            this.persistState();
            console.log('✅ YouTube player fully initialized and validated');
            resolve();
          },
          onStateChange: (event) => {
            // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
            console.log('🎵 YouTube onStateChange:', event.data, {
              '-1': 'unstarted',
              0: 'ended',
              1: 'playing',
              2: 'paused',
              3: 'buffering',
              5: 'cued'
            }[event.data] || 'unknown');
            
            if (event.data === 1) {
              this.isPlaying = true;
              if (this.onPlayStateChange) this.onPlayStateChange(true);
            } else if (event.data === 2) {
              this.isPlaying = false;
              if (this.onPlayStateChange) this.onPlayStateChange(false);
            } else if (event.data === 0) {
              console.log('🎵 ========================================');
              console.log('🎵 YOUTUBE TRACK ENDED (state = 0)');
              console.log('🎵 Has onTrackChange callback:', !!this.onTrackChange);
              console.log('🎵 Current track:', this.currentTrack?.title);
              console.log('🎵 ========================================');
              if (this.onTrackChange) {
                console.log('🎵 Calling onTrackChange("next")...');
                this.onTrackChange('next');
              } else {
                console.error('🎵 ❌ onTrackChange callback is NULL - cannot auto-advance!');
              }
            }
          },
          onError: (event) => {
            console.error('❌ YouTube player error:', event.data, {
              2: 'Invalid parameter',
              5: 'HTML5 player error',
              100: 'Video not found',
              101: 'Video not allowed in embedded players',
              150: 'Video not allowed in embedded players'
            }[event.data] || 'Unknown error');
            
            // Auto-recover from certain errors
            if ([2, 5].includes(event.data)) {
              console.log('🔄 Attempting auto-recovery from recoverable error...');
              setTimeout(() => this.recoverYouTubePlayer(), 2000);
            }
            
            if (this.onError) this.onError('youtube', `Error code: ${event.data}`);
          }
        }
      });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Failed to create YouTube player:', error);
        reject(error);
      }

      // Time update polling for YouTube
      this.youtubeTimeUpdateInterval = setInterval(() => {
        if (this.youtubePlayer && this.youtubePlayer.getCurrentTime && this.isPlaying) {
          const currentTime = this.youtubePlayer.getCurrentTime();
          if (this.onTimeUpdate && currentTime) {
            this.onTimeUpdate(currentTime);
          }
        }
      }, 100);
    });
  }

  /**
   * Initialize Apple Music player
   */
  async initializeAppleMusicPlayer() {
    if (!window.MusicKit) {
      throw new Error('Apple MusicKit not loaded');
    }

    if (this.appleMusicPlayer) {
      return;
    }

    this.appleMusicPlayer = window.MusicKit.getInstance();
    
    // Event listeners
    this.appleMusicPlayer.addEventListener('playbackStateDidChange', () => {
      const isPlaying = this.appleMusicPlayer.isPlaying;
      this.isPlaying = isPlaying;
      if (this.onPlayStateChange) {
        this.onPlayStateChange(isPlaying);
      }
    });

    this.appleMusicPlayer.addEventListener('playbackTimeDidChange', () => {
      const currentTime = this.appleMusicPlayer.currentPlaybackTime;
      if (this.onTimeUpdate) {
        this.onTimeUpdate(currentTime);
      }
    });

    this.appleMusicPlayer.addEventListener('mediaItemDidChange', () => {
      console.log('🎵 Apple Music track changed');
    });

    this.appleMusicPlayer.addEventListener('queueItemsDidChange', () => {
      // Track ended if queue is empty
      if (this.appleMusicPlayer.queue.length === 0) {
        console.log('🎵 Apple Music queue ended');
        if (this.onTrackChange) {
          this.onTrackChange('next');
        }
      }
    });

    console.log('✅ Apple Music player ready');
  }

  /**
   * Play a track from any platform
   * @param {Object} track - Track with source, externalId, streamUrl
   */
  async playTrack(track) {
    console.log('🎵 Playing track:', track.title, 'from', track.source);
    
    this.currentTrack = track;
    this.currentPlatform = track.source;

    try {
      switch (track.source) {
        case 'spotify':
          await this.playSpotifyTrack(track);
          break;
        case 'youtube':
          await this.playYouTubeTrack(track);
          break;
        case 'appleMusic':
          await this.playAppleMusicTrack(track);
          break;
        default:
          throw new Error(`Unsupported platform: ${track.source}`);
      }
    } catch (error) {
      console.error('❌ Playback error:', error);
      if (this.onError) {
        this.onError(track.source, error.message);
      }
      throw error;
    }
  }

  /**
   * Play Spotify track
   */
  async playSpotifyTrack(track) {
    if (!this.spotifyPlayer) {
      throw new Error('Spotify player not initialized');
    }

    // Use Spotify Web API to play track on this device
    const spotifyUri = `spotify:track:${track.externalId}`;
    
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.spotifyDeviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [spotifyUri]
      })
    });

    this.isPlaying = true;
  }

  /**
   * Load YouTube API dynamically if not present
   */
  async loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('YouTube API load timeout'));
      }, 30000);

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        console.log('✅ YouTube API loaded');
        resolve();
      };
    });
  }

  /**
   * Execute YouTube player operation with retry and validation
   */
  async executeYouTubeOperation(operationName, operation, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Ensure player is ready
        if (!this.validateYouTubePlayer(false)) {
          console.warn(`⚠️ YouTube player not ready for ${operationName}, initializing...`);
          await this.initializeYouTubePlayerWithRetry('youtube-player');
        }

        // Wait for player to be ready
        const isReady = await this.waitForYouTubePlayerReady(10000);
        if (!isReady) {
          throw new Error('YouTube player not ready after waiting');
        }

        // Execute the operation
        const result = await operation();
        console.log(`✅ ${operationName} succeeded`);
        return result;
      } catch (error) {
        console.error(`❌ ${operationName} failed (attempt ${attempt + 1}/${maxRetries}):`, error);
        
        if (attempt < maxRetries - 1) {
          const delayMs = 1000 * Math.pow(2, attempt);
          console.log(`🔄 Retrying ${operationName} in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          
          // Try to recover player
          await this.recoverYouTubePlayer();
        } else {
          throw new Error(`${operationName} failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Play YouTube track with guaranteed execution
   */
  async playYouTubeTrack(track) {
    // Use robust player's guaranteed loadAndPlay method
    const videoId = track.youtubeId || track.externalId;
    
    if (!videoId) {
      throw new Error('Track has no YouTube video ID');
    }
    
    console.log('🎵 Loading YouTube video:', videoId, 'for track:', track.title);
    
    // Robust player handles all retries and recovery automatically
    await this.youtubePlayer.loadAndPlay(videoId);
    
    this.isPlaying = true;
    this.currentTrack = track;
    this.currentPlatform = 'youtube';
    this.persistState();
    
    console.log('✅ YouTube video playing with guaranteed reliability');
    return true;
  }

  /**
   * Play Apple Music track
   */
  async playAppleMusicTrack(track) {
    if (!this.appleMusicPlayer) {
      throw new Error('Apple Music player not initialized');
    }

    // Play track by ID
    await this.appleMusicPlayer.setQueue({
      song: track.externalId
    });
    
    await this.appleMusicPlayer.play();
    this.isPlaying = true;
  }

  /**
   * Pause playback with guaranteed execution
   */
  async pause() {
    console.log('⏸️ Pausing playback');

    switch (this.currentPlatform) {
      case 'spotify':
        if (this.spotifyPlayer) {
          await this.spotifyPlayer.pause();
        }
        break;
      case 'youtube':
        // Robust player handles all state validation and retries
        await this.youtubePlayer.pause();
        break;
      case 'appleMusic':
        if (this.appleMusicPlayer) {
          await this.appleMusicPlayer.pause();
        }
        break;
    }

    this.isPlaying = false;
    this.persistState();
  }

  /**
   * Resume playback with guaranteed execution
   */
  async play() {
    console.log('▶️ Resuming playback', {
      platform: this.currentPlatform,
      hasPlayer: !!this.youtubePlayer,
      playerState: this.youtubePlayer?.getPlayerState?.(),
      currentTrack: this.currentTrack?.title
    });

    switch (this.currentPlatform) {
      case 'spotify':
        if (this.spotifyPlayer) {
          await this.spotifyPlayer.resume();
        }
        break;
      case 'youtube':
        // Robust player handles all retries and recovery
        await this.youtubePlayer.play();
        break;
      case 'appleMusic':
        if (this.appleMusicPlayer) {
          await this.appleMusicPlayer.play();
        }
        break;
    }

    this.isPlaying = true;
    this.persistState();
    console.log('✅ play() completed, isPlaying set to true');
  }

  /**
   * Seek to position
   */
  async seekTo(position) {
    console.log('⏩ Seeking to:', position);

    switch (this.currentPlatform) {
      case 'spotify':
        if (this.spotifyPlayer) {
          await this.spotifyPlayer.seek(position * 1000); // Convert to ms
        }
        break;
      case 'youtube':
        if (this.youtubePlayer) {
          this.youtubePlayer.seekTo(position, true);
        }
        break;
      case 'appleMusic':
        if (this.appleMusicPlayer) {
          this.appleMusicPlayer.seekToTime(position);
        }
        break;
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    console.log('🔊 Setting volume:', this.volume, 'Platform:', this.currentPlatform);

    switch (this.currentPlatform) {
      case 'spotify':
        if (this.spotifyPlayer) {
          this.spotifyPlayer.setVolume(this.volume);
          console.log('🔊 Spotify volume set to:', this.volume);
        } else {
          console.warn('⚠️ Spotify player not available');
        }
        break;
      case 'youtube':
        if (this.youtubePlayer) {
          // Use mute/unmute methods in addition to volume for better iOS support
          if (this.volume === 0) {
            console.log('🔇 Muting YouTube player');
            this.youtubePlayer.mute();
          } else {
            console.log('🔊 Unmuting YouTube player and setting volume to:', this.volume * 100);
            this.youtubePlayer.unMute();
            this.youtubePlayer.setVolume(this.volume * 100);
          }
        } else {
          console.warn('⚠️ YouTube player not available');
        }
        break;
      case 'appleMusic':
        if (this.appleMusicPlayer) {
          this.appleMusicPlayer.volume = this.volume;
          console.log('🔊 Apple Music volume set to:', this.volume);
        } else {
          console.warn('⚠️ Apple Music player not available');
        }
        break;
      default:
        console.warn('⚠️ No platform selected, volume:', this.volume);
    }
  }

  /**
   * Get current playback time
   */
  getCurrentTime() {
    switch (this.currentPlatform) {
      case 'spotify':
        return this.spotifyPlayer ? this.spotifyPlayer.getCurrentState().then(state => state?.position / 1000 || 0) : 0;
      case 'youtube':
        return this.youtubePlayer ? this.youtubePlayer.getCurrentTime() : 0;
      case 'appleMusic':
        return this.appleMusicPlayer ? this.appleMusicPlayer.currentPlaybackTime : 0;
      default:
        return 0;
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.spotifyPlayer) {
      this.spotifyPlayer.disconnect();
      this.spotifyPlayer = null;
    }

    if (this.youtubePlayer) {
      this.youtubePlayer.destroy();
      this.youtubePlayer = null;
    }

    if (this.youtubeTimeUpdateInterval) {
      clearInterval(this.youtubeTimeUpdateInterval);
    }

    this.appleMusicPlayer = null;
    this.currentPlatform = null;
  }
}

// Singleton instance
const platformMusicService = new PlatformMusicService();
export default platformMusicService;
