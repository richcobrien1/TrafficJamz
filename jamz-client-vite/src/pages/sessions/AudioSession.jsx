import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  Slider,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  VolumeDown as VolumeDownIcon,
  MusicNote as MusicNoteIcon,
  Group as GroupIcon,
  ExitToApp as LeaveIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AudioSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Session state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState([]);
  
  // Audio state
  const [localStream, setLocalStream] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [inputLevel, setInputLevel] = useState(0);
  const [inputVolume, setInputVolume] = useState(1.0);
  const [outputVolume, setOutputVolume] = useState(1.0);
  const [localAudioMonitoring, setLocalAudioMonitoring] = useState(false);
  
  // Simplified Push-to-talk state
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [micButtonPressStartTime, setMicButtonPressStartTime] = useState(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimerRef = useRef(null);
  
  // Music state
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [openMusicDialog, setOpenMusicDialog] = useState(false);
  const [musicState, setMusicState] = useState({
    currentTrack: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    volume: 0.5
  });
  
  // Dialog state
  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  
  // WebRTC state
  const [socket, setSocket] = useState(null);
  const [webrtcReady, setWebrtcReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  
  // Device state
  const [audioDevices, setAudioDevices] = useState({ inputs: [], outputs: [] });
  const [selectedInputDevice, setSelectedInputDevice] = useState('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState('');
  
  // Refs
  const localStreamRef = useRef(null);
  const rtcConnectionRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const signalingRef = useRef(null); // Add ref for signaling
  
  // Initialize component
  useEffect(() => {
    let isMounted = true; // Track if component is still mounted
    
    const initializeComponent = async () => {
      try {
        console.log('AudioSession component mounting with sessionId:', sessionId);
        
        // If sessionId is missing (bad route), bail out early and don't attempt
        // to auto-join or call backend APIs. This prevents POSTs with
        // `undefined` session IDs and avoids initializing WebRTC with
        // undefined session identifiers.
        if (!sessionId) {
          console.warn('AudioSession mounted without sessionId in route params');
          if (isMounted) {
            setError('Missing session ID in URL');
            setLoading(false);
          }
          return;
        }

        console.log('Session ID validated, proceeding with initialization');

        // Initialize microphone capture automatically, but do not auto-connect
        // signaling. Users will manually connect to signaling using the UI.
        console.log('Calling handleJoinAudio...');
        await handleJoinAudio();
      } catch (error) {
        console.error('Error in handleJoinAudio:', error);
        if (isMounted) {
          setAudioError('Failed to initialize audio: ' + error.message);
        }
      }

      try {
        console.log('Calling fetchSessionDetails...');
        await fetchSessionDetails();
      } catch (error) {
        console.error('Error in fetchSessionDetails:', error);
        if (isMounted) {
          setError('Failed to fetch session details: ' + error.message);
          setLoading(false);
        }
      }
    };

    // Call the async initialization
    initializeComponent().catch(error => {
      console.error('Unhandled error in initializeComponent:', error);
      if (isMounted) {
        setError('Initialization failed: ' + error.message);
        setLoading(false);
      }
    });
    
    // Enumerate available devices
    navigator.mediaDevices?.enumerateDevices()
      .then(devices => {
        if (!isMounted) return;
        const inputs = devices.filter(device => device.kind === 'audioinput');
        const outputs = devices.filter(device => device.kind === 'audiooutput');
        setAudioDevices({ inputs, outputs });
        
        // Set defaults if available
        if (inputs.length > 0 && !selectedInputDevice) {
          setSelectedInputDevice(inputs[0].deviceId);
        }
        if (outputs.length > 0 && !selectedOutputDevice) {
          setSelectedOutputDevice(outputs[0].deviceId);
        }
      })
      .catch(error => {
        console.error('Error enumerating devices:', error);
        // Don't set error state for device enumeration failures
      });
    
    // Cleanup function for when component unmounts
    return () => {
      console.log('AudioSession component unmounting');
      isMounted = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      console.log('Session unmount occurred, leaving session.');

      leaveSession();
    };
  }, []);
  
  // Audio level monitoring
  useEffect(() => {
    if (localStream) {
      setupAudioLevelMonitoring(localStream);
    }
  }, [localStream]);
  
  // Socket connection for music events
  useEffect(() => {
    if (socket) {
      socket.on('music_play', (data) => {
        setMusicState(prev => ({
          ...prev,
          currentTrack: data.trackData,
          isPlaying: true,
          position: data.position,
          serverTimestamp: data.timestamp
        }));
        
        if (audioPlayerRef.current) {
          audioPlayerRef.current.currentTime = data.position / 1000;
          audioPlayerRef.current.play().catch(err => console.error('Error playing audio:', err));
        }
      });
      
      socket.on('music_pause', (data) => {
        setMusicState(prev => ({
          ...prev,
          isPlaying: false,
          position: data.position
        }));
        
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
      });
      
      socket.on('music_seek', (data) => {
        setMusicState(prev => ({
          ...prev,
          position: data.position
        }));
        
        if (audioPlayerRef.current) {
          audioPlayerRef.current.currentTime = data.position / 1000;
        }
      });
      
      return () => {
        socket.off('music_play');
        socket.off('music_pause');
        socket.off('music_seek');
      };
    }
  }, [socket]);
  
  // Join audio session
  const handleJoinAudio = async () => {
    console.log('Automatically joining audio session...');
    setIsJoined(true);
    
    try {
      console.log('🎤 Requesting microphone access...');
      console.log('🎤 navigator.mediaDevices available:', !!navigator.mediaDevices);
      console.log('🎤 getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      console.log('🎤 User agent:', navigator.userAgent);
      console.log('🎤 Is mobile device:', /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          deviceId: selectedInputDevice ? { exact: selectedInputDevice } : undefined
        },
        video: false
      });

      console.log('✅ Microphone access granted!');
      console.log('✅ Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
      console.log('✅ Audio tracks count:', stream.getAudioTracks().length);
      console.log('✅ Video tracks count:', stream.getVideoTracks().length);

      setLocalStream(stream);
      localStreamRef.current = stream;
      console.log('🎵 Audio stream initialized successfully');

      // Set up audio level monitoring
      setupAudioLevelMonitoring(stream);

    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);

      const errorMessage = error.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone permissions and refresh the page.'
        : error.name === 'NotFoundError'
        ? 'No microphone found. Please connect a microphone and refresh the page.'
        : `Could not access microphone: ${error.message}`;

      // Don't set audioError for mobile browsers - just log it
      if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        setAudioError(errorMessage);
      } else {
        console.warn('📱 Microphone access blocked on mobile (expected):', errorMessage);
      }
      setIsJoined(false);
    }
  };
  
  // Leave audio session
  const handleLeaveAudio = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsJoined(false);
    setIsMuted(false);
    setIsPushToTalkActive(false);
    
    // Navigate back to the previous page
    navigate(-1);
  };
  
  // Toggle microphone mute
  const toggleMute = () => {
    if (localStream) {
      const newMuteState = !isMuted;
      console.log('🔇 Toggle mute:', { currentMuted: isMuted, newMuteState });
      localStream.getAudioTracks().forEach(track => {
        console.log('🔇 Setting track enabled:', track.kind, 'from', track.enabled, 'to', !newMuteState);
        track.enabled = !newMuteState;
      });
      setIsMuted(newMuteState);
      console.log('🔇 Mute state updated to:', newMuteState);
    } else {
      console.warn('🔇 Cannot toggle mute: no local stream available');
    }
  };
  
  // New unified mic control handlers
  const handleMicButtonMouseDown = () => {
    // Record the time when the button was pressed
    const pressStartTime = Date.now();
    setMicButtonPressStartTime(pressStartTime);
    
    // Set a timer to detect long press (>1 second)
    longPressTimerRef.current = setTimeout(() => {
      // Only activate push-to-talk if the mic is currently muted
      if (isMuted) {
        setIsLongPress(true);
        handlePushToTalkStart();
      }
    }, 1000); // 1 second threshold for long press
  };

  const handleMicButtonMouseUp = () => {
    // Clear the long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    const pressDuration = Date.now() - (micButtonPressStartTime || Date.now());
    
    // If it was a long press and push-to-talk is active, deactivate it
    if (isLongPress && isPushToTalkActive) {
      handlePushToTalkEnd();
      setIsLongPress(false);
    } 
    // If it was a short press (click), toggle mute/unmute
    else if (pressDuration < 1000) {
      toggleMute();
    }
    
    setMicButtonPressStartTime(null);
  };

  // Handle mouse leave to prevent stuck states
  const handleMicButtonMouseLeave = () => {
    // If button is pressed and mouse leaves, treat as mouse up
    if (micButtonPressStartTime !== null) {
      handleMicButtonMouseUp();
    }
  };

  // Push-to-talk functionality
  const handlePushToTalkStart = () => {
    if (isMuted && localStream) {
      setIsPushToTalkActive(true);
      localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
  };

  const handlePushToTalkEnd = () => {
    if (isPushToTalkActive && localStream) {
      setIsPushToTalkActive(false);
      // Only mute if the mic was muted before push-to-talk
      if (isMuted) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
    }
  };
  
  // Audio level monitoring
  const setupAudioLevelMonitoring = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateMeter = () => {
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      
      const average = sum / bufferLength;
      setInputLevel(average / 255); // Normalize to 0-1
      
      requestAnimationFrame(updateMeter);
    };
    
    updateMeter();
    
    return () => {
      source.disconnect();
      audioContext.close();
    };
  };
  
  // Fetch session details from API
  const fetchSessionDetails = async () => {
    console.log('🚀 fetchSessionDetails start', { sessionId, user, sessionIdType: typeof sessionId, userType: typeof user });
    setLoading(true);

    if (!sessionId || !user) {
      console.error('Missing required parameters:', { sessionId, user });
      setError('Missing session ID or user information');
      setLoading(false);
      return;
    }

    let sessionData = null;

    // Helper to log axios error details
    const logAxiosError = (prefix, err) => {
      try {
        console.error(prefix, err && err.message ? err.message : err);
        if (err && err.response) {
          console.error(prefix + ' - response status:', err.response.status);
          console.error(prefix + ' - response data:', err.response.data);
        }
      } catch (e) {
        console.error('Failed to log axios error', e);
      }
    };

    // Try to GET existing session
    try {
      console.log('Checking for existing audio session for group:', sessionId);
      const response = await api.get(`/audio/sessions/group/${sessionId}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      console.log('GET session response status:', response.status);
      console.log('GET session response data:', response.data);
      
      if (response.status === 200 && response.data && response.data.session) {
        sessionData = response.data.session;
        console.log('Found existing session:', sessionData.id);
      } else {
        console.log('No existing session found (status:', response.status, ', data:', response.data, '), will create new one');
      }
    } catch (err) {
      logAxiosError('GET /audio/sessions/group failed', err);
      console.log('GET failed, will attempt to create new session. Error details:', err.response?.status, err.response?.data);
      // proceed to create
    }

    // Create session if missing
    if (!sessionData) {
      try {
        console.log('Creating new audio session for group:', sessionId);
        const createResponse = await api.post('/audio/sessions', {
          group_id: sessionId,
          session_type: 'voice_only',
          device_type: 'web'
        });

        if (createResponse && createResponse.data && createResponse.data.session) {
          sessionData = createResponse.data.session;
          console.log('Session created successfully:', sessionData.id);
        } else {
          console.error('Create session returned unexpected body', createResponse && createResponse.data);
          // Try to continue with a mock session for basic functionality
          sessionData = {
            id: `fallback-${sessionId}-${Date.now()}`,
            group_id: sessionId,
            session_type: 'voice_only',
            participants: []
          };
          console.warn('⚠️ FALLBACK: Using fallback session data due to unexpected response:', {
            id: sessionData.id,
            group_id: sessionData.group_id,
            session_type: sessionData.session_type,
            participants: sessionData.participants
          });
        }
      } catch (err) {
        logAxiosError('POST /audio/sessions failed', err);
        // Create a fallback session to allow basic functionality
        sessionData = {
          id: `fallback-${sessionId}-${Date.now()}`,
          group_id: sessionId,
          session_type: 'voice_only',
          participants: []
        };
        console.warn('⚠️ FALLBACK: Using fallback session due to creation failure:', {
          id: sessionData.id,
          group_id: sessionData.group_id,
          session_type: sessionData.session_type,
          participants: sessionData.participants,
          error: err.message
        });
      }
    }

    // Ensure we have valid session data
    console.log('🔍 DEBUG: About to check sessionData validity.');
    console.log('🔍 DEBUG: sessionData type:', typeof sessionData);
    console.log('🔍 DEBUG: sessionData value:', JSON.stringify(sessionData, null, 2));
    console.log('🔍 DEBUG: sessionData.id exists:', !!sessionData?.id);
    console.log('🔍 DEBUG: sessionData.id value:', sessionData?.id);
    console.log('🔍 DEBUG: sessionData._id exists:', !!sessionData?._id);
    console.log('🔍 DEBUG: sessionData._id value:', sessionData?._id);
    console.log('🔍 DEBUG: Boolean check result:', !sessionData || (!sessionData.id && !sessionData._id));
    if (!sessionData || (!sessionData.id && !sessionData._id)) {
      console.error('❌ ERROR: No valid session data available after all attempts.');
      console.error('❌ ERROR: sessionData details:', {
        exists: !!sessionData,
        type: typeof sessionData,
        value: sessionData,
        hasId: !!(sessionData && sessionData.id),
        idValue: sessionData?.id,
        hasUnderscoreId: !!(sessionData && sessionData._id),
        underscoreIdValue: sessionData?._id
      });
      console.error('Session creation failed completely. This should not happen with fallback logic.');
      setError('Unable to create or retrieve audio session. Please try refreshing the page.');
      setLoading(false);
      return;
    }

    // Normalize session data - map _id to id if needed
    if (sessionData._id && !sessionData.id) {
      sessionData.id = sessionData._id;
      console.log('🔄 Mapped _id to id for session:', sessionData.id);
    }

    console.log('Successfully obtained session data:', sessionData.id);

    // Join the session as a participant (best-effort)
    if (sessionData && sessionData.id) {
      try {
        console.log('Joining audio session:', sessionData.id);
        const joinResponse = await api.post(`/audio/sessions/${sessionData.id}/join`, {
          display_name: user.first_name || user.username || 'User',
          device_type: 'web'
        });

        if (!(joinResponse && joinResponse.data && joinResponse.data.success)) {
          console.warn('Join response incomplete or false', joinResponse && joinResponse.data);
        } else {
          console.log('Successfully joined audio session');
        }
      } catch (err) {
        logAxiosError('POST join session failed', err);
        // Don't fail completely if join fails - user can still connect signaling
        console.warn('Failed to join session, but continuing:', err.response?.data?.message || err.message);
      }
    } else {
      console.error('No valid session data to join');
      setError('No valid session data available');
      setLoading(false);
      return;
    }

    // Apply session state
    try {
      setSession(sessionData);

      if (sessionData.participants && Array.isArray(sessionData.participants)) {
        // Filter out participants who have left and ensure valid participant objects
        const validParticipants = sessionData.participants
          .filter(p => p && !p.left_at)
          .map(p => ({
            id: p.id || null,
            socketId: p.socketId || null,
            display_name: p.display_name || p.name || 'Unknown',
            isMuted: p.isMuted || false
          }));
        setParticipants(validParticipants);
      } else {
        setParticipants([]);
      }

      // Note: WebRTC initialization is deferred until signaling connects
    } catch (err) {
      console.error('Error applying session state:', err);
      setError('Failed to initialize session state');
    } finally {
      setLoading(false);
    }
  };
  
  // Initialize WebRTC connection
  const initializeWebRTC = async (sessionId) => {
    try {
      console.log('Initializing WebRTC for session:', sessionId);

      // Set up signaling first
      // Note: setupSignaling now is called explicitly by user action (Connect)
      // so initializeWebRTC will only prepare the RTCPeerConnection when
      // signaling is available.
      const signaling = signalingRef.current;
      if (!signaling) {
        console.warn('Signaling not connected yet, skipping WebRTC init');
        return;
      }

      // Initialize peer connection
      await setupPeerConnection(signaling);

      // Attempt mediasoup publish handshake (graceful fallback to native P2P)
      try {
        await startMediasoupPublish(signaling);
      } catch (e) {
        console.warn('Mediasoup publish failed or unavailable, fallback to native PeerConnection:', e.message || e);
      }

      setWebrtcReady(true);
      console.log('WebRTC initialization complete');
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      setError('Failed to initialize audio connection');
    }
  };  // Set up signaling for WebRTC
  const setupSignaling = (sessionId) => {
    // For mobile compatibility, connect to the current origin (Vite dev server)
    // and let the Vite proxy handle forwarding to the backend
    const socketUrl = window.location.origin;

    console.log('🔌 Setting up Socket.IO signaling connection...');
    console.log('🔌 Using Vite proxy via origin:', socketUrl);
    console.log('🔌 Vite will proxy /socket.io to backend');
    console.log('🔌 Environment variables:', {
      VITE_WS_URL: import.meta.env.VITE_WS_URL,
      VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
      window_location: window.location.origin,
      computed_socketUrl: socketUrl
    });

    const socket = io(socketUrl, {
      transports: ['polling'], // Use only polling transport for mobile compatibility
      timeout: 10000, // Increase timeout to 10 seconds
      forceNew: true, // Force new connection
      reconnection: true,
      reconnectionAttempts: 3, // Reduce reconnection attempts
      reconnectionDelay: 2000, // Increase delay
      // Explicitly set the path
      path: '/socket.io'
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connection established successfully (using polling transport)');
      console.log('✅ Socket transport used:', socket.io.engine.transport.name);
      console.log('✅ Socket ID:', socket.id);
      setConnecting(false);
      setConnected(true);

      // Join the audio session room
      socket.emit('join-audio-session', { sessionId });
      console.log('📡 Joined audio session room:', sessionId);

      // Send ready signal to let others know we're here
      socket.emit('webrtc-ready', { sessionId });
      console.log('🚀 Sent webrtc-ready signal');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
        code: error.code
      });
      setConnecting(false);
      setConnected(false);
      setError(`Failed to connect to signaling server: ${error.message}`);
    });

    socket.on('connect_timeout', () => {
      console.error('⏰ Socket.IO connection timeout');
      setConnecting(false);
      setConnected(false);
      setError('Connection to signaling server timed out. Is the backend server running?');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO connection closed:', reason);
      setConnected(false);
      setConnecting(false);
      if (reason === 'io server disconnect') {
        setError('Disconnected by server. Please try reconnecting.');
      }
    });

    // WebRTC signaling events
    socket.on('webrtc-offer', async (data) => {
      await handleOffer(data, socket);
    });

    socket.on('webrtc-answer', async (data) => {
      await handleAnswer(data, socket);
    });

    socket.on('webrtc-candidate', async (data) => {
      await handleCandidate(data, socket);
    });

    socket.on('webrtc-ready', (data) => {
      // Another participant is ready, initiate connection if we're not already connected
      if (rtcConnectionRef.current && rtcConnectionRef.current.connectionState === 'new') {
        createAndSendOffer(socket);
      }
    });

    // Participant presence events
    socket.on('participant-joined', (data) => {
      console.log('Participant joined via socket:', data);
      if (data) {
        const newParticipant = {
          id: data.userId || data.id || null,
          socketId: data.socketId || null,
          display_name: data.display_name || data.name || 'Unknown',
          isMuted: data.isMuted || false
        };
        setParticipants(prev => {
          // avoid duplicates
          const exists = prev.some(p => p && (p.socketId === newParticipant.socketId || p.id === newParticipant.id));
          if (exists) return prev;
          return [...prev, newParticipant];
        });
      }
    });

    socket.on('participant-left', (data) => {
      console.log('Participant left via socket:', data);
      if (data) {
        setParticipants(prev => prev.filter(p => p && (p.socketId !== data.socketId && p.id !== data.userId)));
      }
    });

    // Store the socket in state and ref
    setSocket(socket);
    signalingRef.current = socket;

    return socket;
  };
  
  // Handle signaling messages
  const handleSignalingMessage = async (message, signaling) => {
    console.log('Received signaling message:', message.type);

    try {
      switch (message.type) {
        case 'offer':
          await handleOffer(message, signaling);
          break;
        case 'answer':
          await handleAnswer(message, signaling);
          break;
        case 'candidate':
          await handleCandidate(message, signaling);
          break;
        case 'participant_joined':
          handleParticipantJoined(message.participant);
          break;
        case 'participant_left':
          handleParticipantLeft(message.participant_id);
          break;
        case 'ready':
          // Another participant is ready, initiate connection if we're not already connected
          if (rtcConnectionRef.current && rtcConnectionRef.current.connectionState === 'new') {
            await createAndSendOffer(signaling);
          }
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };
  
  // Set up peer connection
  const setupPeerConnection = async (signaling) => {
    console.log('Setting up peer connection...');

    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers for production if needed
        // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);
    rtcConnectionRef.current = peerConnection;

    // Add local stream to peer connection when available
    if (localStream) {
      console.log('Adding local stream to peer connection');
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        signaling.emit('webrtc-candidate', {
          candidate: event.candidate,
          sessionId: sessionId
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed:', peerConnection.connectionState);
      setConnected(peerConnection.connectionState === 'connected');
      setConnecting(peerConnection.connectionState === 'connecting');
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (event.track.kind === 'audio') {
        handleRemoteAudioStream(event.streams[0]);
      }
    };

    // Store signaling reference
    signalingRef.current = signaling;

    return peerConnection;
  };
  
  // Handle remote audio stream
  const handleRemoteAudioStream = (stream) => {
    console.log('Handling remote audio stream');

    // Create audio element for remote stream
    const audioElement = new Audio();
    audioElement.srcObject = stream;
    audioElement.volume = outputVolume;
    audioElement.autoplay = true;

    // Store the audio element
    const remoteAudios = document.getElementById('remote-audios');
    if (remoteAudios) {
      // Remove any existing audio elements for this stream
      const existingAudios = remoteAudios.querySelectorAll('audio');
      existingAudios.forEach(audio => {
        if (audio.srcObject === stream) {
          audio.remove();
        }
      });

      remoteAudios.appendChild(audioElement);
    }
  };
  
  // Create and send offer
  const createAndSendOffer = async (signaling) => {
    try {
      const peerConnection = rtcConnectionRef.current;
      if (!peerConnection) {
        console.error('No peer connection available');
        return;
      }

      console.log('Creating offer...');
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      console.log('Sending offer...');
      signaling.emit('webrtc-offer', {
        offer: peerConnection.localDescription,
        sessionId: sessionId
      });
    } catch (error) {
      console.error('Error creating/sending offer:', error);
    }
  };

  // Attempt to publish using mediasoup handshake; graceful fallback to native
  const startMediasoupPublish = async (signaling) => {
    if (!signaling) throw new Error('No signaling available');
    if (!localStream) throw new Error('No local stream');

    // Request RTP capabilities from server
    const rtpCapsResp = await new Promise((res) => signaling.emit('mediasoup-get-rtpCapabilities', { sessionId }, (r) => res(r)));
    if (!rtpCapsResp || !rtpCapsResp.success) throw new Error('mediasoup unavailable or disabled');

    // Create a mediasoup Device
    const device = new mediasoupClient.Device();
    try {
      await device.load({ routerRtpCapabilities: rtpCapsResp.rtpCapabilities });
    } catch (err) {
      console.warn('Failed to load mediasoup Device, falling back to native:', err.message);
      return nativePublishFallback(signaling);
    }

    // Create server transport
    const createResp = await new Promise((res) => signaling.emit('mediasoup-create-transport', { sessionId }, (r) => res(r)));
    if (!createResp || !createResp.success) {
      console.warn('mediasoup create transport failed, fallback to native');
      return nativePublishFallback(signaling);
    }

    const serverTransport = createResp.transport;

    // Create send transport on the client
    const sendTransport = device.createSendTransport({
      id: serverTransport.id,
      iceParameters: serverTransport.iceParameters,
      iceCandidates: serverTransport.iceCandidates,
      dtlsParameters: serverTransport.dtlsParameters
    });

    // Wire up transport events
    sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      signaling.emit('mediasoup-connect-transport', { sessionId, transportId: serverTransport.id, dtlsParameters }, (resp) => {
        if (resp && resp.success) callback(); else errback(resp && resp.error ? new Error(resp.error) : new Error('connect failed'));
      });
    });

    sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      signaling.emit('mediasoup-produce', { sessionId, transportId: serverTransport.id, kind, rtpParameters }, (resp) => {
        if (resp && resp.success) callback({ id: resp.id }); else errback(new Error(resp && resp.error ? resp.error : 'produce failed'));
      });
    });

    // Produce audio track
    const track = localStream.getAudioTracks()[0];
    if (!track) return nativePublishFallback(signaling);

    const producer = await sendTransport.produce({ track });
    console.log('Mediasoup producer created', producer.id);
    return { mode: 'mediasoup', producerId: producer.id };
  };

  // Native peer connection publish fallback: create offer and send via socket.io
  const nativePublishFallback = async (signaling) => {
    if (!rtcConnectionRef.current) await setupPeerConnection(signaling);
    const pc = rtcConnectionRef.current;
    if (!pc) throw new Error('No RTCPeerConnection available');

    // Ensure tracks are added
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return new Promise((resolve, reject) => {
      signaling.emit('webrtc-offer', { offer: pc.localDescription, sessionId }, (ack) => {
        // ack might be undefined depending on server handlers; resolve anyway
        resolve(ack || { success: true });
      });
    });
  };

  // WebRTC signaling handlers
  const handleOffer = async (data, signaling) => {
    try {
      const peerConnection = rtcConnectionRef.current;
      if (!peerConnection) {
        console.error('No peer connection available for offer');
        return;
      }

      console.log('Handling offer...');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

      console.log('Creating answer...');
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log('Sending answer...');
      signaling.emit('webrtc-answer', {
        answer: peerConnection.localDescription,
        sessionId: sessionId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (data, signaling) => {
    try {
      const peerConnection = rtcConnectionRef.current;
      if (!peerConnection) {
        console.error('No peer connection available for answer');
        return;
      }

      console.log('Handling answer...');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleCandidate = async (data, signaling) => {
    try {
      const peerConnection = rtcConnectionRef.current;
      if (!peerConnection) {
        console.error('No peer connection available for candidate');
        return;
      }

      console.log('Adding ICE candidate...');
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };
  
  const handleParticipantJoined = (participant) => {
    console.log('Participant joined:', participant);
    setParticipants(prev => [...prev, participant]);

    // If we have a peer connection ready and this isn't us joining, initiate connection
    if (rtcConnectionRef.current && signalingRef.current && participant.id !== user?.id) {
      console.log('Initiating WebRTC connection with new participant');
      // Send ready signal to trigger connection establishment
      signalingRef.current.emit('webrtc-ready', { sessionId });
    }
  };
  
  const handleParticipantLeft = (participantId) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
  };
  
  // Leave session
  const leaveSession = async () => {
    try {
      if (session) {
        await api.post(`/audio/sessions/${session.id}/leave`, {
          user_id: user.id
        });
      }
      
      // Close WebRTC connection
      if (rtcConnectionRef.current) {
        rtcConnectionRef.current.close();
      }
      
      // Close signaling connection
      if (signalingRef.current) {
        signalingRef.current.emit('leave-audio-session', { sessionId: session?.id || sessionId });
        signalingRef.current.disconnect();
      }
      
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  };
  
  // Render component
  console.log('AudioSession render called', {
    loading,
    error,
    audioError,
    session: !!session,
    isJoined,
    localStream: !!localStream,
    localStreamTracks: localStream ? localStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })) : null,
    connected,
    connecting
  });

  // Defensive checks for required dependencies
  if (typeof Container === 'undefined' || typeof Typography === 'undefined') {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h4>Render Error</h4>
        <p>Material-UI components not available</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  // Ensure critical state variables are properly initialized
  const safeParticipants = Array.isArray(participants) ? participants : [];
  const safeSession = session || {};
  const safeUser = user || {};

  return (
      <Container maxWidth="md">
        {/* Traffic Jam App Bar */}
        <AppBar position="static" color="primary" sx={{ mb: 2 }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Traffic Jam - Audio Session
            </Typography>
            <IconButton color="inherit" onClick={() => setOpenLeaveDialog(true)}>
              <LeaveIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {audioError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {audioError}
          </Alert>
        )}
        
        {/* Only show Leave button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleLeaveAudio}
            disabled={!isJoined}
            sx={{ mr: 2 }}
          >
            Leave Audio
          </Button>

          {connected ? (
            <Button variant="contained" color="error" onClick={() => {
              // Disconnect signaling
              if (signalingRef.current) {
                signalingRef.current.emit('leave-audio-session', { sessionId: safeSession?.id || sessionId });
                signalingRef.current.disconnect();
                setSocket(null);
                signalingRef.current = null;
                setConnected(false);
              }
            }}>
              Disconnect Signaling
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => {
                try {
                  console.log('🔘 Connect Signaling button clicked');
                  setConnecting(true);
                  setError(null); // Clear any previous errors
                  
                  // Connect signaling
                  const s = setupSignaling(safeSession?.id || sessionId);
                  console.log('📡 Signaling setup initiated, socket object:', s);
                  
                  // once connected, try to initialize WebRTC
                  s.on('connect', () => {
                    console.log('🎯 Socket connected, initializing WebRTC...');
                    initializeWebRTC(safeSession?.id || sessionId);
                  });
                } catch (err) {
                  console.error('❌ Error setting up signaling:', err);
                  setConnecting(false);
                  setError(`Failed to setup signaling: ${err.message}`);
                }
              }}
              disabled={!safeSession || !safeSession.id || connecting}
            >
              {connecting ? 'Connecting...' : 'Connect Signaling'}
            </Button>
          )}
        </Box>
        
        {/* Show loading or audio controls based on localStream */}
        {!localStream ? (
          <Box sx={{ 
            p: 3, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            borderRadius: 1
          }}>
            <CircularProgress size={24} sx={{ mb: 2 }} />
            <Typography variant="body2">
              Initializing audio... Please grant microphone permissions if prompted.
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Simplified Mic controls */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Mic Controls
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Tooltip title={
                    isPushToTalkActive 
                      ? "Push-to-Talk Active" 
                      : isMuted 
                        ? "Unmute Microphone (tap) or Push-to-Talk (hold)" 
                        : "Mute Microphone"
                  }>
                    <IconButton 
                      color={isPushToTalkActive ? "secondary" : isMuted ? "default" : "primary"} 
                      onMouseDown={handleMicButtonMouseDown}
                      onMouseUp={handleMicButtonMouseUp}
                      onMouseLeave={handleMicButtonMouseLeave}
                      onTouchStart={handleMicButtonMouseDown}
                      onTouchEnd={handleMicButtonMouseUp}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                      sx={{ 
                        width: 56, 
                        height: 56,
                        transition: 'all 0.2s ease-in-out',
                        transform: isPushToTalkActive ? 'scale(1.2)' : 'scale(1)',
                        boxShadow: isPushToTalkActive ? '0 0 10px rgba(255,0,0,0.5)' : 'none'
                      }}
                    >
                      {isPushToTalkActive ? <MicIcon /> : isMuted ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                  </Tooltip>
                </Grid>
                
                <Grid item xs>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ 
                      height: 8, 
                      bgcolor: 'grey.200', 
                      borderRadius: 1, 
                      overflow: 'hidden' 
                    }}>
                      <Box sx={{ 
                        width: `${inputLevel * 100}%`, 
                        height: '100%', 
                        bgcolor: inputLevel > 0.5 ? 'success.main' : 'primary.main',
                        transition: 'width 0.1s ease-in-out'
                      }} />
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item>
                  <Typography variant="caption" color="textSecondary">
                    {isPushToTalkActive 
                      ? "Speaking (Push-to-Talk)" 
                      : isMuted 
                        ? "Muted (Tap to unmute, hold for Push-to-Talk)" 
                        : "Unmuted (Tap to mute)"}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Speaker Controls */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Speaker Settings
              </Typography>

              {/* Local Audio Monitoring Toggle */}
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localAudioMonitoring}
                      onChange={(e) => setLocalAudioMonitoring(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Monitor Local Audio (hear yourself)"
                />
                <Typography variant="caption" color="textSecondary">
                  Enable to test microphone input (low volume to avoid feedback)
                </Typography>
              </Box>
              
             {/* Volume Controls */}
              <Box sx={{ mb: 3, width: '100%' }}>
                <Typography id="voice-volume-slider" gutterBottom>
                  Voice Volume
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <VolumeDownIcon />
                  <Box sx={{ flexGrow: 1 }}>
                    <Slider
                      value={outputVolume}
                      onChange={(e, newValue) => setOutputVolume(newValue)}
                      aria-labelledby="voice-volume-slider"
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                      sx={{ 
                        width: '100%',
                        '& .MuiSlider-rail': { height: 4 },
                        '& .MuiSlider-track': { height: 4 }
                      }}
                    />
                  </Box>
                  <VolumeUpIcon />
                </Box>
              </Box>

              <Box sx={{ width: '100%' }}>
                <Typography id="music-volume-slider" gutterBottom>
                  Music Volume
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <VolumeDownIcon />
                  <Box sx={{ flexGrow: 1 }}>
                    <Slider
                      value={musicVolume}
                      onChange={(e, newValue) => setMusicVolume(newValue)}
                      aria-labelledby="music-volume-slider"
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                      sx={{ 
                        width: '100%',
                        '& .MuiSlider-rail': { height: 4 },
                        '& .MuiSlider-track': { height: 4 }
                      }}
                    />
                  </Box>
                  <VolumeUpIcon />
                </Box>
              </Box>
            </Paper>
            
            {/* Hidden container for remote audio elements */}
            <div id="remote-audios" style={{ display: 'none' }}></div>

            {/* Local audio monitoring for testing */}
            {localStream && localAudioMonitoring && (
              <audio
                ref={(audio) => {
                  if (audio && localStream) {
                    audio.srcObject = localStream;
                    audio.volume = 0.1; // Low volume to avoid feedback
                    audio.muted = false;
                  }
                }}
                style={{ display: 'none' }}
                autoPlay
                muted={false}
              />
            )}

            {/* Participant list */}
            <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
              <Typography variant="subtitle1">Participants</Typography>
              <List dense>
                {safeParticipants && safeParticipants.length > 0 ? safeParticipants
                  .filter(p => p) // Filter out any null/undefined participants
                  .map((p, idx) => (
                    <React.Fragment key={p.socketId || p.id || `participant-${idx}`}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <GroupIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={p.display_name || p.name || p.id || p.socketId || 'Unknown'} 
                          secondary={p.socketId ? `socket:${p.socketId}` : (p.id ? `id:${p.id}` : '')} 
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  )) : (
                  <ListItem>
                    <ListItemText primary="No participants yet" />
                  </ListItem>
                )}
              </List>
            </Paper>
          </Box>
        )}
      </Paper>
      
      {/* Leave Dialog */}
      <Dialog
        open={openLeaveDialog}
        onClose={() => setOpenLeaveDialog(false)}
      >
        <DialogTitle>Leave Traffic Jam Session?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to leave this audio session? You will need to rejoin to continue communicating.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLeaveDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setOpenLeaveDialog(false);
              handleLeaveAudio();
            }} 
            color="secondary"
            disabled={leaveLoading}
          >
            {leaveLoading ? <CircularProgress size={24} /> : 'Leave'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AudioSession;
