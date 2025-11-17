// Music service for synchronized playback across group members
import platformMusicService from './platform-music.service';
import musicCacheService from './music-cache.service';

class MusicService {
  constructor() {
    this.audioElement = null;
    this.currentTrack = null;
    this.playlist = [];
    this.isPlaying = false;
    this.volume = 1.0;
    this.isController = false; // Is this user controlling playback?
    this.onTrackChange = null;
    this.onPlayStateChange = null;
    this.onTimeUpdate = null;
    this.syncThreshold = 2.0; // seconds - sync if off by more than this
    this.platformMode = false; // Are we using platform streaming?
    this.lastPreviousClick = 0; // Track previous button clicks for double-tap detection
    this.previousClickThreshold = 2000; // ms - time window for double-click to previous track
  }

  /**
   * Initialize audio element
   */
  initialize() {
    if (this.audioElement) return;

    this.audioElement = new Audio();
    this.audioElement.volume = this.volume;
    
    // CRITICAL iOS FIX: Set attributes for ALL iOS browsers (Safari, Chrome, Firefox, etc.)
    // All iOS browsers use WebKit under the hood and have the same restrictions
    this.audioElement.setAttribute('playsinline', 'true');
    this.audioElement.setAttribute('webkit-playsinline', 'true');
    this.audioElement.playsInline = true;
    
    // iOS requires preload to be set for better compatibility
    this.audioElement.preload = 'auto';
    
    // CRITICAL: Prevent audio from stopping when tab loses focus
    // Keep audio context active in background
    this.audioElement.preservesPitch = true;
    
    // Detect iOS (any browser) for additional logging
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIOS) {
      console.log('🍎 iOS device detected - music service configured for iOS (all browsers)');
    }
    
    // Prevent page visibility from pausing audio
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying && this.audioElement) {
        console.log('🎵 Tab hidden - keeping audio playing');
        // Audio element should continue playing in background
      }
    });
    
    // Set up event listeners
    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      if (this.onPlayStateChange) {
        this.onPlayStateChange(true);
      }
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      if (this.onPlayStateChange) {
        this.onPlayStateChange(false);
      }
    });

    this.audioElement.addEventListener('ended', async () => {
      console.log('🎵 ========================================');
      console.log('🎵 TRACK ENDED EVENT FIRED');
      console.log('🎵 ========================================');
      console.log('🎵 Current track:', this.currentTrack?.title, 'ID:', this.currentTrack?.id);
      console.log('🎵 Playlist length:', this.playlist.length);
      console.log('🎵 Playlist tracks:', this.playlist.map(t => `${t.title} (${t.id})`));
      console.log('🎵 Calling playNext()...');
      
      try {
        await this.playNext();
        console.log('🎵 ✅ Auto-advanced to next track successfully');
        
        // Trigger callback so hook can broadcast if controller
        if (this.onTrackChange) {
          this.onTrackChange(this.currentTrack);
        }
      } catch (error) {
        console.error('🎵 ❌ Failed to auto-advance to next track:', error);
      }
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.audioElement.currentTime);
      }
    });

    this.audioElement.addEventListener('error', (e) => {
      console.error('❌ Audio playback error:', e);
      console.error('❌ Error code:', this.audioElement.error?.code);
      console.error('❌ Error message:', this.audioElement.error?.message);
    });
    
    // Additional event for debugging iOS issues
    this.audioElement.addEventListener('loadedmetadata', () => {
      console.log('🎵 Audio metadata loaded - duration:', this.audioElement.duration);
    });
    
    this.audioElement.addEventListener('canplay', () => {
      console.log('🎵 Audio can play - ready state:', this.audioElement.readyState);
    });

    console.log('✅ Music service initialized', isIOS ? '(iOS mode)' : '');
  }

  /**
   * Load a track
   * @param {Object} track - Track object with url, title, artist, etc.
   */
  async loadTrack(track) {
    // Ensure track has id field (normalize _id to id)
    if (!track.id && track._id) {
      track.id = track._id;
    }
    
    console.log('🎵 [loadTrack] FULL Track object:', track);
    console.log('🎵 [loadTrack] Track ID:', track.id);
    this.currentTrack = track;
    
    console.log('🎵 [loadTrack] Track object:', {
      source: track.source,
      title: track.title,
      id: track.id,
      previewUrl: track.previewUrl,
      spotifyPreviewUrl: track.spotifyPreviewUrl,
      url: track.url,
      fileUrl: track.fileUrl,
      hasAlbumArt: !!track.albumArt,
      albumArtLength: track.albumArt?.length,
      hasPreviewUrl: !!(track.previewUrl || track.spotifyPreviewUrl || track.fileUrl)
    });
    
    // Check if this is a Spotify preview URL - treat as regular audio file
    // Check if this is a Spotify track
    if (track.source === 'spotify') {
      // Try to get Spotify access token for Premium playback
      const spotifyAccessToken = localStorage.getItem('spotify_access_token');
      const spotifyTokenExpiry = localStorage.getItem('spotify_token_expiry');
      const hasValidToken = spotifyAccessToken && Date.now() < parseInt(spotifyTokenExpiry);
      
      // If user has valid Spotify token, try Premium playback via Web Playback SDK
      if (hasValidToken && track.spotifyId) {
        console.log('🎵 Loading Spotify track with Premium:', track.title);
        this.platformMode = true;
        
        // Initialize platform service if needed
        if (!platformMusicService.spotifyPlayer) {
          await platformMusicService.initialize();
          await platformMusicService.initializeSpotifyPlayer(spotifyAccessToken);
        }
        
        // Set up event callbacks
        platformMusicService.onPlayStateChange = (playing) => {
          this.isPlaying = playing;
          if (this.onPlayStateChange) {
            this.onPlayStateChange(playing);
          }
        };
        
        platformMusicService.onTimeUpdate = (time) => {
          if (this.onTimeUpdate) {
            this.onTimeUpdate(time);
          }
        };
        
        platformMusicService.onTrackChange = (direction) => {
          if (direction === 'next') {
            this.playNext();
          }
        };
        
        platformMusicService.onError = (platform, error) => {
          console.error(`❌ ${platform} error:`, error);
          // If Premium fails, fall back to preview URL with caching
          if (track.spotifyPreviewUrl) {
            console.log('⚠️ Falling back to Spotify preview URL');
            this.platformMode = false;
            if (!this.audioElement) {
              this.initialize();
            }
            
            // Try to use cache for fallback preview
            musicCacheService.getTrack(
              track.id || track._id,
              track.spotifyPreviewUrl,
              {
                title: track.title,
                artist: track.artist,
                album: track.album,
                source: 'spotify-preview-fallback'
              }
            ).then(blob => {
              const blobUrl = URL.createObjectURL(blob);
              if (this.audioElement.src && this.audioElement.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.audioElement.src);
              }
              this.audioElement.src = blobUrl;
            }).catch(() => {
              // Final fallback: direct URL
              this.audioElement.src = track.spotifyPreviewUrl;
            });
            
            if (this.onTrackChange) {
              this.onTrackChange(track);
            }
          }
        };
        
        if (this.onTrackChange) {
          this.onTrackChange(track);
        }
        
        console.log('✅ Spotify Premium track loaded:', track.title);
        return;
      }
      
      // No Premium or no token - use preview URL with caching
      const spotifyPreviewUrl = track.spotifyPreviewUrl || track.previewUrl || track.fileUrl || track.url;
      if (spotifyPreviewUrl) {
        console.log('🎵 Loading Spotify preview (no Premium):', track.title);
        this.platformMode = false;
        
        if (!this.audioElement) {
          this.initialize();
        }
        
        try {
          // Get track from cache or fetch and cache it
          const blob = await musicCacheService.getTrack(
            track.id || track._id, 
            spotifyPreviewUrl,
            {
              title: track.title,
              artist: track.artist,
              album: track.album,
              duration: track.duration,
              source: 'spotify-preview'
            }
          );
          
          // Create object URL from blob
          const blobUrl = URL.createObjectURL(blob);
          
          // Revoke previous blob URL
          if (this.audioElement.src && this.audioElement.src.startsWith('blob:')) {
            URL.revokeObjectURL(this.audioElement.src);
          }
          
          this.audioElement.src = blobUrl;
          console.log('✅ Spotify preview loaded from cache/network:', track.title);
        } catch (error) {
          console.error('❌ Failed to load Spotify preview with caching, using direct URL:', error);
          this.audioElement.src = spotifyPreviewUrl;
        }
        
        // Update Media Session for background playback
        this.updateMediaSession(track);
        
        if (this.onTrackChange) {
          this.onTrackChange(track);
        }
        
        return;
      }
    }
    
    // Check if this is a YouTube track
    if (track.source === 'youtube' && track.youtubeId) {
      console.log('🎵 Loading YouTube track:', track.title);
      this.platformMode = true;
      
      // Initialize platform service if needed
      if (!platformMusicService.youtubePlayer) {
        await platformMusicService.initialize();
      }
      
      // Set up event callbacks
      platformMusicService.onPlayStateChange = (playing) => {
        this.isPlaying = playing;
        if (this.onPlayStateChange) {
          this.onPlayStateChange(playing);
        }
      };
      
      platformMusicService.onTimeUpdate = (time) => {
        if (this.onTimeUpdate) {
          this.onTimeUpdate(time);
        }
      };
      
      platformMusicService.onTrackChange = async (direction) => {
        console.log('🔄 [YouTube] onTrackChange callback fired, direction:', direction);
        if (direction === 'next') {
          console.log('⏭️ [YouTube] Track ended, calling playNext()...');
          await this.playNext();
          console.log('✅ [YouTube] playNext() completed');
          
          // Notify context that track changed
          if (this.onTrackChange) {
            console.log('📢 [YouTube] Notifying context of track change');
            this.onTrackChange(this.currentTrack);
          }
        }
      };
      
      platformMusicService.onError = (platform, error) => {
        console.error(`❌ ${platform} error:`, error);
      };
      
    } else {
      // File-based track - use HTML5 Audio with caching
      console.log('🎵 Loading file track:', track.title);
      this.platformMode = false;
      
      if (!this.audioElement) {
        this.initialize();
      }
      
      // Handle both 'url' and 'fileUrl' properties
      const trackUrl = track.url || track.fileUrl;
      
      if (!trackUrl) {
        console.error('❌ Track has no URL:', track);
        throw new Error('Track has no valid URL');
      }

      try {
        // Get track from cache or fetch and cache it
        const blob = await musicCacheService.getTrack(
          track.id || track._id, 
          trackUrl,
          {
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration
          }
        );
        
        // Create object URL from blob for audio element
        const blobUrl = URL.createObjectURL(blob);
        
        // Revoke previous blob URL to prevent memory leaks
        if (this.audioElement.src && this.audioElement.src.startsWith('blob:')) {
          URL.revokeObjectURL(this.audioElement.src);
        }
        
        this.audioElement.src = blobUrl;
        console.log('✅ Track loaded from cache/network:', track.title);
      } catch (error) {
        console.error('❌ Failed to load track with caching, using direct URL:', error);
        // Fallback to direct URL if caching fails
        this.audioElement.src = trackUrl;
      }
    }
    
    if (this.onTrackChange) {
      this.onTrackChange(track);
    }

    console.log('✅ Track loaded:', track.title);
  }

  /**
   * Play current track
   * @param {number} position - Optional start position in seconds
   */
  async play(position = null) {
    if (!this.currentTrack) {
      console.warn('⚠️ [music.service] No track loaded');
      return;
    }
    
    console.log('🎵 [music.service] play() called:', {
      track: this.currentTrack.title,
      position,
      platformMode: this.platformMode,
      hasAudioElement: !!this.audioElement,
      audioSrc: this.audioElement?.src
    });

    try {
      if (this.platformMode) {
        // Platform streaming
        console.log('🎵 [music.service] Using platform mode (Spotify/YouTube)');
        
        // Determine the external ID based on source
        const currentExternalId = this.currentTrack.source === 'youtube' 
          ? this.currentTrack.youtubeId 
          : this.currentTrack.externalId || this.currentTrack.spotifyId || this.currentTrack.id;
          
        const platformCurrentId = platformMusicService.currentTrack?.source === 'youtube'
          ? platformMusicService.currentTrack?.youtubeId
          : platformMusicService.currentTrack?.externalId || platformMusicService.currentTrack?.spotifyId || platformMusicService.currentTrack?.id;
        
        console.log('🎵 [music.service] Track comparison:', {
          currentSource: this.currentTrack.source,
          currentId: currentExternalId,
          platformSource: platformMusicService.currentTrack?.source,
          platformId: platformCurrentId,
          isNewTrack: platformCurrentId !== currentExternalId
        });
        
        if (position !== null) {
          await platformMusicService.seekTo(position);
        }
        
        if (platformCurrentId !== currentExternalId) {
          // New track - load and play
          console.log('🎵 [music.service] Loading new track:', this.currentTrack.title);
          await platformMusicService.playTrack(this.currentTrack);
        } else {
          // Resume existing track
          console.log('▶️ Resuming playback');
          await platformMusicService.play();
        }
        
      } else {
        // File-based playback
        if (!this.audioElement) {
          console.error('❌ [music.service] Audio element not initialized');
          return;
        }
        
        if (!this.audioElement.src) {
          console.error('❌ [music.service] Audio element has no src');
          return;
        }
        
        console.log('🎵 [music.service] Playing audio file:', this.audioElement.src);

        if (position !== null) {
          this.audioElement.currentTime = position;
        }

        // iOS (ALL browsers) requires resuming AudioContext before playing
        // This applies to Safari, Chrome, Firefox, etc. on iOS
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        if (isIOS && typeof window.AudioContext !== 'undefined') {
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') {
              console.log('🍎 iOS AudioContext suspended, resuming...');
              await audioCtx.resume();
              console.log('🍎 iOS AudioContext resumed:', audioCtx.state);
            }
            audioCtx.close(); // Clean up
          } catch (err) {
            console.warn('⚠️ Failed to resume AudioContext:', err);
          }
        }
        
        await this.audioElement.play();
        console.log('✅ [music.service] Playing:', this.currentTrack.title, isIOS ? '(iOS)' : '');
      }
    } catch (error) {
      console.error('❌ [music.service] Playback failed:', error.name, error.message);
      
      // iOS-specific error handling (applies to ALL browsers on iOS)
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIOS && error.name === 'NotAllowedError') {
        console.error('🍎 iOS requires user interaction to play audio. User must tap play button.');
      }
      
      throw error; // Re-throw so caller knows it failed
    }
  }

  /**
   * Pause playback
   */
  async pause() {
    if (this.platformMode) {
      await platformMusicService.pause();
    } else {
      if (!this.audioElement) return;
      this.audioElement.pause();
    }
    console.log('⏸️ Paused');
  }

  /**
   * Seek to position
   * @param {number} position - Position in seconds
   */
  async seek(position) {
    if (this.platformMode) {
      await platformMusicService.seekTo(position);
    } else {
      if (!this.audioElement) return;
      this.audioElement.currentTime = position;
    }
    console.log(`⏩ Seeked to ${position}s`);
  }

  /**
   * Set volume
   * @param {number} volume - Volume level 0.0 to 1.0
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.platformMode) {
      platformMusicService.setVolume(this.volume);
    } else {
      if (this.audioElement) {
        this.audioElement.volume = this.volume;
      }
    }
  }

  /**
   * Get current playback time
   * @returns {number} Current time in seconds
   */
  async getCurrentTime() {
    if (this.platformMode) {
      return await platformMusicService.getCurrentTime();
    }
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  /**
   * Get track duration
   * @returns {number} Duration in seconds
   */
  getDuration() {
    return this.audioElement ? this.audioElement.duration : 0;
  }

  /**
   * Add track to playlist
   * @param {Object} track - Track to add
   */
  addToPlaylist(track) {
    this.playlist.push(track);
    console.log('➕ Added to playlist:', track.title);
  }

  /**
   * Remove track from playlist
   * @param {string} trackId - Track ID to remove
   */
  removeFromPlaylist(trackId) {
    this.playlist = this.playlist.filter(t => t.id !== trackId);
    console.log('➖ Removed from playlist:', trackId);
  }

  /**
   * Clear playlist
   */
  clearPlaylist() {
    this.playlist = [];
    console.log('🗑️ Playlist cleared');
  }

  /**
   * Play next track in playlist (always skips forward)
   */
  async playNext() {
    console.log('⏭️ ========================================');
    console.log('⏭️ playNext() CALLED');
    console.log('⏭️ ========================================');
    console.log('⏭️ Current track:', this.currentTrack?.title, 'ID:', this.currentTrack?.id);
    console.log('⏭️ Playlist length:', this.playlist.length);
    console.log('⏭️ Playlist:', this.playlist.map(t => `${t.title} (${t.id})`));
    
    if (!this.currentTrack || this.playlist.length === 0) {
      console.log('⏭️ ❌ No next track - currentTrack:', !!this.currentTrack, 'playlist.length:', this.playlist.length);
      return;
    }

    const currentIndex = this.playlist.findIndex(t => t.id === this.currentTrack.id);
    console.log('⏭️ Current index in playlist:', currentIndex);
    
    if (currentIndex === -1) {
      console.warn('⚠️ [playNext] Current track NOT FOUND in playlist!');
      console.warn('⚠️ Current track ID:', this.currentTrack.id);
      console.warn('⚠️ Playlist IDs:', this.playlist.map(t => t.id));
      // Just play the first track in the playlist
      const nextTrack = this.playlist[0];
      console.log('⏭️ Playing first track in playlist instead:', nextTrack.title);
      this.pause();
      await this.loadTrack(nextTrack);
      await this.play();
      return;
    }
    
    const nextIndex = (currentIndex + 1) % this.playlist.length;
    const nextTrack = this.playlist[nextIndex];

    console.log('⏭️ Next index:', nextIndex);
    console.log('⏭️ Next track:', nextTrack.title, 'ID:', nextTrack.id);
    console.log('⏭️ Skipping to next track:', nextTrack.title, 'hasAlbumArt:', !!nextTrack.albumArt);
    
    // Check if we're actually changing tracks
    if (nextTrack.id === this.currentTrack.id) {
      console.warn('⚠️ [playNext] Next track is same as current - only 1 track in playlist? Looping...');
    }
    
    // Stop current track completely before loading next
    this.pause();
    await this.loadTrack(nextTrack);
    await this.play();
    console.log('⏭️ ✅ Successfully advanced to next track');
  }

  /**
   * Play previous track in playlist
   * Behavior: 
   * - If current time > 3 seconds: Restart current track
   * - If current time <= 3 seconds: Go to previous track
   */
  async playPrevious() {
    if (!this.currentTrack || this.playlist.length === 0) {
      console.log('⏮️ No previous track');
      return;
    }

    const currentTime = this.getCurrentTime();
    
    // If we're more than 3 seconds into the track, restart it
    if (currentTime > 3) {
      console.log('⏮️ [playPrevious] Restarting current track (>3s played)');
      await this.seek(0);
      return;
    }
    
    // At beginning of track - go to previous track
    console.log('⏮️ [playPrevious] Going to previous track (<3s played)');
    
    const currentIndex = this.playlist.findIndex(t => t.id === this.currentTrack.id);
    const prevIndex = (currentIndex - 1 + this.playlist.length) % this.playlist.length;
    const prevTrack = this.playlist[prevIndex];

    console.log('⏮️ [playPrevious] Loading previous track:', prevTrack.title, 'hasAlbumArt:', !!prevTrack.albumArt);
    
    // Stop current track completely before loading previous
    this.pause();
    await this.loadTrack(prevTrack);
    await this.play();
  }

  /**
   * Synchronize playback with remote state
   * @param {Object} remoteState - Remote playback state
   */
  async syncWithRemote(remoteState) {
    const { trackId, position, isPlaying } = remoteState;

    // Check if we need to change tracks
    if (!this.currentTrack || this.currentTrack.id !== trackId) {
      const track = this.playlist.find(t => t.id === trackId);
      if (track) {
        await this.loadTrack(track);
      } else {
        console.warn('⚠️ Track not in playlist:', trackId);
        return;
      }
    }

    // Sync position if off by more than threshold
    const currentPos = this.getCurrentTime();
    const timeDiff = Math.abs(currentPos - position);
    
    if (timeDiff > this.syncThreshold) {
      console.log(`🔄 Syncing playback (off by ${timeDiff.toFixed(2)}s)`);
      this.seek(position);
    }

    // Sync play state
    if (isPlaying && !this.isPlaying) {
      await this.play();
    } else if (!isPlaying && this.isPlaying) {
      this.pause();
    }
  }

  /**
   * Get current playback state
   * @returns {Object} Current state
   */
  getState() {
    return {
      currentTrack: this.currentTrack,
      playlist: this.playlist,
      isPlaying: this.isPlaying,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      volume: this.volume,
      isController: this.isController
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.audioElement) {
      this.audioElement.pause();
      // Revoke blob URLs to prevent memory leaks
      if (this.audioElement.src && this.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      this.audioElement.src = '';
      this.audioElement = null;
    }
    
    this.currentTrack = null;
    this.playlist = [];
    this.isPlaying = false;
    this.isController = false;
    
    console.log('🧹 Music service cleaned up');
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>}
   */
  async getCacheStats() {
    return await musicCacheService.getCacheStats();
  }

  /**
   * Clear music cache
   */
  async clearCache() {
    await musicCacheService.clearCache();
  }

  /**
   * Preload playlist tracks for offline use
   * @param {Function} progressCallback - Optional callback(current, total)
   */
  async preloadPlaylist(progressCallback = null) {
    if (this.playlist.length === 0) {
      console.warn('⚠️ No tracks in playlist to preload');
      return;
    }

    console.log(`📥 Preloading ${this.playlist.length} tracks for offline playback...`);

    const tracksToPreload = this.playlist
      .filter(track => track.source === 'local' || track.source === 'spotify-preview')
      .map(track => ({
        id: track.id || track._id,
        url: track.url || track.fileUrl || track.spotifyPreviewUrl,
        metadata: {
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration
        }
      }));

    if (tracksToPreload.length === 0) {
      console.warn('⚠️ No cacheable tracks in playlist (only streaming tracks)');
      return;
    }

    await musicCacheService.preloadTracks(tracksToPreload, progressCallback);
    console.log('✅ Playlist preload complete');
  }

  /**
   * Check if a track is cached
   * @param {string} trackId
   * @returns {Promise<boolean>}
   */
  async isTrackCached(trackId) {
    return await musicCacheService.isCached(trackId);
  }

  /**
   * Update Media Session API for background playback and lock screen controls
   */
  updateMediaSession(track) {
    if (!('mediaSession' in navigator)) {
      return; // Media Session API not supported
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Track',
        artist: track.artist || 'Unknown Artist',
        album: track.album || '',
        artwork: track.albumArt ? [
          { src: track.albumArt, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });

      // Set up action handlers for background controls
      navigator.mediaSession.setActionHandler('play', () => {
        this.play();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.playPrevious();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.playNext();
      });

      console.log('🎵 Media Session updated:', track.title);
    } catch (error) {
      console.warn('Failed to update Media Session:', error);
    }
  }
}

// Export singleton instance
export default new MusicService();
