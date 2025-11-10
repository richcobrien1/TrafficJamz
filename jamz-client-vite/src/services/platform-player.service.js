/**
 * Platform Player Service
 * Unified playback for Spotify, YouTube, and Apple Music
 */

import spotifyClient from './spotify-client.service';
import youtubeClient from './youtube-client.service';
import appleMusicClient from './apple-music-client.service';

class PlatformPlayerService {
  constructor() {
    this.currentPlatform = null;
    this.spotifyPlayer = null;
    this.youtubePlayer = null;
    this.appleMusicPlayer = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.onStateChange = null;
  }

  /**
   * Initialize Spotify Web Playback SDK
   */
  async initializeSpotify() {
    if (this.spotifyPlayer) return true;

    try {
      if (!window.Spotify) {
        console.error('Spotify SDK not loaded');
        return false;
      }

      const token = localStorage.getItem('spotify_access_token');
      if (!token) {
        console.error('No Spotify token');
        return false;
      }

      this.spotifyPlayer = new window.Spotify.Player({
        name: 'TrafficJamz Web Player',
        getOAuthToken: cb => { cb(token); },
        volume: 0.5
      });

      // Error handling
      this.spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Spotify init error:', message);
      });

      this.spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Spotify auth error:', message);
      });

      this.spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Spotify account error:', message);
      });

      this.spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('Spotify playback error:', message);
      });

      // Ready
      this.spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('✅ Spotify player ready with device ID:', device_id);
        this.spotifyDeviceId = device_id;
      });

      // State changes
      this.spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        
        this.isPlaying = !state.paused;
        if (this.onStateChange) {
          this.onStateChange({
            isPlaying: this.isPlaying,
            position: state.position,
            duration: state.duration,
            track: state.track_window.current_track
          });
        }
      });

      // Connect
      const connected = await this.spotifyPlayer.connect();
      return connected;
    } catch (error) {
      console.error('Error initializing Spotify player:', error);
      return false;
    }
  }

  /**
   * Initialize YouTube IFrame Player
   */
  async initializeYouTube() {
    if (this.youtubePlayer) return true;

    try {
      if (!window.YT) {
        console.error('YouTube IFrame API not loaded');
        return false;
      }

      return new Promise((resolve) => {
        this.youtubePlayer = new window.YT.Player('youtube-player', {
          height: '0',
          width: '0',
          playerVars: {
            'playsinline': 1,
            'controls': 0
          },
          events: {
            'onReady': () => {
              console.log('✅ YouTube player ready');
              resolve(true);
            },
            'onStateChange': (event) => {
              this.isPlaying = event.data === window.YT.PlayerState.PLAYING;
              if (this.onStateChange) {
                this.onStateChange({
                  isPlaying: this.isPlaying,
                  position: this.youtubePlayer.getCurrentTime() * 1000,
                  duration: this.youtubePlayer.getDuration() * 1000
                });
              }
            },
            'onError': (event) => {
              console.error('YouTube player error:', event.data);
            }
          }
        });
      });
    } catch (error) {
      console.error('Error initializing YouTube player:', error);
      return false;
    }
  }

  /**
   * Initialize Apple Music Player
   */
  async initializeAppleMusic() {
    if (this.appleMusicPlayer) return true;

    try {
      await appleMusicClient.initialize();
      
      if (!appleMusicClient.music) {
        console.error('Apple Music not initialized');
        return false;
      }

      this.appleMusicPlayer = appleMusicClient.music;
      
      // Listen for playback state changes
      this.appleMusicPlayer.addEventListener('playbackStateDidChange', () => {
        this.isPlaying = this.appleMusicPlayer.isPlaying;
        if (this.onStateChange) {
          this.onStateChange({
            isPlaying: this.isPlaying,
            position: this.appleMusicPlayer.currentPlaybackTime * 1000,
            duration: this.appleMusicPlayer.currentPlaybackDuration * 1000
          });
        }
      });

      console.log('✅ Apple Music player ready');
      return true;
    } catch (error) {
      console.error('Error initializing Apple Music player:', error);
      return false;
    }
  }

  /**
   * Play a track from any platform
   */
  async play(track) {
    try {
      console.log('🎵 Playing track:', track);
      this.currentTrack = track;

      // Stop current playback
      await this.stop();

      if (track.source === 'spotify' && track.spotifyId) {
        return await this.playSpotify(track.spotifyId);
      } else if (track.source === 'youtube' && track.youtubeId) {
        return await this.playYouTube(track.youtubeId);
      } else if (track.source === 'apple-music' && track.appleMusicId) {
        return await this.playAppleMusic(track.appleMusicId);
      } else {
        throw new Error('Unknown track source or missing ID');
      }
    } catch (error) {
      console.error('Error playing track:', error);
      throw error;
    }
  }

  /**
   * Play Spotify track
   */
  async playSpotify(trackId) {
    await this.initializeSpotify();
    
    if (!this.spotifyPlayer || !this.spotifyDeviceId) {
      throw new Error('Spotify player not ready');
    }

    // Transfer playback to this device and play
    const token = localStorage.getItem('spotify_access_token');
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.spotifyDeviceId}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    this.currentPlatform = 'spotify';
    console.log('✅ Playing Spotify track:', trackId);
  }

  /**
   * Play YouTube video
   */
  async playYouTube(videoId) {
    await this.initializeYouTube();
    
    if (!this.youtubePlayer) {
      throw new Error('YouTube player not ready');
    }

    this.youtubePlayer.loadVideoById(videoId);
    this.youtubePlayer.playVideo();
    
    this.currentPlatform = 'youtube';
    console.log('✅ Playing YouTube video:', videoId);
  }

  /**
   * Play Apple Music track
   */
  async playAppleMusic(trackId) {
    await this.initializeAppleMusic();
    
    if (!this.appleMusicPlayer) {
      throw new Error('Apple Music player not ready');
    }

    await this.appleMusicPlayer.setQueue({
      song: trackId
    });
    
    await this.appleMusicPlayer.play();
    
    this.currentPlatform = 'apple-music';
    console.log('✅ Playing Apple Music track:', trackId);
  }

  /**
   * Pause playback
   */
  async pause() {
    if (this.currentPlatform === 'spotify' && this.spotifyPlayer) {
      await this.spotifyPlayer.pause();
    } else if (this.currentPlatform === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.pauseVideo();
    } else if (this.currentPlatform === 'apple-music' && this.appleMusicPlayer) {
      await this.appleMusicPlayer.pause();
    }
    this.isPlaying = false;
  }

  /**
   * Resume playback
   */
  async resume() {
    if (this.currentPlatform === 'spotify' && this.spotifyPlayer) {
      await this.spotifyPlayer.resume();
    } else if (this.currentPlatform === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.playVideo();
    } else if (this.currentPlatform === 'apple-music' && this.appleMusicPlayer) {
      await this.appleMusicPlayer.play();
    }
    this.isPlaying = true;
  }

  /**
   * Stop playback
   */
  async stop() {
    if (this.currentPlatform === 'spotify' && this.spotifyPlayer) {
      await this.spotifyPlayer.pause();
    } else if (this.currentPlatform === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.stopVideo();
    } else if (this.currentPlatform === 'apple-music' && this.appleMusicPlayer) {
      await this.appleMusicPlayer.stop();
    }
    this.isPlaying = false;
    this.currentPlatform = null;
  }

  /**
   * Seek to position (milliseconds)
   */
  async seek(positionMs) {
    const positionSec = positionMs / 1000;
    
    if (this.currentPlatform === 'spotify' && this.spotifyPlayer) {
      await this.spotifyPlayer.seek(positionMs);
    } else if (this.currentPlatform === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.seekTo(positionSec, true);
    } else if (this.currentPlatform === 'apple-music' && this.appleMusicPlayer) {
      this.appleMusicPlayer.seekToTime(positionSec);
    }
  }

  /**
   * Set volume (0-1)
   */
  async setVolume(volume) {
    if (this.currentPlatform === 'spotify' && this.spotifyPlayer) {
      await this.spotifyPlayer.setVolume(volume);
    } else if (this.currentPlatform === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.setVolume(volume * 100);
    } else if (this.currentPlatform === 'apple-music' && this.appleMusicPlayer) {
      this.appleMusicPlayer.volume = volume;
    }
  }

  /**
   * Get current playback state
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      currentPlatform: this.currentPlatform
    };
  }
}

export default new PlatformPlayerService();
