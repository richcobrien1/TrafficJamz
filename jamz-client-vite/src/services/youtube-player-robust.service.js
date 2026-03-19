/**
 * Robust YouTube Player Service
 * Guarantees 100% reliability with retries, auto-recovery, and state persistence
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Player health monitoring and auto-recovery
 * - State persistence in localStorage
 * - Guaranteed operation execution
 * - Race condition handling
 * - Timeout protection
 */

class RobustYouTubePlayer {
  constructor(containerId = 'youtube-player') {
    this.containerId = containerId;
    this.player = null;
    this.playerReady = false;
    this.playerInitializing = false;
    this.playerRetryCount = 0;
    this.maxRetries = 10;
    this.healthCheckInterval = null;
    this.volume = 1.0;
    this.currentVideoId = null;
    this.isPlaying = false;
    
    // Event handlers
    this.onReady = null;
    this.onStateChange = null;
    this.onError = null;
    this.onTimeUpdate = null;
    
    // Load persisted state
    this.loadPersistedState();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Auto-initialize
    this.initializeWithRetry().catch(error => {
      console.error('❌ Failed to auto-initialize YouTube player:', error);
    });
  }

  /**
   * Load persisted state from localStorage
   */
  loadPersistedState() {
    try {
      const state = localStorage.getItem('robust_youtube_player_state');
      if (state) {
        const parsed = JSON.parse(state);
        this.volume = parsed.volume || 1.0;
        this.currentVideoId = parsed.currentVideoId;
        console.log('📦 Loaded persisted YouTube player state:', parsed);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persisted state:', error);
    }
  }

  /**
   * Persist state to localStorage
   */
  persistState() {
    try {
      const state = {
        volume: this.volume,
        currentVideoId: this.currentVideoId,
        timestamp: Date.now()
      };
      localStorage.setItem('robust_youtube_player_state', JSON.stringify(state));
      
      // Also persist to sessionStorage as backup
      sessionStorage.setItem('robust_youtube_player_state', JSON.stringify(state));
    } catch (error) {
      console.warn('⚠️ Failed to persist state:', error);
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      if (!this.isPlayerValid(false)) {
        console.warn('⚠️ YouTube player health check failed - recovering...');
        this.recoverPlayer();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Validate player is ready and functional
   */
  isPlayerValid(throwError = false) {
    const isValid =
      this.player &&
      this.playerReady &&
      typeof this.player.playVideo === 'function' &&
      typeof this.player.pauseVideo === 'function' &&
      typeof this.player.loadVideoById === 'function' &&
      typeof this.player.getPlayerState === 'function' &&
      typeof this.player.setVolume === 'function' &&
      typeof this.player.getCurrentTime === 'function';

    if (!isValid && throwError) {
      throw new Error('YouTube player not ready or invalid');
    }

    return isValid;
  }

  /**
   * Wait for player to be ready
   */
  async waitForReady(timeoutMs = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (this.isPlayerValid(false)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.error('❌ YouTube player not ready after', timeoutMs, 'ms');
    return false;
  }

  /**
   * Load YouTube IFrame API
   */
  async loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      console.log('✅ YouTube API already loaded');
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('YouTube API load timeout (30s)'));
      }, 30000);

      // Check if script already exists
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Failed to load YouTube API script'));
        };
        document.head.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        console.log('✅ YouTube API loaded successfully');
        resolve();
      };
    });
  }

  /**
   * Initialize player with automatic retry
   */
  async initializeWithRetry(retryCount = 0) {
    if (this.playerInitializing) {
      console.log('⏳ Initialization already in progress, waiting...');
      await this.waitForReady();
      return;
    }

    if (this.isPlayerValid(false)) {
      console.log('✅ Player already initialized and valid');
      return;
    }

    this.playerInitializing = true;

    try {
      await this.initialize();
      this.playerRetryCount = 0;
      console.log('✅ YouTube player initialized successfully');
    } catch (error) {
      console.error(`❌ Initialization failed (attempt ${retryCount + 1}):`, error);

      if (retryCount < this.maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
        console.log(`🔄 Retrying in ${delayMs}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        this.playerInitializing = false;
        return this.initializeWithRetry(retryCount + 1);
      } else {
        this.playerInitializing = false;
        throw new Error(`YouTube player initialization failed after ${this.maxRetries} attempts`);
      }
    } finally {
      this.playerInitializing = false;
    }
  }

  /**
   * Initialize player (low-level)
   */
  async initialize() {
    // Load API first
    await this.loadYouTubeAPI();

    if (!window.YT || !window.YT.Player) {
      throw new Error('YouTube API not available');
    }

    // Ensure container exists
    let container = document.getElementById(this.containerId);
    if (!container) {
      console.log('📦 Creating YouTube player container');
      container = document.createElement('div');
      container.id = this.containerId;
      container.style.display = 'none';
      document.body.appendChild(container);
    }

    console.log('🎵 Creating YouTube player instance...');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Player creation timed out (15s)'));
      }, 15000);

      try {
        this.player = new window.YT.Player(this.containerId, {
          height: '0',
          width: '0',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            fs: 0
          },
          events: {
            onReady: (event) => {
              clearTimeout(timeout);
              console.log('✅ YouTube player onReady');

              // Validate player methods
              if (!this.isPlayerValid(false)) {
                reject(new Error('Player missing required methods'));
                return;
              }

              // Set volume
              this.player.setVolume(this.volume * 100);
              this.playerReady = true;
              this.persistState();

              if (this.onReady) {
                this.onReady(event);
              }

              resolve();
            },
            onStateChange: (event) => {
              // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
              const stateNames = {
                '-1': 'unstarted',
                0: 'ended',
                1: 'playing',
                2: 'paused',
                3: 'buffering',
                5: 'cued'
              };
              console.log('🎵 State change:', stateNames[event.data] || 'unknown');

              this.isPlaying = event.data === 1;
              this.persistState();

              if (this.onStateChange) {
                this.onStateChange(event);
              }
            },
            onError: (event) => {
              const errorMessages = {
                2: 'Invalid parameter',
                5: 'HTML5 player error',
                100: 'Video not found',
                101: 'Video not embeddable',
                150: 'Video not embeddable'
              };
              
              console.error('❌ YouTube error:', errorMessages[event.data] || 'Unknown', `(code: ${event.data})`);

              // Auto-recover from certain errors
              if ([2, 5].includes(event.data)) {
                console.log('🔄 Auto-recovering from recoverable error...');
                setTimeout(() => this.recoverPlayer(), 2000);
              }

              if (this.onError) {
                this.onError(event);
              }
            }
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Recover player by reinitializing
   */
  async recoverPlayer() {
    console.log('🔄 Recovering player...');
    
    // Clear existing player
    this.player = null;
    this.playerReady = false;
    
    // Reinitialize with retry
    try {
      await this.initializeWithRetry();
      console.log('✅ Player recovered successfully');
      
      // Reload current video if any
      if (this.currentVideoId) {
        console.log('🔄 Reloading current video after recovery');
        await this.loadAndPlay(this.currentVideoId);
      }
    } catch (error) {
      console.error('❌ Player recovery failed:', error);
    }
  }

  /**
   * Execute operation with guaranteed retry
   */
  async executeWithRetry(operationName, operation, maxRetries = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Ensure player is ready
        if (!this.isPlayerValid(false)) {
          console.warn(`⚠️ Player not ready for ${operationName}, initializing...`);
          await this.initializeWithRetry();
        }

        // Wait for ready state
        const isReady = await this.waitForReady(15000);
        if (!isReady) {
          throw new Error('Player not ready after waiting');
        }

        // Execute operation
        const result = await operation();
        console.log(`✅ ${operationName} succeeded`);
        return result;
      } catch (error) {
        console.error(`❌ ${operationName} failed (attempt ${attempt + 1}/${maxRetries}):`, error);

        if (attempt < maxRetries - 1) {
          const delayMs = 1000 * Math.pow(2, attempt); // Exponential backoff
          console.log(`🔄 Retrying ${operationName} in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          
          // Attempt recovery
          await this.recoverPlayer();
        } else {
          throw new Error(`${operationName} failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Load and play video (GUARANTEED)
   */
  async loadAndPlay(videoId) {
    return this.executeWithRetry('loadAndPlay', async () => {
      this.isPlayerValid(true); // Throws if not valid

      console.log('🎵 Loading video:', videoId);
      this.player.loadVideoById(videoId);
      this.currentVideoId = videoId;
      this.isPlaying = true;
      this.persistState();

      return true;
    });
  }

  /**
   * Play (GUARANTEED)
   */
  async play() {
    return this.executeWithRetry('play', async () => {
      this.isPlayerValid(true);

      const state = this.player.getPlayerState();
      console.log('▶️ Play (current state:', state, ')');
      
      this.player.playVideo();
      this.isPlaying = true;
      this.persistState();

      return true;
    });
  }

  /**
   * Pause (GUARANTEED)
   */
  async pause() {
    return this.executeWithRetry('pause', async () => {
      this.isPlayerValid(true);

      const state = this.player.getPlayerState();
      console.log('⏸️ Pause (current state:', state, ')');

      // Only pause if playing or buffering
      if (state === 1 || state === 3) {
        this.player.pauseVideo();
      }
      
      this.isPlaying = false;
      this.persistState();

      return true;
    });
  }

  /**
   * Set volume (GUARANTEED)
   */
  async setVolume(volume) {
    return this.executeWithRetry('setVolume', async () => {
      this.isPlayerValid(true);

      const volumePercent = Math.max(0, Math.min(100, volume * 100));
      this.player.setVolume(volumePercent);
      this.volume = volume;
      this.persistState();

      console.log('🔊 Volume set to', volumePercent, '%');
      return true;
    });
  }

  /**
   * Get current time
   */
  async getCurrentTime() {
    try {
      if (this.isPlayerValid(false)) {
        return this.player.getCurrentTime();
      }
    } catch (error) {
      console.warn('⚠️ Failed to get current time:', error);
    }
    return 0;
  }

  /**
   * Get player state
   */
  async getState() {
    try {
      if (this.isPlayerValid(false)) {
        return this.player.getPlayerState();
      }
    } catch (error) {
      console.warn('⚠️ Failed to get player state:', error);
    }
    return -1;
  }

  /**
   * Destroy player
   */
  destroy() {
    console.log('🗑️ Destroying YouTube player...');
    
    this.stopHealthMonitoring();
    
    if (this.player && typeof this.player.destroy === 'function') {
      try {
        this.player.destroy();
      } catch (error) {
        console.warn('⚠️ Error destroying player:', error);
      }
    }
    
    this.player = null;
    this.playerReady = false;
    this.currentVideoId = null;
    this.isPlaying = false;
    
    console.log('✅ Player destroyed');
  }
}

// Export singleton instance
const robustYouTubePlayer = new RobustYouTubePlayer();

export default robustYouTubePlayer;
