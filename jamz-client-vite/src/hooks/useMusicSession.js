// React hook for synchronized music playback in groups
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import musicService from '../services/music.service';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://trafficjamz.onrender.com';

export const useMusicSession = (groupId, audioSessionId) => {
  const { user } = useAuth();
  
  // State
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isController, setIsController] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  
  // Refs
  const socketRef = useRef(null);
  const syncIntervalRef = useRef(null);

  /**
   * Initialize music service and socket connection
   */
  useEffect(() => {
    if (!groupId || !audioSessionId) return;

    musicService.initialize();

    // Set up callbacks
    musicService.onTrackChange = (track) => {
      setCurrentTrack(track);
    };

    musicService.onPlayStateChange = (playing) => {
      setIsPlaying(playing);
    };

    musicService.onTimeUpdate = (time) => {
      setCurrentTime(time);
      setDuration(musicService.getDuration());
    };

    // Fetch initial playlist
    const fetchPlaylist = async () => {
      try {
        const response = await fetch(`${API_URL}/api/audio/sessions/${audioSessionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (data.session?.music?.playlist) {
          console.log('📝 Initial playlist loaded:', data.session.music.playlist);
          setPlaylist(data.session.music.playlist);
          musicService.playlist = data.session.music.playlist;
        }
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
      }
    };
    fetchPlaylist();

    // Connect to socket if not already connected
    if (!socketRef.current) {
      socketRef.current = io(API_URL, {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Join music room
      socketRef.current.emit('join-music-session', {
        sessionId: audioSessionId,
        groupId,
        userId: user?.id || user?.user_id
      });

      // Listen for music events
      socketRef.current.on('music-play', handleRemotePlay);
      socketRef.current.on('music-pause', handleRemotePause);
      socketRef.current.on('music-seek', handleRemoteSeek);
      socketRef.current.on('music-change-track', handleRemoteTrackChange);
      socketRef.current.on('music-track-change', handleRemoteTrackChange); // Legacy support
      socketRef.current.on('music-sync', handleRemoteSync);
      socketRef.current.on('playlist-update', handlePlaylistUpdate);
      socketRef.current.on('music-controller-changed', handleControllerChanged);
      
      console.log('🎵 Music socket events registered for session:', audioSessionId);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      // Clean up socket listeners
      if (socketRef.current) {
        socketRef.current.off('music-play', handleRemotePlay);
        socketRef.current.off('music-pause', handleRemotePause);
        socketRef.current.off('music-seek', handleRemoteSeek);
        socketRef.current.off('music-change-track', handleRemoteTrackChange);
        socketRef.current.off('music-track-change', handleRemoteTrackChange);
        socketRef.current.off('music-sync', handleRemoteSync);
        socketRef.current.off('playlist-update', handlePlaylistUpdate);
        socketRef.current.off('music-controller-changed', handleControllerChanged);
      }
    };
  }, [groupId, audioSessionId, user]);

  /**
   * Handle remote play event
   */
  const handleRemotePlay = useCallback((data) => {
    if (isController) return; // Controller ignores remote events
    
    console.log('🎵 Remote play:', data);
    musicService.play(data.position);
  }, [isController]);

  /**
   * Handle remote pause event
   */
  const handleRemotePause = useCallback((data) => {
    if (isController) return;
    
    console.log('⏸️ Remote pause:', data);
    musicService.pause();
  }, [isController]);

  /**
   * Handle remote seek event
   */
  const handleRemoteSeek = useCallback((data) => {
    if (isController) return;
    
    console.log('⏩ Remote seek:', data.position);
    musicService.seek(data.position);
  }, [isController]);

  /**
   * Handle remote track change
   */
  const handleRemoteTrackChange = useCallback(async (data) => {
    if (isController) return;
    
    console.log('🎵 Remote track change:', data.track);
    await musicService.loadTrack(data.track);
    if (data.autoPlay) {
      await musicService.play(data.position || 0);
    }
  }, [isController]);

  /**
   * Handle remote sync event
   */
  const handleRemoteSync = useCallback((data) => {
    if (isController) return;
    
    console.log('🔄 Remote sync:', data);
    musicService.syncWithRemote(data);
  }, [isController]);

  /**
   * Handle playlist update
   */
  const handlePlaylistUpdate = useCallback((data) => {
    console.log('📝 Playlist updated:', data.playlist);
    setPlaylist(data.playlist);
    musicService.playlist = data.playlist;
  }, []);

  /**
   * Handle controller changed
   */
  const handleControllerChanged = useCallback((data) => {
    console.log('👑 Controller changed:', data);
    if (data.controllerId === null) {
      // No one is controlling
      console.log('🎵 No DJ in control');
    } else if (data.controllerId !== socketRef.current?.id) {
      // Someone else took control
      setIsController(false);
      musicService.isController = false;
      console.log('🎵 Someone else is now DJ');
    }
  }, []);

  /**
   * Play music
   */
  const play = useCallback(async () => {
    console.log('▶️ Play music locally');
    await musicService.play();
    
    if (isController) {
      const position = musicService.getCurrentTime();
      console.log('▶️ Broadcasting play to group at position:', position);
      socketRef.current?.emit('music-control', {
        sessionId: audioSessionId,
        action: 'play',
        position,
        trackId: currentTrack?.id
      });
    }
  }, [audioSessionId, currentTrack, isController]);

  /**
   * Pause music
   */
  const pause = useCallback(() => {
    console.log('⏸️ Pause music locally');
    musicService.pause();
    
    if (isController) {
      const position = musicService.getCurrentTime();
      console.log('⏸️ Broadcasting pause to group at position:', position);
      socketRef.current?.emit('music-control', {
        sessionId: audioSessionId,
        action: 'pause',
        position,
        trackId: currentTrack?.id
      });
    }
  }, [audioSessionId, currentTrack, isController]);

  /**
   * Seek to position
   */
  const seekTo = useCallback((position) => {
    console.log('⏩ Seek locally to:', position);
    musicService.seek(position);
    
    if (isController) {
      console.log('⏩ Broadcasting seek to group at position:', position);
      socketRef.current?.emit('music-control', {
        sessionId: audioSessionId,
        action: 'seek',
        position,
        trackId: currentTrack?.id
      });
    }
  }, [audioSessionId, currentTrack, isController]);

  /**
   * Play next track
   */
  const playNext = useCallback(async () => {
    await musicService.playNext();
    
    if (isController) {
      socketRef.current?.emit('music-control', {
        sessionId: audioSessionId,
        action: 'next',
        trackId: musicService.currentTrack?.id
      });
    }
  }, [audioSessionId, isController]);

  /**
   * Play previous track
   */
  const playPrevious = useCallback(async () => {
    await musicService.playPrevious();
    
    if (isController) {
      socketRef.current?.emit('music-control', {
        sessionId: audioSessionId,
        action: 'previous',
        trackId: musicService.currentTrack?.id
      });
    }
  }, [audioSessionId, isController]);

  /**
   * Add track to playlist
   */
  const addTrack = useCallback(async (track) => {
    console.log('➕ Adding track to playlist:', track.title);
    musicService.addToPlaylist(track);
    const updatedPlaylist = [...musicService.playlist];
    setPlaylist(updatedPlaylist);
    
    // Notify server
    try {
      await fetch(`${API_URL}/api/audio/sessions/${audioSessionId}/playlist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ track })
      });
      
      // Broadcast playlist update to other users
      socketRef.current?.emit('playlist-update', {
        sessionId: audioSessionId,
        playlist: updatedPlaylist
      });
      console.log('📝 Playlist update broadcasted to group');
    } catch (error) {
      console.error('Failed to add track:', error);
    }
  }, [audioSessionId]);

  /**
   * Remove track from playlist
   */
  const removeTrack = useCallback(async (trackId) => {
    musicService.removeFromPlaylist(trackId);
    setPlaylist([...musicService.playlist]);
    
    // Notify server
    try {
      await fetch(`${API_URL}/api/audio/sessions/${audioSessionId}/playlist/${trackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Failed to remove track:', error);
    }
  }, [audioSessionId]);

  /**
   * Load and play a specific track
   */
  const loadAndPlay = useCallback(async (track) => {
    console.log('🎵 Loading and playing track:', track.title);
    await musicService.loadTrack(track);
    await musicService.play();
    
    if (isController) {
      console.log('🎵 Broadcasting track change to group');
      // Emit both change-track action and separate track-change event for compatibility
      socketRef.current?.emit('music-control', {
        sessionId: audioSessionId,
        action: 'change-track',
        track,
        autoPlay: true,
        position: 0
      });
      
      socketRef.current?.emit('music-track-change', {
        sessionId: audioSessionId,
        track,
        autoPlay: true
      });
    }
  }, [audioSessionId, isController]);

  /**
   * Toggle music feature
   */
  const toggleMusic = useCallback(async () => {
    const newState = !isMusicEnabled;
    setIsMusicEnabled(newState);
    
    if (!newState) {
      musicService.pause();
      musicService.cleanup();
    }
  }, [isMusicEnabled]);

  /**
   * Become the controller (DJ mode)
   */
  const takeControl = useCallback(() => {
    setIsController(true);
    musicService.isController = true;
    
    socketRef.current?.emit('music-take-control', {
      sessionId: audioSessionId,
      userId: user?.id || user?.user_id
    });
  }, [audioSessionId, user]);

  /**
   * Release control
   */
  const releaseControl = useCallback(() => {
    setIsController(false);
    musicService.isController = false;
    
    socketRef.current?.emit('music-release-control', {
      sessionId: audioSessionId,
      userId: user?.id || user?.user_id
    });
  }, [audioSessionId, user]);

  /**
   * Change volume
   */
  const changeVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    musicService.setVolume(newVolume);
  }, []);

  return {
    // State
    currentTrack,
    playlist,
    isPlaying,
    currentTime,
    duration,
    volume,
    isController,
    isMusicEnabled,
    
    // Actions
    play,
    pause,
    seekTo,
    playNext,
    playPrevious,
    addTrack,
    removeTrack,
    loadAndPlay,
    toggleMusic,
    takeControl,
    releaseControl,
    changeVolume
  };
};
