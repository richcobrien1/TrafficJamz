import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import musicService from '../services/music.service';
import { useAuth } from './AuthContext';

const MusicContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'https://trafficjamz.onrender.com';

export const MusicProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Centralized music state - persists across components
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isController, setIsController] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  
  // Session tracking
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  
  // Refs
  const socketRef = useRef(null);
  const isControllerRef = useRef(isController);
  const userRef = useRef(user);
  
  // Keep refs in sync
  useEffect(() => {
    isControllerRef.current = isController;
  }, [isController]);
  
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  
  /**
   * Initialize music session
   */
  const initializeSession = (sessionId, groupId) => {
    console.log('🎵 [MusicContext] Initializing music session:', { sessionId, groupId });
    
    // If already connected to this session, don't reconnect
    if (activeSessionId === sessionId && socketRef.current?.connected) {
      console.log('🎵 [MusicContext] Already connected to this session');
      return;
    }
    
    // Clean up previous session if different
    if (activeSessionId && activeSessionId !== sessionId && socketRef.current) {
      console.log('🎵 [MusicContext] Cleaning up previous session:', activeSessionId);
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setActiveSessionId(sessionId);
    setActiveGroupId(groupId);
    
    // Initialize music service
    musicService.initialize();
    
    // Set up callbacks
    musicService.onTrackChange = (track) => {
      console.log('🎵 [MusicContext] Track changed:', track?.title);
      setCurrentTrack(track);
    };
    
    musicService.onPlayStateChange = (playing) => {
      console.log('🎵 [MusicContext] Play state changed:', playing);
      setIsPlaying(playing);
    };
    
    musicService.onTimeUpdate = (time) => {
      setCurrentTime(time);
      setDuration(musicService.getDuration());
    };
    
    // Connect to socket if not already connected
    if (!socketRef.current) {
      console.log('🎵 [MusicContext] Creating new socket connection');
      const socket = io(API_URL, {
        auth: {
          token: localStorage.getItem('token')
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: false // DON'T connect until handlers are registered
      });
      
      socketRef.current = socket;
      
      // Register event handlers FIRST (before connecting)
      setupSocketEventHandlers(socket);
      
      // Connection event handlers
      socket.on('connect', () => {
        console.log('🎵 [MusicContext] Socket connected:', socket.id);
        joinMusicSession(sessionId, groupId);
      });
      
      socket.on('connect_error', (error) => {
        console.error('🎵 [MusicContext] Socket connection error:', error);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('🎵 [MusicContext] Socket disconnected:', reason);
      });
      
      // NOW connect with handlers ready
      console.log('🎵 [MusicContext] Connecting socket with handlers ready...');
      socket.connect();
    }
  };
  
  /**
   * Set up socket event handlers
   */
  const setupSocketEventHandlers = (socket) => {
    console.log('🎵 [MusicContext] Setting up socket event handlers');
    
    // Music session state (comprehensive state on join)
    socket.on('music-session-state', (data) => {
      console.log('🎵 [MusicContext] ========================================');
      console.log('🎵 [MusicContext] MUSIC SESSION STATE RECEIVED');
      console.log('🎵 [MusicContext] ========================================');
      console.log('🎵 Playlist tracks:', data.playlist?.length || 0);
      console.log('🎵 Current track:', data.currently_playing?.title || 'none');
      console.log('🎵 Controller:', data.controller_id || 'none');
      console.log('🎵 Full playlist data:', JSON.stringify(data.playlist, null, 2));
      console.log('🎵 [MusicContext] ========================================');
      
      const myUserId = userRef.current?.id || userRef.current?.user_id;
      
      // Update playlist (PERSIST IN CONTEXT)
      if (data.playlist && Array.isArray(data.playlist)) {
        console.log('🎵 [MusicContext] ✅ Setting playlist state with', data.playlist.length, 'tracks');
        
        // Deduplicate playlist (in case database has duplicates)
        const deduplicatedPlaylist = [];
        const seenUrls = new Set();
        const seenTitleArtist = new Set();
        
        for (const track of data.playlist) {
          const url = track.fileUrl || track.url;
          const titleArtist = `${track.title}|${track.artist}`;
          
          if (url && seenUrls.has(url)) {
            console.warn('🎵 [MusicContext] ⚠️ Duplicate track removed (by URL):', track.title);
            continue;
          }
          if (seenTitleArtist.has(titleArtist)) {
            console.warn('🎵 [MusicContext] ⚠️ Duplicate track removed (by title/artist):', track.title);
            continue;
          }
          
          if (url) seenUrls.add(url);
          seenTitleArtist.add(titleArtist);
          deduplicatedPlaylist.push(track);
        }
        
        if (deduplicatedPlaylist.length !== data.playlist.length) {
          console.warn('🎵 [MusicContext] ⚠️ Removed', data.playlist.length - deduplicatedPlaylist.length, 'duplicate tracks');
        }
        
        setPlaylist(deduplicatedPlaylist);
        musicService.playlist = deduplicatedPlaylist;
        console.log('🎵 [MusicContext] ✅ Playlist state updated successfully with', deduplicatedPlaylist.length, 'tracks');
      } else {
        console.warn('🎵 [MusicContext] ⚠️ No valid playlist in music-session-state event');
      }
      
      // Update controller status
      const amController = data.controller_id === myUserId;
      setIsController(amController);
      musicService.isController = amController;
      console.log('🎵 [MusicContext] Controller status:', amController ? 'I am DJ' : 'Listener');
      
      // Update currently playing
      if (data.currently_playing) {
        console.log('🎵 [MusicContext] Loading current track:', data.currently_playing.title);
        setCurrentTrack(data.currently_playing);
        musicService.loadTrack(data.currently_playing).then(() => {
          if (data.is_playing && !amController) {
            console.log('🎵 [MusicContext] Auto-playing for listener');
            musicService.play(data.currently_playing.position);
          }
        });
      }
    });
    
    // Playlist updates
    socket.on('playlist-update', (data) => {
      console.log('🎵 [MusicContext] Playlist update received:', data.playlist?.length || 0, 'tracks');
      if (data.playlist && Array.isArray(data.playlist)) {
        // Deduplicate received playlist
        const deduplicatedPlaylist = [];
        const seenUrls = new Set();
        const seenTitleArtist = new Set();
        
        for (const track of data.playlist) {
          const url = track.fileUrl || track.url;
          const titleArtist = `${track.title}|${track.artist}`;
          
          if (url && seenUrls.has(url)) continue;
          if (seenTitleArtist.has(titleArtist)) continue;
          
          if (url) seenUrls.add(url);
          seenTitleArtist.add(titleArtist);
          deduplicatedPlaylist.push(track);
        }
        
        setPlaylist(deduplicatedPlaylist);
        musicService.playlist = deduplicatedPlaylist;
        
        if (deduplicatedPlaylist.length !== data.playlist.length) {
          console.warn('🎵 [MusicContext] ⚠️ Removed', data.playlist.length - deduplicatedPlaylist.length, 'duplicates from received playlist');
        }
      }
    });
    
    // Controller changes
    socket.on('music-controller-changed', (data) => {
      console.log('🎵 [MusicContext] Controller changed - userId:', data.userId, 'controllerId:', data.controllerId);
      const myUserId = userRef.current?.id || userRef.current?.user_id;
      // Only compare userId (controllerId is socket ID, not user ID)
      // When controller is released, data.userId will be null
      const amController = data.userId ? (data.userId === myUserId) : false;
      console.log('🎵 [MusicContext] Am I the controller?', amController, '(my ID:', myUserId, ')');
      setIsController(amController);
      musicService.isController = amController;
    });
    
    // Music control events
    socket.on('music-play', (data) => {
      if (isControllerRef.current) return;
      console.log('🎵 [MusicContext] Remote play');
      musicService.play(data.position);
    });
    
    socket.on('music-pause', (data) => {
      if (isControllerRef.current) return;
      console.log('🎵 [MusicContext] Remote pause');
      musicService.pause();
    });
    
    socket.on('music-seek', (data) => {
      if (isControllerRef.current) return;
      console.log('🎵 [MusicContext] Remote seek:', data.position);
      musicService.seek(data.position);
    });
    
    socket.on('music-track-change', async (data) => {
      if (isControllerRef.current) return;
      console.log('🎵 [MusicContext] Remote track change:', data.track?.title);
      await musicService.loadTrack(data.track);
      if (data.autoPlay) {
        await musicService.play(data.position || 0);
      }
    });
    
    socket.on('music-change-track', async (data) => {
      if (isControllerRef.current) return;
      console.log('🎵 [MusicContext] Remote track change (legacy):', data.track?.title);
      await musicService.loadTrack(data.track);
      if (data.autoPlay) {
        await musicService.play(data.position || 0);
      }
    });
  };
  
  /**
   * Join music session
   */
  const joinMusicSession = (sessionId, groupId) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.log('🎵 [MusicContext] Cannot join - socket not connected');
      return;
    }
    
    const myUserId = userRef.current?.id || userRef.current?.user_id;
    console.log('🎵 [MusicContext] Joining music session:', {
      sessionId,
      groupId,
      userId: myUserId
    });
    
    socket.emit('join-music-session', {
      sessionId,
      groupId,
      userId: myUserId
    });
  };
  
  /**
   * Add track to playlist
   */
  const addTrack = async (track) => {
    console.log('🎵 [MusicContext] Adding track:', track.title);
    
    // Check for duplicates before adding (compare by fileUrl or title+artist)
    const isDuplicate = musicService.playlist.some(t => 
      (t.fileUrl && track.fileUrl && t.fileUrl === track.fileUrl) ||
      (t.url && track.url && t.url === track.url) ||
      (t.title === track.title && t.artist === track.artist)
    );
    
    if (isDuplicate) {
      console.warn('🎵 [MusicContext] ⚠️ Track already in playlist, skipping:', track.title);
      return false;
    }
    
    // Add to local state and music service
    musicService.addToPlaylist(track);
    const updatedPlaylist = [...musicService.playlist];
    setPlaylist(updatedPlaylist);
    
    // Persist to database
    try {
      const response = await fetch(
        `${API_URL}/api/audio/sessions/${activeSessionId}/music/playlist`,
        {
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
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('🎵 [MusicContext] Failed to persist track:', errorData);
        throw new Error(errorData.message || 'Failed to persist track');
      }
      
      console.log('🎵 [MusicContext] Track persisted to database');
      
      // Broadcast to other users
      socketRef.current?.emit('playlist-update', {
        sessionId: activeSessionId,
        playlist: updatedPlaylist
      });
      
      console.log('🎵 [MusicContext] Playlist update broadcasted');
      return true;
    } catch (error) {
      console.error('🎵 [MusicContext] Failed to add track:', error);
      throw error;
    }
  };
  
  /**
   * Remove track from playlist
   */
  const removeTrack = async (trackId) => {
    console.log('🎵 [MusicContext] Removing track:', trackId);
    musicService.removeFromPlaylist(trackId);
    setPlaylist([...musicService.playlist]);
    
    try {
      await fetch(`${API_URL}/api/audio/sessions/${activeSessionId}/playlist/${trackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Broadcast update
      socketRef.current?.emit('playlist-update', {
        sessionId: activeSessionId,
        playlist: musicService.playlist
      });
    } catch (error) {
      console.error('🎵 [MusicContext] Failed to remove track:', error);
    }
  };
  
  /**
   * Play music
   */
  const play = async () => {
    console.log('🎵 [MusicContext] Play');
    await musicService.play();
    
    if (isController) {
      const position = musicService.getCurrentTime();
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'play',
        position,
        trackId: currentTrack?.id
      });
    }
  };
  
  /**
   * Pause music
   */
  const pause = () => {
    console.log('🎵 [MusicContext] Pause');
    musicService.pause();
    
    if (isController) {
      const position = musicService.getCurrentTime();
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'pause',
        position,
        trackId: currentTrack?.id
      });
    }
  };
  
  /**
   * Seek to position
   */
  const seekTo = (position) => {
    console.log('🎵 [MusicContext] Seek to:', position);
    musicService.seek(position);
    
    if (isController) {
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'seek',
        position,
        trackId: currentTrack?.id
      });
    }
  };
  
  /**
   * Load and play specific track
   */
  const loadAndPlay = async (track) => {
    console.log('🎵 [MusicContext] Load and play:', track.title);
    await musicService.loadTrack(track);
    await musicService.play();
    
    if (isController) {
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'change-track',
        track,
        autoPlay: true,
        position: 0
      });
      
      socketRef.current?.emit('music-track-change', {
        sessionId: activeSessionId,
        track,
        autoPlay: true
      });
    }
  };
  
  /**
   * Take control (become DJ)
   */
  const takeControl = () => {
    console.log('🎵 [MusicContext] Taking control');
    setIsController(true);
    musicService.isController = true;
    
    socketRef.current?.emit('music-take-control', {
      sessionId: activeSessionId,
      userId: userRef.current?.id || userRef.current?.user_id
    });
  };
  
  /**
   * Release control
   */
  const releaseControl = () => {
    console.log('🎵 [MusicContext] Releasing control');
    setIsController(false);
    musicService.isController = false;
    
    socketRef.current?.emit('music-release-control', {
      sessionId: activeSessionId,
      userId: userRef.current?.id || userRef.current?.user_id
    });
  };
  
  /**
   * Change volume
   */
  const changeVolume = (newVolume) => {
    setVolume(newVolume);
    musicService.setVolume(newVolume);
  };
  
  /**
   * Play next track
   */
  const playNext = async () => {
    await musicService.playNext();
    
    if (isController) {
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'next',
        trackId: musicService.currentTrack?.id
      });
    }
  };
  
  /**
   * Play previous track
   */
  const playPrevious = async () => {
    await musicService.playPrevious();
    
    if (isController) {
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'previous',
        trackId: musicService.currentTrack?.id
      });
    }
  };
  
  /**
   * Toggle music feature
   */
  const toggleMusic = () => {
    const newState = !isMusicEnabled;
    setIsMusicEnabled(newState);
    
    if (!newState) {
      musicService.pause();
      musicService.cleanup();
    }
  };
  
  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      console.log('🎵 [MusicContext] Cleaning up');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);
  
  const value = {
    // State
    currentTrack,
    playlist,
    isPlaying,
    currentTime,
    duration,
    volume,
    isController,
    isMusicEnabled,
    activeSessionId,
    activeGroupId,
    
    // Actions
    initializeSession,
    addTrack,
    removeTrack,
    play,
    pause,
    seekTo,
    loadAndPlay,
    playNext,
    playPrevious,
    takeControl,
    releaseControl,
    changeVolume,
    toggleMusic
  };
  
  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
