// React hook for synchronized music playback in groups
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import musicService from '../services/music.service';

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'https://trafficjamz.v2u.us';

export const useMusicSession = (groupId, audioSessionId, user) => {
  
  // State
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isController, setIsController] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true); // Default enabled
  
  // Refs
  const socketRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const isControllerRef = useRef(isController);
  const userRef = useRef(user);
  
  // Keep refs in sync with state/props
  useEffect(() => {
    isControllerRef.current = isController;
  }, [isController]);
  
  useEffect(() => {
    userRef.current = user;
  }, [user]);

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
    const myUserId = userRef.current?.id || userRef.current?.user_id;
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
  }, []);

  /**
   * Handle comprehensive music session state (sent on join)
   */
  const handleMusicSessionState = useCallback(async (data) => {
    console.log('🎵 ========================================');
    console.log('🎵 MUSIC SESSION STATE RECEIVED FROM SERVER');
    console.log('🎵 ========================================');
    console.log('🎵 Raw data:', JSON.stringify(data, null, 2));
    console.log('🎵 Playlist length:', data.playlist?.length || 0);
    console.log('🎵 Has current track:', !!data.currently_playing);
    console.log('🎵 Controller ID:', data.controller_id);
    console.log('🎵 Is playing:', data.is_playing);
    console.log('🎵 From:', data.from);
    console.log('🎵 Timestamp:', data.timestamp);

    const myUserId = userRef.current?.id || userRef.current?.user_id;
    console.log('🎵 My user ID (from ref):', myUserId);
    console.log('🎵 My user object (from ref):', userRef.current);

    // Update playlist
    if (data.playlist && Array.isArray(data.playlist)) {
      console.log('📝 ✅ Restoring playlist with', data.playlist.length, 'tracks');
      console.log('📝 Playlist tracks:', data.playlist.map(t => t.title || t.name));
      setPlaylist(data.playlist);
      musicService.playlist = data.playlist;
    } else {
      console.log('📝 ❌ No playlist in session state');
    }

    // Update controller status
    const amController = data.controller_id === myUserId;
    const someoneElseIsController = data.controller_id && data.controller_id !== myUserId;
    
    console.log('👑 Controller status calculation:', {
      myUserId,
      controllerId: data.controller_id,
      'controller_id === myUserId': data.controller_id === myUserId,
      amController,
      someoneElseIsController
    });
    
    setIsController(amController);
    musicService.isController = amController;
    
    if (amController) {
      console.log('👑 ✅ I AM THE DJ (controller)');
    } else if (someoneElseIsController) {
      console.log('👑 ℹ️ Someone else is DJ (listener mode)');
    } else {
      console.log('👑 ℹ️ No DJ in control');
    }

    // Update currently playing track
    if (data.currently_playing) {
      console.log('🎵 ✅ Restoring currently playing track:', data.currently_playing.title);
      console.log('🎵 Track details:', data.currently_playing);
      setCurrentTrack(data.currently_playing);
      
      // Load the track into the music service
      await musicService.loadTrack(data.currently_playing);
      
      // If music is playing, sync playback position
      if (data.is_playing && data.currently_playing.position !== undefined) {
        console.log('▶️ Restoring playback at position:', data.currently_playing.position);
        // Only auto-play if we're not the controller (listeners should sync)
        if (!amController) {
          console.log('▶️ Auto-playing for listener');
          await musicService.play(data.currently_playing.position);
        } else {
          console.log('▶️ Skipping auto-play (I am the controller)');
        }
      }
    } else {
      console.log('🎵 ❌ No currently playing track in session state');
    }
    
    console.log('🎵 ========================================');
    console.log('🎵 MUSIC SESSION STATE PROCESSING COMPLETE');
    console.log('🎵 ========================================');
  }, []);

  /**
   * Initialize music service and socket connection
   * NOTE: Socket connection persists across re-renders to avoid reconnection issues
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
      console.log('🎵 [Hook] onTrackChange callback:', track?.title);
      setCurrentTrack(track);
      
      // If we're the controller and track changed, broadcast to group
      // This handles auto-advance when track ends
      if (isControllerRef.current && track) {
        console.log('🎵 [Hook] Broadcasting track change as controller');
        socketRef.current?.emit('music-change-track', {
          sessionId: audioSessionId,
          track,
          autoPlay: true,
          position: 0
        });
      }
    };

    musicService.onPlayStateChange = (playing) => {
      setIsPlaying(playing);
    };

    musicService.onTimeUpdate = (time) => {
      setCurrentTime(time);
      setDuration(musicService.getDuration());
    };

    // Connect to socket if not already connected
    // Socket connection persists across re-renders to maintain connection
    if (!socketRef.current) {
      console.log('🎵 ========================================');
      console.log('🎵 CREATING MUSIC SOCKET CONNECTION');
      console.log('🎵 ========================================');
      console.log('🎵 API_URL:', API_URL);
      console.log('🎵 VITE_API_URL:', import.meta.env.VITE_API_URL);
      console.log('🎵 VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
      console.log('🎵 Token exists:', !!localStorage.getItem('token'));
      console.log('🎵 Window location:', window.location.origin);
      
      const socket = io(API_URL, {
        auth: {
          token: localStorage.getItem('token')
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      socketRef.current = socket;

      // Add connection event handlers for debugging
      socket.on('connect', () => {
        console.log('🎵 ✅ Music socket connected');
        console.log('🎵 Socket ID:', socket.id);
        console.log('🎵 Transport:', socket.io.engine.transport.name);
      });

      socket.on('connect_error', (error) => {
        console.error('🎵 ❌ Music socket connection error:', error);
        console.error('🎵 Error details:', {
          message: error.message,
          description: error.description,
          type: error.type
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('🎵 ⚠️ Music socket disconnected:', reason);
      });

      socket.on('error', (error) => {
        console.error('🎵 ❌ Music socket error:', error);
      });

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
      console.log('🎵 ✅ Music socket events registered');
      console.log('🎵 ========================================');
    }
    
    // Join music room when socket is connected
    const socket = socketRef.current;
    if (socket) {
      const joinRoom = () => {
        if (socket.connected) {
          const myUserId = userRef.current?.id || userRef.current?.user_id;
          console.log('🎵 ========================================');
          console.log('🎵 JOINING MUSIC SESSION');
          console.log('🎵 ========================================');
          console.log('🎵 Audio Session ID:', audioSessionId);
          console.log('🎵 Group ID:', groupId);
          console.log('🎵 My User ID:', myUserId);
          console.log('🎵 My User Object:', userRef.current);
          console.log('🎵 Socket connected:', socket.connected);
          console.log('🎵 Socket ID:', socket.id);
          socket.emit('join-music-session', {
            sessionId: audioSessionId,
            groupId,
            userId: myUserId
          });
          console.log('🎵 ✅ join-music-session emitted');
          console.log('🎵 ⏳ Waiting for music-session-state from server...');
          console.log('🎵 ========================================');
          
          // Set a timeout to detect if state never arrives
          const stateTimeout = setTimeout(() => {
            console.warn('🎵 ⚠️ WARNING: music-session-state not received within 5 seconds');
            console.warn('🎵 This could mean:');
            console.warn('🎵 1. Backend not running');
            console.warn('🎵 2. Socket connection issue');
            console.warn('🎵 3. Session ID mismatch');
            console.warn('🎵 4. Backend handler error');
            console.warn('🎵 Check backend console for errors');
          }, 5000);
          
          // Clear timeout when state is received
          const originalHandler = handleMusicSessionState;
          const wrappedHandler = async (data) => {
            clearTimeout(stateTimeout);
            await originalHandler(data);
          };
          
          // Replace the handler temporarily (only for this join)
          socket.once('music-session-state', wrappedHandler);
        } else {
          console.log('🎵 ❌ Socket not connected yet, waiting for connection...');
          console.log('🎵 Socket state:', socket.connected, socket.id);
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
      const handleConnect = () => {
        console.log('🎵 Socket connected event fired');
        joinRoom();
      };
      socket.on('connect', handleConnect);
      
      // Cleanup only the connect listener
      return () => {
        socket.off('connect', handleConnect);
      };
    }

    // NOTE: We do NOT clean up the socket or its listeners here
    // The socket persists across re-renders to maintain the connection
    // It will only be cleaned up when the component unmounts
  }, [groupId, audioSessionId, user]);

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
    console.log('⏭️ playNext called, isController:', isController);
    await musicService.playNext();
    
    // Controller broadcasts to group
    if (isController) {
      console.log('⏭️ Broadcasting next track to group');
      socketRef.current?.emit('music-control', {
        sessionId: audioSessionId,
        action: 'next',
        trackId: musicService.currentTrack?.id
      });
    } else {
      console.log('⏭️ Not controller - local playback only (no broadcast)');
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
      userId: userRef.current?.id || userRef.current?.user_id
    });
  }, [audioSessionId]);

  /**
   * Release control
   */
  const releaseControl = useCallback(() => {
    setIsController(false);
    musicService.isController = false;
    
    socketRef.current?.emit('music-release-control', {
      sessionId: audioSessionId,
      userId: userRef.current?.id || userRef.current?.user_id
    });
  }, [audioSessionId]);

  /**
   * Change volume
   */
  const changeVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    musicService.setVolume(newVolume);
  }, []);

  /**
   * Cleanup on unmount only
   */
  useEffect(() => {
    return () => {
      console.log('🎵 Music session hook unmounting - cleaning up socket');
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
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
