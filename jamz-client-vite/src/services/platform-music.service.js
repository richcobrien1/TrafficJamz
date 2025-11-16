/**
 * Platform Music Streaming Service
 * Handles playback from external music platforms:
 * - Spotify Web Playback SDK
 * - YouTube IFrame Player API
 * - Apple MusicKit JS
 */

class PlatformMusicService {
  constructor() {
    this.currentPlatform = null; // 'spotify', 'youtube', 'appleMusic', or null for file playback
    this.spotifyPlayer = null;
    this.youtubePlayer = null;
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
    
    // Load YouTube SDK and initialize player
    await this.loadYouTubeSDK();
    await this.initializeYouTubePlayer('youtube-player');
    
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
        resolve();
        return;
      }

      window.onYouTubeIframeAPIReady = () => {
        console.log('✅ YouTube SDK loaded');
        resolve();
      };

      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    });
  }

  /**
   * Initialize YouTube player
   */
  async initializeYouTubePlayer(containerId) {
    if (this.youtubePlayer) {
      console.log('✅ YouTube player already initialized');
      return;
    }

    // Make sure YT API is loaded
    if (!window.YT || !window.YT.Player) {
      console.error('❌ YouTube API not loaded yet');
      throw new Error('YouTube API not loaded');
    }

    console.log('🎵 Creating YouTube player...');

    return new Promise((resolve) => {
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
            console.log('✅ YouTube player ready');
            this.youtubePlayer.setVolume(this.volume * 100);
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
            console.error('YouTube player error:', event.data);
            if (this.onError) this.onError('youtube', `Error code: ${event.data}`);
          }
        }
      });

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
   * Play YouTube track
   */
  async playYouTubeTrack(track) {
    if (!this.youtubePlayer) {
      throw new Error('YouTube player not initialized');
    }

    // Use youtubeId if available, fallback to externalId
    const videoId = track.youtubeId || track.externalId;
    
    if (!videoId) {
      throw new Error('Track has no YouTube video ID');
    }
    
    console.log('🎵 Loading YouTube video:', videoId, 'for track:', track.title);

    // Load and play video by ID
    this.youtubePlayer.loadVideoById(videoId);
    this.isPlaying = true;
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
   * Pause playback
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
        if (this.youtubePlayer) {
          this.youtubePlayer.pauseVideo();
        }
        break;
      case 'appleMusic':
        if (this.appleMusicPlayer) {
          await this.appleMusicPlayer.pause();
        }
        break;
    }

    this.isPlaying = false;
  }

  /**
   * Resume playback
   */
  async play() {
    console.log('▶️ Resuming playback');

    switch (this.currentPlatform) {
      case 'spotify':
        if (this.spotifyPlayer) {
          await this.spotifyPlayer.resume();
        }
        break;
      case 'youtube':
        if (this.youtubePlayer) {
          this.youtubePlayer.playVideo();
        }
        break;
      case 'appleMusic':
        if (this.appleMusicPlayer) {
          await this.appleMusicPlayer.play();
        }
        break;
    }

    this.isPlaying = true;
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
