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
  const isControllerRef = useRef(isController);
  
  // Keep ref in sync with state
  useEffect(() => {
    isControllerRef.current = isController;
  }, [isController]);

  /**
   * Handle remote play event
   */
  const handleRemotePlay = useCallback((data) => {
    if (isControllerRef.current) return; // Controller ignores remote events
    
    console.log('🎵 Remote play:', data);
    musicService.play(data.position);
  }, []);

  /**
   * Handle remote pause event
   */
  const handleRemotePause = useCallback((data) => {
    if (isControllerRef.current) return;
    
    console.log('⏸️ Remote pause:', data);
    musicService.pause();
  }, []);

  /**
   * Handle remote seek event
   */
  const handleRemoteSeek = useCallback((data) => {
    if (isControllerRef.current) return;
    
    console.log('⏩ Remote seek:', data.position);
    musicService.seek(data.position);
  }, []);

  /**
   * Handle remote track change
   */
  const handleRemoteTrackChange = useCallback(async (data) => {
    if (isControllerRef.current) return;
    
    console.log('🎵 Remote track change:', data.track);
    await musicService.loadTrack(data.track);
    if (data.autoPlay) {
      await musicService.play(data.position || 0);
    }
  }, []);

  /**
   * Handle remote sync event
   */
  const handleRemoteSync = useCallback((data) => {
    if (isControllerRef.current) return;
    
    console.log('🔄 Remote sync:', data);
    musicService.syncWithRemote(data);
  }, []);

  /**
   * Handle playlist update
   */
  const handlePlaylistUpdate = useCallback((data) => {
    console.log('📝 Playlist updated from socket:', data.playlist?.length || 0, 'tracks');
    if (data.playlist && Array.isArray(data.playlist)) {
      setPlaylist(data.playlist);
      musicService.playlist = data.playlist;
    }
  }, []);

  /**
   * Handle controller changed
   */
  const handleControllerChanged = useCallback((data) => {
    console.log('👑 Controller changed:', data);
    const myUserId = user?.id || user?.user_id;
    if (data.controllerId === null || data.userId === null) {
      // No one is controlling
      console.log('🎵 No DJ in control');
      setIsController(false);
      musicService.isController = false;
    } else if (data.userId === myUserId || data.controllerId === myUserId) {
      // We are now the controller
      console.log('🎵 I am now the DJ');
      setIsController(true);
      musicService.isController = true;
    } else {
      // Someone else took control
      setIsController(false);
      musicService.isController = false;
      console.log('🎵 Someone else is now DJ');
    }
  }, [user]);

  /**
   * Handle comprehensive music session state (sent on join)
   */
  const handleMusicSessionState = useCallback(async (data) => {
    console.log('🎵 Received comprehensive music session state:', {
      playlistLength: data.playlist?.length || 0,
      hasCurrentTrack: !!data.currently_playing,
      controllerId: data.controller_id,
      isPlaying: data.is_playing
    });

    const myUserId = user?.id || user?.user_id;

    // Update playlist
    if (data.playlist && Array.isArray(data.playlist)) {
      console.log('📝 Restoring playlist with', data.playlist.length, 'tracks');
      setPlaylist(data.playlist);
      musicService.playlist = data.playlist;
    }

    // Update controller status
    const amController = data.controller_id === myUserId;
    const someoneElseIsController = data.controller_id && data.controller_id !== myUserId;
    
    setIsController(amController);
    musicService.isController = amController;
    
    console.log('👑 Controller status from session state:', {
      myUserId,
      controllerId: data.controller_id,
      amController,
      someoneElseIsController
    });

    // Update currently playing track
    if (data.currently_playing) {
      console.log('🎵 Restoring currently playing track:', data.currently_playing.title);
      setCurrentTrack(data.currently_playing);
      
      // Load the track into the music service
      await musicService.loadTrack(data.currently_playing);
      
      // If music is playing, sync playback position
      if (data.is_playing && data.currently_playing.position !== undefined) {
        console.log('▶️ Restoring playback at position:', data.currently_playing.position);
        // Only auto-play if we're not the controller (listeners should sync)
        if (!amController) {
          await musicService.play(data.currently_playing.position);
        }
      }
    }
  }, [user]);

  /**
   * Initialize music service and socket connection
   */
  useEffect(() => {
    if (!groupId || !audioSessionId) {
      console.log('🎵 Skipping music session init - missing groupId or audioSessionId:', { groupId, audioSessionId });
      return;
    }

    console.log('🎵 Initializing music session hook for:', { groupId, audioSessionId });
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

    // Connect to socket if not already connected
    if (!socketRef.current) {
      console.log('🎵 Creating new music socket connection...');
      const socket = io(API_URL, {
        auth: {
          token: localStorage.getItem('token')
        }
      });
      
      socketRef.current = socket;

      // CRITICAL: Register ALL event listeners BEFORE joining the room
      // This ensures we don't miss the music-session-state event from the server
      console.log('🎵 Registering music event listeners...');
      socket.on('music-play', handleRemotePlay);
      socket.on('music-pause', handleRemotePause);
      socket.on('music-seek', handleRemoteSeek);
      socket.on('music-change-track', handleRemoteTrackChange);
      socket.on('music-track-change', handleRemoteTrackChange); // Legacy support
      socket.on('music-sync', handleRemoteSync);
      socket.on('playlist-update', handlePlaylistUpdate);
      socket.on('music-controller-changed', handleControllerChanged);
      socket.on('music-session-state', handleMusicSessionState); // Comprehensive state on join
      console.log('🎵 Music socket events registered');
    }
    
    // Join music room when socket is connected
    const socket = socketRef.current;
    if (socket) {
      const joinRoom = () => {
        if (socket.connected) {
          console.log('🎵 Socket connected, joining music session room:', audioSessionId, 'groupId:', groupId);
          socket.emit('join-music-session', {
            sessionId: audioSessionId,
            groupId,
            userId: user?.id || user?.user_id
          });
          console.log('🎵 join-music-session emitted, server should send music-session-state');
        } else {
          console.log('🎵 Socket not connected yet, waiting for connection...');
        }
      };
      
      // If socket is already connected, join immediately
      if (socket.connected) {
        console.log('🎵 Socket already connected on hook init');
        joinRoom();
      } else {
        console.log('🎵 Socket not connected yet, will join on connect event');
      }
      
      // Also join on connect/reconnect
      socket.on('connect', () => {
        console.log('🎵 Socket connected event fired');
        joinRoom();
      });
      
      // Cleanup the connect listener when component unmounts or dependencies change
      return () => {
        socket.off('connect', joinRoom);
      };
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
        socketRef.current.off('music-session-state', handleMusicSessionState);
      }
    };
  }, [groupId, audioSessionId, user, handleRemotePlay, handleRemotePause, handleRemoteSeek, handleRemoteTrackChange, handleRemoteSync, handlePlaylistUpdate, handleControllerChanged, handleMusicSessionState]);

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
    
    // Notify server - persist to database
    try {
      const response = await fetch(`${API_URL}/api/audio/sessions/${audioSessionId}/music/playlist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration,
          fileUrl: track.fileUrl || track.url,
          uploadedBy: track.uploadedBy
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Failed to persist track to database:', errorData);
      } else {
        console.log('✅ Track persisted to database');
      }
      
      // Broadcast playlist update to other users
      socketRef.current?.emit('playlist-update', {
        sessionId: audioSessionId,
        playlist: updatedPlaylist
      });
      console.log('📝 Playlist update broadcasted to group');
    } catch (error) {
      console.error('❌ Failed to add track:', error);
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
