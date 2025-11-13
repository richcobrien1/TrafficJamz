import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import musicService from '../services/music.service';
import { useAuth } from './AuthContext';
import { 
  loadPlaylistFromCache, 
  savePlaylistToCache, 
  clearPlaylistCache,
  addTrackToCache 
} from '../utils/playlistCache';

const MusicContext = createContext();

const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://trafficjamz.v2u.us';

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
    
    // Load playlist from cache immediately for instant display
    const cachedPlaylist = loadPlaylistFromCache(sessionId);
    if (cachedPlaylist && cachedPlaylist.length > 0) {
      console.log('⚡ [MusicContext] Loaded playlist from cache immediately:', cachedPlaylist.length, 'tracks');
      setPlaylist(cachedPlaylist);
      musicService.playlist = cachedPlaylist;
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
    
    // Music session state (comprehensive state on join/rejoin)
    socket.on('music-session-state', (data) => {
      console.log('🎵 [MusicContext] ========================================');
      console.log('🎵 [MusicContext] MUSIC SESSION STATE RECEIVED');
      console.log('🎵 [MusicContext] ========================================');
      console.log('🎵 Playlist tracks:', data.playlist?.length || 0);
      console.log('🎵 Current track:', data.currently_playing?.title || 'none');
      console.log('🎵 Controller:', data.controller_id || 'none');
      console.log('🎵 Is playing:', data.is_playing || false);
      console.log('🎵 Position:', data.position || 0);
      console.log('🎵 Reason:', data.reason || 'initial-join');
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
        
        // Save to cache for instant loading next time
        if (activeSessionId) {
          savePlaylistToCache(activeSessionId, deduplicatedPlaylist);
        }
        
        console.log('🎵 [MusicContext] ✅ Playlist state updated successfully with', deduplicatedPlaylist.length, 'tracks');
      } else {
        console.warn('🎵 [MusicContext] ⚠️ No valid playlist in music-session-state event');
      }
      
      // Update controller status - use loose equality to handle string/number mismatch
      // BUT: Must check both values exist first to avoid null == undefined → true bug!
      console.log('🎵 [MusicContext] ⚠️ CRITICAL DEBUG - controller_id:', data.controller_id, '(type:', typeof data.controller_id, '), myUserId:', myUserId, '(type:', typeof myUserId, ')');
      console.log('🎵 [MusicContext] ⚠️ CRITICAL DEBUG - userRef.current:', userRef.current);
      
      // CRITICAL FIX: If user not loaded, MUST default to false
      if (!myUserId) {
        console.warn('🎵 [MusicContext] ⚠️ User ID not available - FORCING isController to FALSE');
        setIsController(false);
        musicService.isController = false;
      } else {
        const amController = data.controller_id != null && data.controller_id == myUserId;
        console.log('🎵 [MusicContext] Controller comparison:', { controller_id: data.controller_id, myUserId, result: amController });
        setIsController(amController);
        musicService.isController = amController;
        
        if (amController) {
          console.log('🎵 [MusicContext] ✅✅✅ I AM THE DJ (restored after reconnect) ✅✅✅');
        } else {
          console.log('🎵 [MusicContext] 👂 I am a listener');
        }
      }
      
      // Update currently playing track
      if (data.currently_playing) {
        console.log('🎵 [MusicContext] Loading current track:', data.currently_playing.title);
        setCurrentTrack(data.currently_playing);
        
        musicService.loadTrack(data.currently_playing).then(() => {
          // Get the CURRENT ref values (state might not be updated yet)
          const amController = isControllerRef.current;
          const shouldSync = data.is_playing && !amController;
          
          console.log('🎵 [MusicContext] Track loaded. Playback decision:');
          console.log('  - Am I controller?', amController);
          console.log('  - Is DJ playing?', data.is_playing);
          console.log('  - Should I sync playback?', shouldSync);
          
          if (shouldSync) {
            // Listener rejoining - sync to current playback position
            const position = data.position || data.currently_playing.position || 0;
            console.log('🎵 [MusicContext] 🔄 LISTENER SYNC: Playing from position:', position);
            
            // Account for time since DJ started this position
            let syncPosition = position;
            if (data.timestamp && data.currently_playing.started_at) {
              const serverTime = new Date(data.currently_playing.started_at).getTime();
              const now = Date.now();
              const elapsed = (now - serverTime) / 1000; // seconds since track started
              syncPosition = position + elapsed;
              console.log('🎵 [MusicContext] Time-corrected position:', syncPosition.toFixed(2), 's (elapsed:', elapsed.toFixed(2), 's)');
            }
            
            musicService.play(syncPosition);
            setIsPlaying(true);
          } else if (amController && data.is_playing) {
            // DJ rejoining while music was playing - resume playback
            const position = data.position || data.currently_playing.position || 0;
            console.log('🎵 [MusicContext] 🎵 DJ RESUME: Resuming playback from position:', position);
            musicService.play(position);
            setIsPlaying(true);
          } else {
            console.log('🎵 [MusicContext] ⏸️ Track loaded but not playing (DJ paused or controller mode)');
            setIsPlaying(false);
          }
        });
      } else {
        console.log('🎵 [MusicContext] ⚠️ No current track in session state');
        setCurrentTrack(null);
        setIsPlaying(false);
      }
    });
    
    // Playlist updates
    socket.on('playlist-update', (data) => {
      console.log('🎵 [MusicContext] Playlist update received:', data.playlist?.length || 0, 'tracks');
      console.log('🎵 [MusicContext] Tracks with albumArt:', data.playlist?.filter(t => t.albumArt).length || 0);
      if (data.playlist && Array.isArray(data.playlist)) {
        // Deduplicate and normalize received playlist
        const deduplicatedPlaylist = [];
        const seenUrls = new Set();
        const seenTitleArtist = new Set();
        
        for (const track of data.playlist) {
          // Normalize track URLs - ensure url field is set for all tracks
          const normalizedTrack = {
            ...track,
            url: track.url || track.fileUrl || track.spotifyPreviewUrl,
            previewUrl: track.previewUrl || track.spotifyPreviewUrl
          };
          
          const url = normalizedTrack.url;
          const titleArtist = `${track.title}|${track.artist}`;
          
          if (url && seenUrls.has(url)) continue;
          if (seenTitleArtist.has(titleArtist)) continue;
          
          if (url) seenUrls.add(url);
          seenTitleArtist.add(titleArtist);
          deduplicatedPlaylist.push(normalizedTrack);
        }
        
        setPlaylist(deduplicatedPlaylist);
        musicService.playlist = deduplicatedPlaylist;
        console.log('🎵 [MusicContext] Playlist state updated. Tracks with albumArt:', deduplicatedPlaylist.filter(t => t.albumArt).length);
        
        // Save to cache
        if (activeSessionId) {
          savePlaylistToCache(activeSessionId, deduplicatedPlaylist);
        }
        
        if (deduplicatedPlaylist.length !== data.playlist.length) {
          console.warn('🎵 [MusicContext] ⚠️ Removed', data.playlist.length - deduplicatedPlaylist.length, 'duplicates from received playlist');
        }
      }
    });
    
    // Controller changes
    socket.on('music-controller-changed', (data) => {
      console.log('🎵 [MusicContext] Controller changed event - userId:', data.userId, '(type:', typeof data.userId, '), controllerId:', data.controllerId);
      const myUserId = userRef.current?.id || userRef.current?.user_id;
      console.log('🎵 [MusicContext] ⚠️ CRITICAL DEBUG - myUserId:', myUserId, 'userRef:', userRef.current);
      
      // CRITICAL FIX: If user not loaded, MUST default to false
      if (!myUserId) {
        console.warn('🎵 [MusicContext] ⚠️ User ID not available - FORCING isController to FALSE');
        setIsController(false);
        musicService.isController = false;
      } else {
        // Only compare userId (controllerId is socket ID, not user ID)
        // When controller is released, data.userId will be null
        const amController = data.userId != null && data.userId == myUserId;
        console.log('🎵 [MusicContext] Am I the controller?', amController ? '✅ YES (DJ)' : '❌ NO (Listener)', '- My ID:', myUserId, '(type:', typeof myUserId, ')');
        setIsController(amController);
        musicService.isController = amController;
      }
    });
    
    // Music control events
    socket.on('music-play', async (data) => {
      console.log('🎵 [MusicContext] music-play event received:', {
        isController: isControllerRef.current,
        hasTrack: !!musicService.currentTrack,
        dataTrack: !!data.track,
        position: data.position,
        timestamp: data.timestamp,
        from: data.from
      });
      
      if (isControllerRef.current) {
        console.log('🎵 [MusicContext] Ignoring music-play - this device is the controller');
        return;
      }
      
      // Calculate sync position accounting for network latency
      let syncPosition = data.position || 0;
      if (data.timestamp) {
        const networkDelay = (Date.now() - data.timestamp) / 1000; // Convert to seconds
        syncPosition = syncPosition + networkDelay;
        console.log('🎵 [MusicContext] Remote play - base position:', data.position, 'network delay:', networkDelay.toFixed(3), 's, synced position:', syncPosition.toFixed(3));
      } else {
        console.log('🎵 [MusicContext] Remote play - position:', data.position, '(no timestamp for sync)');
      }
      
      // Ensure track is loaded before playing
      if (!musicService.currentTrack && data.track) {
        console.log('🎵 [MusicContext] Loading track before play:', data.track.title);
        await musicService.loadTrack(data.track);
      } else if (!musicService.currentTrack) {
        console.warn('🎵 [MusicContext] ⚠️ No track loaded and no track data in event');
        return;
      }
      
      console.log('🎵 [MusicContext] Calling musicService.play with position:', syncPosition);
      await musicService.play(syncPosition);
      console.log('🎵 [MusicContext] musicService.play completed');
    });
    
    socket.on('music-pause', (data) => {
      if (isControllerRef.current) return;
      
      // Sync to exact pause position if provided
      if (data.position !== undefined) {
        console.log('🎵 [MusicContext] Remote pause at position:', data.position);
        musicService.seek(data.position);
      } else {
        console.log('🎵 [MusicContext] Remote pause (no position sync)');
      }
      musicService.pause();
    });
    
    socket.on('music-seek', async (data) => {
      if (isControllerRef.current) return;
      console.log('🎵 [MusicContext] Remote seek:', data.position, 'playing:', data.isPlaying);
      
      musicService.seek(data.position);
      
      // If DJ was playing when they seeked, resume playing
      if (data.isPlaying) {
        console.log('🎵 [MusicContext] Resuming play after seek');
        await musicService.play();
      }
    });
    
    // Position sync updates (from DJ every 5 seconds)
    socket.on('music-position-sync', async (data) => {
      if (isControllerRef.current) return;
      
      // Only sync if we're playing and not too far off
      if (musicService.isPlaying) {
        const currentPos = await musicService.getCurrentTime();
        const targetPos = data.position || 0;
        const drift = Math.abs(currentPos - targetPos);
        
        // Sync threshold from music service (default 2 seconds)
        const syncThreshold = musicService.syncThreshold || 2.0;
        
        if (drift > syncThreshold) {
          console.log('🎵 [MusicContext] Position drift detected:', drift.toFixed(2), 's - syncing to:', targetPos.toFixed(2));
          musicService.seek(targetPos);
        } else {
          console.log('🎵 [MusicContext] Position in sync - drift:', drift.toFixed(3), 's');
        }
      }
    });
    
    socket.on('music-track-change', async (data) => {
      if (isControllerRef.current) return;
      console.log('🎵 [MusicContext] ========================================');
      console.log('🎵 [MusicContext] REMOTE TRACK CHANGE RECEIVED');
      console.log('🎵 [MusicContext] ========================================');
      console.log('🎵 Track:', data.track?.title);
      console.log('🎵 Auto-play:', data.autoPlay);
      console.log('🎵 Position:', data.position);
      console.log('🎵 From:', data.from);
      console.log('🎵 [MusicContext] ========================================');
      
      if (!data.track || !data.track.title) {
        console.error('🎵 [MusicContext] ❌ Invalid track data in music-track-change');
        return;
      }
      
      // Update local state
      setCurrentTrack(data.track);
      
      // Load track in music service
      await musicService.loadTrack(data.track);
      console.log('🎵 [MusicContext] ✅ Track loaded:', data.track.title);
      
      // Auto-play if DJ was playing
      if (data.autoPlay) {
        const position = data.position || 0;
        console.log('🎵 [MusicContext] ▶️ Auto-playing from position:', position);
        await musicService.play(position);
        console.log('🎵 [MusicContext] ✅ Playback started');
      } else {
        console.log('🎵 [MusicContext] ⏸️ Track loaded but not auto-playing');
      }
    });
    
    socket.on('music-change-track', async (data) => {
      if (isControllerRef.current) return;
      console.log('🎵 [MusicContext] Remote track change (legacy event):', data.track?.title || data.title);
      
      // Handle both data.track and data being the track itself
      const track = data.track || data;
      
      if (!track || !track.title) {
        console.error('🎵 [MusicContext] ❌ Invalid track data in music-change-track:', data);
        return;
      }
      
      // Update local state
      setCurrentTrack(track);
      
      await musicService.loadTrack(track);
      if (data.autoPlay) {
        await musicService.play(data.position || 0);
      }
    });
    
    // Handle next/previous track events (legacy - now handled by music-track-change)
    socket.on('music-next', async (data) => {
      if (isControllerRef.current) return;
      console.log('🎵 [MusicContext] Remote next track event (legacy)');
      // Just play next in local playlist
      await musicService.playNext();
    });
    
    socket.on('music-previous', async (data) => {
      if (isControllerRef.current) return;
      console.log('🎵 [MusicContext] Remote previous track event (legacy)');
      // Just play previous in local playlist
      await musicService.playPrevious();
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
    console.log('🎵 [MusicContext] Adding track:', track.title, 'hasAlbumArt:', !!track.albumArt, 'albumArtLength:', track.albumArt?.length);
    
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
    
    // Save to cache immediately (optimistic update)
    if (activeSessionId) {
      savePlaylistToCache(activeSessionId, updatedPlaylist);
      console.log('⚡ [MusicContext] Cached playlist updated instantly');
    }
    
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
            source: track.source,
            spotifyId: track.spotifyId,
            spotifyPreviewUrl: track.spotifyPreviewUrl || track.previewUrl,
            albumArt: track.albumArt,
            uploadedBy: track.uploadedBy
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('🎵 [MusicContext] Failed to persist track:', errorData);
        console.error('🎵 [MusicContext] Validation errors:', errorData.errors);
        console.error('🎵 [MusicContext] Track data sent:', {
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration,
          fileUrl: track.fileUrl || track.url,
          source: track.source,
          spotifyId: track.spotifyId,
          spotifyPreviewUrl: track.spotifyPreviewUrl || track.previewUrl,
          albumArt: track.albumArt,
          uploadedBy: track.uploadedBy
        });
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
   * Clear entire playlist
   */
  const clearPlaylist = async () => {
    console.log('🎵 [MusicContext] Clearing entire playlist');
    
    // Stop playback if playing
    if (isPlaying) {
      musicService.pause();
      setIsPlaying(false);
    }
    
    // Clear current track
    setCurrentTrack(null);
    musicService.currentTrack = null;
    
    // Clear playlist
    musicService.playlist = [];
    setPlaylist([]);
    
    // Clear cache
    if (activeSessionId) {
      clearPlaylistCache(activeSessionId);
      console.log('🗑️ [MusicContext] Cache cleared');
    }
    
    try {
      const response = await fetch(
        `${API_URL}/api/audio/sessions/${activeSessionId}/music/playlist/clear`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to clear playlist on server');
      }
      
      console.log('🎵 [MusicContext] ✅ Playlist cleared from database');
      
      // Broadcast update
      socketRef.current?.emit('playlist-update', {
        sessionId: activeSessionId,
        playlist: []
      });
      
      // Broadcast track change to null
      socketRef.current?.emit('music-change-track', {
        sessionId: activeSessionId,
        track: null,
        autoPlay: false
      });
      
      console.log('🎵 [MusicContext] ✅ Playlist cleared and broadcasted');
    } catch (error) {
      console.error('🎵 [MusicContext] Failed to clear playlist:', error);
      throw error;
    }
  };
  
  /**
   * Play music
   */
  const play = async () => {
    console.log('🎵 [MusicContext] Play');
    
    // If no track is loaded, auto-load the first track in playlist
    if (!currentTrack && playlist.length > 0) {
      console.log('🎵 [MusicContext] No track loaded - auto-loading first track');
      await loadAndPlay(playlist[0]);
      return;
    }
    
    // If still no track (empty playlist), do nothing
    if (!currentTrack) {
      console.warn('🎵 [MusicContext] Cannot play - no track loaded and playlist is empty');
      return;
    }
    
    await musicService.play();
    
    if (isController) {
      const position = await musicService.getCurrentTime();
      const timestamp = Date.now();
      
      console.log('🎵 [MusicContext] Broadcasting play - position:', position, 'timestamp:', timestamp);
      
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'play',
        position,
        timestamp,
        track: currentTrack, // Include full track data for sync
        trackId: currentTrack?.id
      });
    }
  };
  
  /**
   * Pause music
   */
  const pause = async () => {
    console.log('🎵 [MusicContext] Pause');
    musicService.pause();
    
    if (isController) {
      const position = await musicService.getCurrentTime();
      const timestamp = Date.now();
      
      console.log('🎵 [MusicContext] Broadcasting pause - position:', position);
      
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'pause',
        position,
        timestamp,
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
      const timestamp = Date.now();
      const isPlaying = musicService.isPlaying;
      
      console.log('🎵 [MusicContext] Broadcasting seek - position:', position, 'playing:', isPlaying);
      
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'seek',
        position,
        timestamp,
        isPlaying, // Let listeners know if they should resume playing after seek
        trackId: currentTrack?.id
      });
    }
  };
  
  /**
   * Load and play specific track
   */
  const loadAndPlay = async (track) => {
    try {
      console.log('🎵 [MusicContext] Load and play:', {
        title: track.title,
        url: track.url || track.fileUrl,
        hasUrl: !!(track.url || track.fileUrl),
        isController,
        socketConnected: socketRef.current?.connected
      });
      
      if (!track.url && !track.fileUrl) {
        console.error('🎵 [MusicContext] ❌ Track has no URL:', track);
        alert(`Cannot play "${track.title}" - file URL is missing`);
        return;
      }
      
      await musicService.loadTrack(track);
      console.log('🎵 [MusicContext] ✅ Track loaded, now playing...');
      
      await musicService.play();
      console.log('🎵 [MusicContext] ✅ Playback started');
      
      if (isController) {
        console.log('🎵 [MusicContext] Broadcasting track change to listeners...');
        
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
    } catch (error) {
      console.error('🎵 [MusicContext] ❌ Error in loadAndPlay:', error);
      alert(`Failed to play "${track.title}": ${error.message}`);
    }
  };
  
  /**
   * Take control (become DJ)
   */
  const takeControl = () => {
    console.log('🎵 [MusicContext] Taking control');
    
    // Validation checks
    if (!socketRef.current) {
      console.error('🎵 [MusicContext] ❌ Cannot take control - socket not initialized');
      alert('Music system not connected. Please reload the page.');
      return;
    }
    
    if (!socketRef.current.connected) {
      console.error('🎵 [MusicContext] ❌ Cannot take control - socket not connected');
      alert('Music system not connected. Please check your connection.');
      return;
    }
    
    if (!activeSessionId) {
      console.error('🎵 [MusicContext] ❌ Cannot take control - no active session');
      alert('No active music session. Please reload the page.');
      return;
    }
    
    const userId = userRef.current?.id || userRef.current?.user_id;
    if (!userId) {
      console.error('🎵 [MusicContext] ❌ Cannot take control - user ID not available');
      alert('User not authenticated. Please log in again.');
      return;
    }
    
    console.log('🎵 [MusicContext] ✅ All checks passed - emitting music-take-control', {
      sessionId: activeSessionId,
      userId,
      socketConnected: socketRef.current.connected
    });
    
    setIsController(true);
    musicService.isController = true;
    
    socketRef.current.emit('music-take-control', {
      sessionId: activeSessionId,
      userId
    });
  };
  
  /**
   * Release control
   */
  const releaseControl = () => {
    console.log('🎵 [MusicContext] Releasing control');
    
    // Validation checks
    if (!socketRef.current?.connected) {
      console.error('🎵 [MusicContext] ❌ Cannot release control - socket not connected');
      return;
    }
    
    if (!activeSessionId) {
      console.error('🎵 [MusicContext] ❌ Cannot release control - no active session');
      return;
    }
    
    const userId = userRef.current?.id || userRef.current?.user_id;
    console.log('🎵 [MusicContext] ✅ Releasing control', {
      sessionId: activeSessionId,
      userId
    });
    
    setIsController(false);
    musicService.isController = false;
    
    socketRef.current.emit('music-release-control', {
      sessionId: activeSessionId,
      userId
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
    
    // Explicitly update local state to ensure UI reflects the change
    if (musicService.currentTrack) {
      const trackWithArt = { ...musicService.currentTrack };
      console.log('🎵 [MusicContext] Next track loaded:', trackWithArt.title, 'hasAlbumArt:', !!trackWithArt.albumArt, 'albumArtLength:', trackWithArt.albumArt?.length);
      setCurrentTrack(trackWithArt);
    }
    
    if (isController && musicService.currentTrack) {
      console.log('🎵 [MusicContext] Broadcasting next track:', musicService.currentTrack.title);
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'next',
        track: musicService.currentTrack, // Send full track data
        trackId: musicService.currentTrack.id,
        position: 0,
        timestamp: Date.now()
      });
    }
  };
  
  /**
   * Play previous track
   */
  const playPrevious = async () => {
    await musicService.playPrevious();
    
    // Explicitly update local state to ensure UI reflects the change
    if (musicService.currentTrack) {
      const trackWithArt = { ...musicService.currentTrack };
      console.log('🎵 [MusicContext] Previous track loaded:', trackWithArt.title, 'hasAlbumArt:', !!trackWithArt.albumArt, 'albumArtLength:', trackWithArt.albumArt?.length);
      setCurrentTrack(trackWithArt);
    }
    
    if (isController && musicService.currentTrack) {
      console.log('🎵 [MusicContext] Broadcasting previous track:', musicService.currentTrack.title);
      socketRef.current?.emit('music-control', {
        sessionId: activeSessionId,
        action: 'previous',
        track: musicService.currentTrack, // Send full track data
        trackId: musicService.currentTrack.id,
        position: 0,
        timestamp: Date.now()
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
   * Periodic position sync for DJ (broadcasts position every 5 seconds during playback)
   */
  useEffect(() => {
    let syncInterval;
    
    if (isController && isPlaying && currentTrack) {
      console.log('🎵 [MusicContext] Starting position sync broadcast (every 5s)');
      
      syncInterval = setInterval(async () => {
        const position = await musicService.getCurrentTime();
        const timestamp = Date.now();
        
        console.log('🎵 [MusicContext] Broadcasting position sync:', position.toFixed(2));
        
        socketRef.current?.emit('music-position-sync', {
          sessionId: activeSessionId,
          position,
          timestamp,
          trackId: currentTrack?.id
        });
      }, 5000); // Sync every 5 seconds
    }
    
    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [isController, isPlaying, currentTrack, activeSessionId]);
  
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
  
  /**
   * Refresh playlist from backend
   */
  const refreshPlaylist = async () => {
    if (!activeSessionId) {
      console.warn('🎵 [MusicContext] Cannot refresh playlist - no active session');
      return;
    }
    
    try {
      console.log('🎵 [MusicContext] Refreshing playlist from backend...');
      const response = await fetch(
        `${API_URL}/api/audio/sessions/${activeSessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      
      const data = await response.json();
      const freshPlaylist = data.session?.music?.playlist || [];
      
      console.log('🎵 [MusicContext] Playlist refreshed:', freshPlaylist.length, 'tracks');
      console.log('🎵 [MusicContext] Tracks with albumArt:', freshPlaylist.filter(t => t.albumArt).length);
      setPlaylist(freshPlaylist);
      
      // Update cache
      if (activeSessionId) {
        savePlaylistToCache(activeSessionId, freshPlaylist);
      }
      
      return freshPlaylist;
    } catch (error) {
      console.error('🎵 [MusicContext] Failed to refresh playlist:', error);
      throw error;
    }
  };
  
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
    sessionId: activeSessionId, // Alias for backward compatibility
    activeSessionId,
    activeGroupId,
    
    // Actions
    initializeSession,
    addTrack,
    removeTrack,
    clearPlaylist,
    refreshPlaylist,
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
