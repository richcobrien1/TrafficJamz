// Music service for synchronized playback across group members
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
    
    // Detect iOS (any browser) for additional logging
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIOS) {
      console.log('🍎 iOS device detected - music service configured for iOS (all browsers)');
    }
    
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

    this.audioElement.addEventListener('ended', () => {
      console.log('🎵 Track ended, playing next...');
      this.playNext();
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
    if (!this.audioElement) {
      this.initialize();
    }

    this.currentTrack = track;
    
    // Handle both 'url' and 'fileUrl' properties
    const trackUrl = track.url || track.fileUrl;
    
    if (!trackUrl) {
      console.error('❌ Track has no URL:', track);
      throw new Error('Track has no valid URL');
    }
    
    this.audioElement.src = trackUrl;
    
    if (this.onTrackChange) {
      this.onTrackChange(track);
    }

    console.log('🎵 Loaded track:', track.title, 'from URL:', trackUrl);
  }

  /**
   * Play current track
   * @param {number} position - Optional start position in seconds
   */
  async play(position = null) {
    if (!this.audioElement || !this.currentTrack) {
      console.warn('⚠️ No track loaded');
      return;
    }

    if (position !== null) {
      this.audioElement.currentTime = position;
    }

    try {
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
      console.log('▶️ Playing:', this.currentTrack.title, isIOS ? '(iOS)' : '');
    } catch (error) {
      console.error('❌ Playback failed:', error.name, error.message);
      
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
  pause() {
    if (!this.audioElement) return;
    
    this.audioElement.pause();
    console.log('⏸️ Paused');
  }

  /**
   * Seek to position
   * @param {number} position - Position in seconds
   */
  seek(position) {
    if (!this.audioElement) return;
    
    this.audioElement.currentTime = position;
    console.log(`⏩ Seeked to ${position}s`);
  }

  /**
   * Set volume
   * @param {number} volume - Volume level 0.0 to 1.0
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  /**
   * Get current playback time
   * @returns {number} Current time in seconds
   */
  getCurrentTime() {
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
   * Play next track in playlist
   */
  async playNext() {
    if (!this.currentTrack || this.playlist.length === 0) {
      console.log('⏭️ No next track');
      return;
    }

    const currentIndex = this.playlist.findIndex(t => t.id === this.currentTrack.id);
    const nextIndex = (currentIndex + 1) % this.playlist.length;
    const nextTrack = this.playlist[nextIndex];

    await this.loadTrack(nextTrack);
    await this.play();
  }

  /**
   * Play previous track in playlist
   */
  async playPrevious() {
    if (!this.currentTrack || this.playlist.length === 0) {
      console.log('⏮️ No previous track');
      return;
    }

    const currentIndex = this.playlist.findIndex(t => t.id === this.currentTrack.id);
    const prevIndex = (currentIndex - 1 + this.playlist.length) % this.playlist.length;
    const prevTrack = this.playlist[prevIndex];

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
      this.audioElement.src = '';
      this.audioElement = null;
    }
    
    this.currentTrack = null;
    this.playlist = [];
    this.isPlaying = false;
    this.isController = false;
    
    console.log('🧹 Music service cleaned up');
  }
}

// Export singleton instance
export default new MusicService();
