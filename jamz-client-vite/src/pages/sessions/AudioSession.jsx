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
  Switch,
  Chip
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
import { useMusic } from '../../contexts/MusicContext';
import MusicUpload from '../../components/music/MusicUpload';
import MusicPlaylist from '../../components/music/MusicPlaylist';
import MusicPlayer from '../../components/music/MusicPlayer';

const AudioSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Better mobile detection - avoid false positives from devtools responsive mode
  const isMobile = (() => {
    // Check for actual mobile device characteristics
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    // Additional check: if we're in a desktop browser but devtools responsive mode
    // is making it look small, check if the device actually has a small screen
    const actualScreenWidth = screen.width;
    const isActuallySmallDevice = actualScreenWidth <= 768;


    // Consider it mobile if it's actually a small device OR explicitly iOS/Android
    const result = isActuallySmallDevice || isIOSDevice || isAndroid;
    return result;
  })();

  // iOS Safari specifically requires user gesture for media access
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) &&
                /Safari/.test(navigator.userAgent) &&
                !/Chrome|CriOS|FxiOS|Opera/.test(navigator.userAgent);

  // State for microphone initialization
  const [micInitialized, setMicInitialized] = useState(false);
  const [micInitializing, setMicInitializing] = useState(false);
  const [requiresUserGesture, setRequiresUserGesture] = useState(true); // Always require user gesture for simplicity
  
  // Session state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState([]);
  
  // Music context - centralized state management
  const {
    currentTrack,
    playlist,
    isPlaying: musicIsPlaying,
    currentTime: musicCurrentTime,
    duration: musicDuration,
    volume: musicVolume,
    isController: isMusicController,
    isMusicEnabled,
    initializeSession: initializeMusicSession,
    play: musicPlay,
    pause: musicPause,
    seekTo: musicSeek,
    playNext: musicNext,
    playPrevious: musicPrevious,
    addTrack: musicAddTrack,
    removeTrack: musicRemoveTrack,
    loadAndPlay: musicLoadAndPlay,
    toggleMusic: toggleMusicFeature,
    takeControl: takeMusicControl,
    releaseControl: releaseMusicControl,
    changeVolume: changeMusicVolume
  } = useMusic();
  
  // Audio state
  const [localStream, setLocalStream] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [inputLevel, setInputLevel] = useState(0);
  const [inputVolume, setInputVolume] = useState(1.0);
  const [outputVolume, setOutputVolume] = useState(1.0);
  const [localAudioMonitoring, setLocalAudioMonitoring] = useState(false); // Disable by default for actual audio testing
  
  // Simplified Push-to-talk state
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [micButtonPressStartTime, setMicButtonPressStartTime] = useState(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimerRef = useRef(null);
  
  // Music state
  const [openMusicDialog, setOpenMusicDialog] = useState(false);
  
  // Dialog state
  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  
  // WebRTC state
  const [socket, setSocket] = useState(null);
  const [webrtcReady, setWebrtcReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [peerReady, setPeerReady] = useState(false); // Track if remote peer is ready
  
  // Device state
  const [audioDevices, setAudioDevices] = useState({ inputs: [], outputs: [] });
  const [selectedInputDevice, setSelectedInputDevice] = useState('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState('');
  
  // Refs
  const localStreamRef = useRef(null);
  const rtcConnectionRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const signalingRef = useRef(null); // Add ref for signaling
  const mediasoupDeviceRef = useRef(null); // Store mediasoup device
  const recvTransportRef = useRef(null); // Store receive transport for consuming
  const consumersRef = useRef(new Map()); // Store consumers
  
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

        // Only auto-initialize the microphone on non-iOS devices.
        // iOS Safari requires a user gesture; forcing auto-init there causes
        // the getUserMedia prompt to be blocked. For iOS we instead present
        // a visible button the user must tap to enable the microphone.
        if (!isIOS) {
          console.log('🎤 Non-iOS detected — setting up auto-init timeout...');
          setRequiresUserGesture(false);
          setTimeout(() => {
            console.log('🎤 Auto-init timeout triggered, calling initializeMicrophone...');
            initializeMicrophone().then(() => {
              console.log('🎤 Auto-init succeeded');
            }).catch(error => {
              console.log('🎤 Auto-init failed:', error.message, error.name);
              setAudioError(`Microphone access failed: ${error.message}. Please check your browser permissions and refresh the page.`);
            });
          }, 1000); // Small delay to ensure component is ready
        } else {
          console.log('🎤 iOS detected — skipping auto-init. Showing enable-microphone button.');
          setRequiresUserGesture(true);
        }
      } catch (error) {
        console.error('Error in component initialization:', error);
        if (isMounted) {
          setError('Initialization failed: ' + error.message);
        }
      }

      try {
        console.log('Calling fetchSessionDetails with sessionId:', sessionId);
        await fetchSessionDetails();
        console.log('Session details fetched successfully');
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
      
      // If we have a peer connection but no tracks, add them now
      if (rtcConnectionRef.current) {
        const senders = rtcConnectionRef.current.getSenders();
        console.log('🎵 Current peer connection has', senders.length, 'senders');
        
        if (senders.length === 0) {
          console.log('🎵 Adding tracks to existing peer connection...');
          localStream.getTracks().forEach(track => {
            console.log('🎵 Adding track:', track.kind, track.id);
            rtcConnectionRef.current.addTrack(track, localStream);
          });
          
          // If signaling is connected and peer is ready, create offer now
          if (signalingRef.current && peerReady) {
            console.log('🎵 Tracks added - creating offer...');
            createAndSendOffer(signalingRef.current);
          }
        }
      }
    }
  }, [localStream, peerReady]);
  
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
  
  // Update volume of remote audio elements when outputVolume changes
  useEffect(() => {
    const remoteAudios = document.getElementById('remote-audios');
    if (remoteAudios) {
      const audioElements = remoteAudios.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.volume = outputVolume;
        console.log('🔊 Updated remote audio volume to:', outputVolume);
      });
    }
  }, [outputVolume]);
  
  // Initialize microphone (called from user gesture for browsers that require it)
  const initializeMicrophone = async () => {
    console.log('🎤 Initializing microphone from user gesture...');
    setMicInitializing(true);
    setAudioError(null);

    try {
      console.log('🎤 navigator.mediaDevices available:', !!navigator.mediaDevices);
      console.log('🎤 getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      console.log('🎤 webkitGetUserMedia available:', !!navigator.webkitGetUserMedia);
      console.log('🎤 mozGetUserMedia available:', !!navigator.mozGetUserMedia);
      console.log('🎤 Is secure context (HTTPS):', window.isSecureContext);
      console.log('🎤 Protocol:', window.location.protocol);
      console.log('🎤 Full navigator object keys:', Object.keys(navigator).filter(key => key.toLowerCase().includes('media') || key.toLowerCase().includes('webkit') || key.toLowerCase().includes('getuser')));
      console.log('🎤 User agent:', navigator.userAgent);
      console.log('🎤 Is mobile device:', /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
      console.log('🎤 Is iOS Safari:', /iPhone|iPad|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|Opera/.test(navigator.userAgent));

      // Extract iOS version for better error messages
      const iOSVersion = navigator.userAgent.match(/OS (\d+)_?(\d+)?/);
      console.log('🎤 iOS version:', iOSVersion ? `${iOSVersion[1]}.${iOSVersion[2] || '0'}` : 'Not iOS');

      // Get the appropriate getUserMedia function for cross-browser compatibility
      let getUserMedia = null;

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        console.log('🎤 Using modern navigator.mediaDevices.getUserMedia');
      } else if (navigator.webkitGetUserMedia) {
        getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
        console.log('🎤 Using legacy navigator.webkitGetUserMedia');
      } else if (navigator.mozGetUserMedia) {
        getUserMedia = navigator.mozGetUserMedia.bind(navigator);
        console.log('🎤 Using legacy navigator.mozGetUserMedia');
      } else if (navigator.getUserMedia) {
        getUserMedia = navigator.getUserMedia.bind(navigator);
        console.log('🎤 Using fallback navigator.getUserMedia');
      }

      if (!getUserMedia) {
        console.error('🎤 No getUserMedia API found!');
        console.error('🎤 navigator object:', navigator);
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Create promise-based wrapper for older callback-based APIs
      const getUserMediaPromise = (constraints) => {
        return new Promise((resolve, reject) => {
          // Remove timeout for debugging - let it hang if dialog not shown
          // const timeout = setTimeout(() => {
          //   reject(new Error('Microphone access timed out. Please check your browser settings and try again.'));
          // }, 5000); // 5 second timeout

          try {
            // For modern API: navigator.mediaDevices.getUserMedia(constraints).then(resolve).catch(reject)
            if (getUserMedia === navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)) {
              getUserMedia(constraints)
                .then((stream) => {
                  // clearTimeout(timeout);
                  resolve(stream);
                })
                .catch((error) => {
                  // clearTimeout(timeout);
                  reject(error);
                });
            }
            // For legacy APIs: navigator.webkitGetUserMedia(constraints, successCallback, errorCallback)
            else {
              getUserMedia(constraints,
                (stream) => {
                  // clearTimeout(timeout);
                  resolve(stream);
                },
                (error) => {
                  // clearTimeout(timeout);
                  reject(error);
                }
              );
            }
          } catch (err) {
            // clearTimeout(timeout);
            console.error('🎤 Error in getUserMediaPromise wrapper:', err);
            reject(err);
          }
        });
      };

      console.log('🎤 Starting getUserMedia call...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      console.log('🎤 getUserMediaPromise resolved successfully');

      console.log('✅ Microphone access granted!');
      console.log('✅ Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
      console.log('✅ Audio tracks count:', stream.getAudioTracks().length);
      console.log('✅ Video tracks count:', stream.getVideoTracks().length);

      setLocalStream(stream);
      localStreamRef.current = stream;
      setMicInitialized(true);
      setRequiresUserGesture(false); // Clear the flag if it was set
      setIsJoined(true);
      console.log('🎵 Microphone initialized successfully');

      // Set up audio level monitoring
      setupAudioLevelMonitoring(stream);

    } catch (error) {
      console.error('❌ Error accessing microphone:', error.message);

      const errorMessage = error.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone permissions and try again.'
        : error.name === 'NotFoundError'
        ? 'No microphone found. Please connect a microphone and try again.'
        : error.name === 'NotSupportedError'
        ? 'Microphone access not supported in this browser. Please use a modern browser.'
        : error.message === 'getUserMedia is not supported in this browser'
        ? `Your browser does not support microphone access. Current protocol: ${window.location.protocol}. For iPhone testing, you need HTTPS. Use ngrok: 'ngrok http 5173' then access via the HTTPS ngrok URL.`
        : error.message === 'Microphone access timed out. Please check your browser settings and try again.'
        ? 'Microphone access timed out. This often happens on mobile devices. Please ensure you are using HTTPS and try again.'
        : `Could not access microphone: ${error.message}`;

      setAudioError(errorMessage);
      setMicInitialized(false);
      setIsJoined(false);
      throw error; // Re-throw so the caller knows it failed
    } finally {
      setMicInitializing(false);
    }
  };  // Leave audio session
  const handleLeaveAudio = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsJoined(false);
    setIsMuted(false);
    setIsPushToTalkActive(false);
    setMicInitialized(false);
    setAudioError(null);
    
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
    
    let lastUpdateTime = 0;
    const updateInterval = 100; // Update every 100ms instead of every frame
    
    const updateMeter = (timestamp) => {
      if (timestamp - lastUpdateTime >= updateInterval) {
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        
        const average = sum / bufferLength;
        setInputLevel(average / 255); // Normalize to 0-1
        lastUpdateTime = timestamp;
      }
      
      requestAnimationFrame(updateMeter);
    };
    
    requestAnimationFrame(updateMeter);
    
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
      // Avoid sending custom headers here (Cache-Control/Pragma/Expires)
      // since they trigger CORS preflight checks on some client origins
      // (and iOS/remote devices will fail if backend doesn't allow these).
      // Use a cache-busting query param if needed instead.
      const response = await api.get(`/audio/sessions/group/${sessionId}`);
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
          session_type: 'voice_with_music',
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
            session_type: 'voice_with_music',
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
          session_type: 'voice_with_music',
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

      // Initialize music session with centralized context
      console.log('🎵 Initializing music session context');
      initializeMusicSession(sessionData.id, sessionId);

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
    console.log('🎥 Initializing WebRTC for session:', sessionId);

    // Set up signaling first
    // Note: setupSignaling now is called explicitly by user action (Connect)
    // so initializeWebRTC will only prepare the RTCPeerConnection when
    // signaling is available.
    const signaling = signalingRef.current;
    if (!signaling) {
      console.warn('🎥 Signaling not connected yet, skipping WebRTC init');
      return;
    }

    // TEMPORARY: Skip mediasoup, use P2P for immediate audio
    // TODO: Re-enable mediasoup after moving to AWS
    const useMediasoup = false;

    if (useMediasoup) {
      // Try mediasoup first, fall back to peer-to-peer if it fails
      try {
        console.log('🎥 Attempting mediasoup publish...');
        await startMediasoupPublish(signaling);
        console.log('✅ Mediasoup publish successful');
        return;
      } catch (error) {
        console.warn('⚠️ Mediasoup publish failed, falling back to peer-to-peer:', error.message);
      }
    } else {
      console.log('🎥 Using peer-to-peer mode (mediasoup disabled)');
    }

    // Fallback to peer-to-peer WebRTC
    console.log('🎥 Setting up peer connection (fallback mode)...');
    await setupPeerConnection(signaling);

    console.log('🎥 WebRTC initialization complete');
    
    // If we have a local stream and a peer is ready, create an offer
    if (localStreamRef.current && peerReady) {
      console.log('🎥 Local stream available and peer ready, creating offer...');
      await createAndSendOffer(signaling);
    }
  };  // Set up signaling for WebRTC
  const setupSignaling = (sessionId) => {
    // Determine the socket URL based on environment
    // In development: use Vite dev server origin (proxies to backend)
    // In production: use VITE_BACKEND_URL if set, otherwise current origin
    const isDevelopment = import.meta.env.MODE === 'development';
    const socketUrl = isDevelopment 
      ? window.location.origin  // Dev: use Vite proxy
      : (import.meta.env.VITE_BACKEND_URL || window.location.origin); // Prod: use backend URL

    console.log('🔌 Setting up Socket.IO signaling connection...');
    console.log('🔌 Mode:', import.meta.env.MODE);
    console.log('🔌 Socket URL:', socketUrl);
    console.log('🔌 Environment variables:', {
      VITE_WS_URL: import.meta.env.VITE_WS_URL,
      VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
      VITE_API_BASE: import.meta.env.VITE_API_BASE,
      window_location: window.location.origin,
      computed_socketUrl: socketUrl,
      isDevelopment
    });

    const socket = io(socketUrl, {
      autoConnect: false, // CRITICAL: Prevent auto-connection to register handlers first
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      timeout: 10000, // Increase timeout to 10 seconds
      forceNew: true, // Force new connection
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // Explicitly set the path
      path: '/socket.io'
    });

    console.log('👥 [Participants] Registering all socket event handlers before connection...');

    socket.on('connect', () => {
      console.log('✅ Socket.IO connection established successfully');
      console.log('✅ Socket transport used:', socket.io.engine.transport.name);
      console.log('✅ Socket ID:', socket.id);
      setConnecting(false);
      setConnected(true);

      // Join the audio session room with user info
      const displayName = user?.first_name || user?.username || 'User';
      const userId = user?.id || user?.user_id;
      
      socket.emit('join-audio-session', { 
        sessionId,
        userId: userId,
        display_name: displayName
      });
      console.log(`📡 Joined audio session room: ${sessionId} as ${displayName}`);
      
      // Add current user to participants list
      setParticipants(prev => {
        const me = {
          id: userId,
          socketId: socket.id,
          display_name: displayName,
          isMuted: false,
          isMe: true
        };
        
        // Check if already in list
        const exists = prev.some(p => p && (p.socketId === socket.id || p.id === userId));
        if (exists) return prev;
        
        return [me, ...prev];
      });

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
      console.log('📨 Received webrtc-offer:', data);
      await handleOffer(data, socket);
    });

    socket.on('webrtc-answer', async (data) => {
      console.log('📨 Received webrtc-answer:', data);
      await handleAnswer(data, socket);
    });

    socket.on('webrtc-candidate', async (data) => {
      console.log('📨 Received webrtc-candidate:', data);
      await handleCandidate(data, socket);
    });

    socket.on('webrtc-ready', (data) => {
      console.log('📨 Received webrtc-ready from another participant:', data);
      setPeerReady(true);
      
      // Another participant is ready, initiate connection if we're not already connected
      // Only create offer if we have a peer connection AND local stream
      if (rtcConnectionRef.current && localStreamRef.current) {
        const connectionState = rtcConnectionRef.current.connectionState;
        console.log('🔍 Connection state:', connectionState);
        
        if (connectionState === 'new' || connectionState === 'closed') {
          console.log('🚀 Creating and sending offer...');
          createAndSendOffer(socket);
        } else {
          console.log('⏭️ Connection already in progress or established:', connectionState);
        }
      } else {
        console.log('⏸️ Waiting for local stream before creating offer');
      }
    });

    // Participant presence events
    socket.on('participant-joined', (data) => {
      console.log('👥 Participant joined via socket:', data);
      if (data && data.socketId) {
        setParticipants(prev => {
          // Check if already exists
          const exists = prev.some(p => p && p.socketId === data.socketId);
          if (exists) {
            console.log('👥 Participant already in list, skipping');
            return prev;
          }
          
          const newParticipant = {
            id: data.userId || null,
            socketId: data.socketId,
            display_name: data.display_name || 'User',
            isMuted: data.isMuted || false
          };
          
          console.log('👥 Adding participant:', newParticipant);
          return [...prev, newParticipant];
        });
      }
    });

    socket.on('participant-left', (data) => {
      console.log('👥 Participant left via socket:', data);
      if (data && data.socketId) {
        setParticipants(prev => {
          const filtered = prev.filter(p => p && p.socketId !== data.socketId);
          console.log('👥 Removed participant, remaining:', filtered.length);
          return filtered;
        });
      }
    });
    
    socket.on('current-participants', (data) => {
      console.log('👥 ========================================');
      console.log('👥 [Participants] CURRENT PARTICIPANTS RECEIVED');
      console.log('👥 Received current participants:', JSON.stringify(data.participants, null, 2));
      console.log('👥 Number of participants:', data.participants?.length || 0);
      if (data.participants && Array.isArray(data.participants)) {
        setParticipants(prev => {
          // Keep current user (marked with isMe)
          const me = prev.find(p => p && p.isMe);
          console.log('👥 Current user in list:', me ? `${me.display_name} (${me.id})` : 'not found');
          
          // Add all other participants
          const others = data.participants.map(p => ({
            id: p.userId,
            socketId: p.socketId,
            display_name: p.display_name || 'User',
            isMuted: false,
            isMe: false
          }));
          
          console.log('👥 Other participants:', others.map(p => `${p.display_name} (${p.id})`).join(', '));
          const finalList = me ? [me, ...others] : others;
          console.log('👥 Final participants list count:', finalList.length);
          console.log('👥 ========================================');
          
          return finalList;
        });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('👥 Socket disconnected, clearing remote participants');
      // Keep only the current user in the list when disconnected
      setParticipants(prev => prev.filter(p => p && p.isMe));
    });

    console.log('👥 [Participants] All event handlers registered, now connecting socket...');

    // Store the socket in state and ref
    setSocket(socket);
    signalingRef.current = socket;

    // Connect the socket AFTER all handlers are registered
    socket.connect();
    console.log('👥 [Participants] Socket connection initiated');

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
    console.log('🔗 Setting up peer connection...');

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
    console.log('🔗 RTCPeerConnection created');

    // Add local stream to peer connection when available
    const streamToAdd = localStreamRef.current || localStream;
    if (streamToAdd) {
      console.log('🔗 Adding local stream to peer connection');
      streamToAdd.getTracks().forEach(track => {
        console.log('🔗 Adding track:', track.kind, track.id, 'enabled:', track.enabled, 'readyState:', track.readyState);
        peerConnection.addTrack(track, streamToAdd);
      });
    } else {
      console.warn('⚠️ No local stream available yet - peer connection created without tracks');
      console.warn('⚠️ Tracks will need to be added manually when stream becomes available');
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate');
        signaling.emit('webrtc-candidate', {
          candidate: event.candidate,
          sessionId: sessionId
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state changed:', peerConnection.connectionState);
      console.log('🔗 Full connection state details:', {
        connectionState: peerConnection.connectionState,
        iceConnectionState: peerConnection.iceConnectionState,
        iceGatheringState: peerConnection.iceGatheringState,
        signalingState: peerConnection.signalingState
      });
      setConnected(peerConnection.connectionState === 'connected');
      setConnecting(peerConnection.connectionState === 'connecting');
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
      console.log('🧊 Full ICE state details:', {
        iceConnectionState: peerConnection.iceConnectionState,
        iceGatheringState: peerConnection.iceGatheringState,
        signalingState: peerConnection.signalingState
      });
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('🎵 ========== REMOTE TRACK RECEIVED ==========');
      console.log('🎵 Track kind:', event.track.kind);
      console.log('🎵 Track id:', event.track.id);
      console.log('🎵 Track enabled:', event.track.enabled);
      console.log('🎵 Track readyState:', event.track.readyState);
      console.log('🎵 Track muted:', event.track.muted);
      console.log('🎵 Number of streams:', event.streams.length);
      if (event.streams.length > 0) {
        console.log('🎵 Stream id:', event.streams[0].id);
        console.log('🎵 Stream tracks:', event.streams[0].getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled, readyState: t.readyState })));
      }
      console.log('🎵 ==========================================');
      
      if (event.track.kind === 'audio') {
        console.log('🎵 Setting up remote audio stream');
        handleRemoteAudioStream(event.streams[0]);
      }
    };

    // Store signaling reference
    signalingRef.current = signaling;

    return peerConnection;
  };
  
  // Handle remote audio stream
  const handleRemoteAudioStream = (stream) => {
    console.log('🎵 Handling remote audio stream');
    console.log('🎵 Remote stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled, readyState: t.readyState })));

    // Create audio element for remote stream
    const audioElement = new Audio();
    audioElement.srcObject = stream;
    audioElement.volume = outputVolume;
    audioElement.autoplay = true;
    audioElement.muted = false;
    console.log('🎵 Created audio element with volume:', outputVolume, 'autoplay:', audioElement.autoplay, 'muted:', audioElement.muted);

    // Add event listeners to debug audio playback
    audioElement.onloadedmetadata = () => console.log('🎵 Audio element loaded metadata');
    audioElement.oncanplay = () => console.log('🎵 Audio element can play');
    audioElement.onplay = () => console.log('🎵 Audio element started playing');
    audioElement.onpause = () => console.log('🎵 Audio element paused');
    audioElement.onerror = (e) => console.error('🎵 Audio element error:', e);
    audioElement.onended = () => console.log('🎵 Audio element ended');

    // Try to play immediately
    audioElement.play().then(() => {
      console.log('🎵 Audio element play() succeeded');
    }).catch((error) => {
      console.error('🎵 Audio element play() failed:', error);
      // Try to play on user interaction if autoplay fails
      const playOnInteraction = () => {
        audioElement.play().then(() => {
          console.log('🎵 Audio element play() succeeded on user interaction');
        }).catch((err) => {
          console.error('🎵 Audio element play() failed even on interaction:', err);
        });
        document.removeEventListener('click', playOnInteraction);
        document.removeEventListener('touchstart', playOnInteraction);
      };
      document.addEventListener('click', playOnInteraction);
      document.addEventListener('touchstart', playOnInteraction);
    });

    // Store the audio element
    const remoteAudios = document.getElementById('remote-audios');
    if (remoteAudios) {
      // Remove any existing audio elements for this stream
      const existingAudios = remoteAudios.querySelectorAll('audio');
      existingAudios.forEach(audio => {
        if (audio.srcObject === stream) {
          console.log('🎵 Removing existing audio element');
          audio.remove();
        }
      });

      console.log('🎵 Appending new audio element to DOM');
      remoteAudios.appendChild(audioElement);
      console.log('🎵 Total audio elements in container:', remoteAudios.children.length);
    } else {
      console.warn('🎵 Remote audios container not found');
    }
  };
  
  // Create and send offer
  const createAndSendOffer = async (signaling) => {
    try {
      const peerConnection = rtcConnectionRef.current;
      if (!peerConnection) {
        console.error('❌ No peer connection available');
        return;
      }

      console.log('📤 Creating offer...');
      console.log('📤 Peer connection state:', {
        connectionState: peerConnection.connectionState,
        iceConnectionState: peerConnection.iceConnectionState,
        signalingState: peerConnection.signalingState,
        senders: peerConnection.getSenders().length
      });
      
      const offer = await peerConnection.createOffer();
      console.log('📤 Created offer:', offer.type);
      console.log('📤 Setting local description...');
      await peerConnection.setLocalDescription(offer);

      console.log('📤 Sending offer via signaling...');
      signaling.emit('webrtc-offer', {
        offer: peerConnection.localDescription,
        sessionId: sessionId
      });
      console.log('📤 Offer sent successfully');
    } catch (error) {
      console.error('❌ Error creating/sending offer:', error.message);
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
      mediasoupDeviceRef.current = device;
      console.log('✅ Mediasoup device loaded with RTP capabilities');
    } catch (err) {
      console.warn('Failed to load mediasoup Device, falling back to native:', err.message);
      return nativePublishFallback(signaling);
    }

    // Create send transport for producing
    const sendTransportResp = await new Promise((res) => signaling.emit('mediasoup-create-transport', { sessionId }, (r) => res(r)));
    if (!sendTransportResp || !sendTransportResp.success) {
      console.warn('mediasoup create send transport failed, fallback to native');
      return nativePublishFallback(signaling);
    }

    const sendTransport = device.createSendTransport({
      id: sendTransportResp.transport.id,
      iceParameters: sendTransportResp.transport.iceParameters,
      iceCandidates: sendTransportResp.transport.iceCandidates,
      dtlsParameters: sendTransportResp.transport.dtlsParameters
    });

    sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      signaling.emit('mediasoup-connect-transport', { sessionId, transportId: sendTransportResp.transport.id, dtlsParameters }, (resp) => {
        if (resp && resp.success) callback(); else errback(resp && resp.error ? new Error(resp.error) : new Error('connect failed'));
      });
    });

    sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      signaling.emit('mediasoup-produce', { sessionId, transportId: sendTransportResp.transport.id, kind, rtpParameters }, (resp) => {
        if (resp && resp.success) callback({ id: resp.id }); else errback(new Error(resp && resp.error ? resp.error : 'produce failed'));
      });
    });

    // Produce audio track
    const track = localStream.getAudioTracks()[0];
    if (!track) return nativePublishFallback(signaling);

    const producer = await sendTransport.produce({ track });
    console.log('🎤 Mediasoup producer created:', producer.id);

    // Create receive transport for consuming
    const recvTransportResp = await new Promise((res) => signaling.emit('mediasoup-create-transport', { sessionId }, (r) => res(r)));
    if (recvTransportResp && recvTransportResp.success) {
      const recvTransport = device.createRecvTransport({
        id: recvTransportResp.transport.id,
        iceParameters: recvTransportResp.transport.iceParameters,
        iceCandidates: recvTransportResp.transport.iceCandidates,
        dtlsParameters: recvTransportResp.transport.dtlsParameters
      });

      recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        signaling.emit('mediasoup-connect-transport', { sessionId, transportId: recvTransportResp.transport.id, dtlsParameters }, (resp) => {
          if (resp && resp.success) callback(); else errback(resp && resp.error ? new Error(resp.error) : new Error('connect failed'));
        });
      });

      recvTransportRef.current = recvTransport;
      console.log('✅ Receive transport created for consuming');

      // Store our own producer ID to avoid consuming it
      const myProducerId = producer.id;

      // Get existing producers and consume them (skip our own)
      const existingProducersResp = await new Promise((res) => signaling.emit('mediasoup-get-producers', { sessionId }, (r) => res(r)));
      if (existingProducersResp && existingProducersResp.success && existingProducersResp.producerIds) {
        for (const producerId of existingProducersResp.producerIds) {
          if (producerId !== myProducerId) {
            await consumeProducer(signaling, producerId, recvTransport, device.rtpCapabilities);
          } else {
            console.log('⏭️ Skipping own producer:', producerId);
          }
        }
      }

      // Listen for new producers (skip our own)
      signaling.on('new-producer', async (data) => {
        if (data.producerId !== myProducerId) {
          console.log('📢 New producer available:', data.producerId);
          await consumeProducer(signaling, data.producerId, recvTransport, device.rtpCapabilities);
        } else {
          console.log('⏭️ Ignoring own producer event');
        }
      });
    }

    return { mode: 'mediasoup', producerId: producer.id };
  };

  // Consume a producer (receive audio from another participant)
  const consumeProducer = async (signaling, producerId, recvTransport, rtpCapabilities) => {
    try {
      const consumeResp = await new Promise((res) => 
        signaling.emit('mediasoup-consume', { 
          sessionId, 
          transportId: recvTransport.id, 
          producerId,
          rtpCapabilities 
        }, (r) => res(r))
      );

      if (!consumeResp || !consumeResp.success) {
        console.warn('Failed to consume producer:', producerId);
        return;
      }

      const consumer = await recvTransport.consume({
        id: consumeResp.consumer.id,
        producerId: consumeResp.consumer.producerId,
        kind: consumeResp.consumer.kind,
        rtpParameters: consumeResp.consumer.rtpParameters
      });

      // Resume the consumer to start receiving media
      await consumer.resume();
      console.log('▶️ Consumer resumed:', consumer.id);

      consumersRef.current.set(consumer.id, consumer);
      console.log('🎧 Consumer created:', consumer.id, 'for producer:', producerId);

      // Create audio element for the consumed track
      const stream = new MediaStream([consumer.track]);
      handleRemoteAudioStream(stream);

    } catch (err) {
      console.error('Error consuming producer:', producerId, err);
    }
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
        console.error('❌ No peer connection available for offer');
        return;
      }

      console.log('📥 Handling offer...');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

      console.log('📥 Creating answer...');
      const answer = await peerConnection.createAnswer();
      console.log('📥 Setting local description...');
      await peerConnection.setLocalDescription(answer);

      console.log('📥 Sending answer...');
      signaling.emit('webrtc-answer', {
        answer: peerConnection.localDescription,
        sessionId: sessionId
      });
      console.log('📥 Answer sent');
    } catch (error) {
      console.error('❌ Error handling offer:', error);
    }
  };

  const handleAnswer = async (data, signaling) => {
    try {
      const peerConnection = rtcConnectionRef.current;
      if (!peerConnection) {
        console.error('❌ No peer connection available for answer');
        return;
      }

      console.log('📥 Handling answer...');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log('📥 Remote description set');
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  };

  const handleCandidate = async (data, signaling) => {
    try {
      const peerConnection = rtcConnectionRef.current;
      if (!peerConnection) {
        console.error('❌ No peer connection available for candidate');
        return;
      }

      console.log('📥 Adding ICE candidate...');
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log('📥 ICE candidate added');
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
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
  // Lightweight render-time log to aid debugging in desktop browsers (keeps console output concise)
  try {
    // Only log in non-production to avoid noisy output in production builds
    if (import.meta.env && import.meta.env.MODE !== 'production') {
      console.log('AudioSession render', {
        loading,
        error: !!error,
        audioError: !!audioError,
        session: !!session,
        isJoined,
        micInitialized,
        requiresUserGesture,
        micInitializing,
        localStream: !!localStream,
        connected,
        connecting
      });
    }
  } catch (e) {
    // Swallow any render-time logging errors to avoid breaking render
  }

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
            <IconButton color="inherit" onClick={() => setOpenMusicDialog(true)}>
              <MusicNoteIcon />
            </IconButton>
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

          {/* Debug button */}
          <Button
            variant="outlined"
            color="info"
            onClick={() => {
              console.log('🔍 DEBUG: Current WebRTC state');
              console.log('🔍 Peer connection:', rtcConnectionRef.current);
              if (rtcConnectionRef.current) {
                console.log('🔍 Connection state:', rtcConnectionRef.current.connectionState);
                console.log('🔍 ICE connection state:', rtcConnectionRef.current.iceConnectionState);
                console.log('🔍 Signaling state:', rtcConnectionRef.current.signalingState);
                console.log('🔍 Local description:', rtcConnectionRef.current.localDescription);
                console.log('🔍 Remote description:', rtcConnectionRef.current.remoteDescription);
              }
              console.log('🔍 Local stream:', localStream);
              if (localStream) {
                console.log('🔍 Local tracks:', localStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
              }
              const remoteAudios = document.getElementById('remote-audios');
              if (remoteAudios) {
                console.log('🔍 Remote audio elements:', remoteAudios.children.length);
                Array.from(remoteAudios.children).forEach((audio, i) => {
                  console.log(`🔍 Audio element ${i}:`, {
                    srcObject: !!audio.srcObject,
                    volume: audio.volume,
                    muted: audio.muted,
                    paused: audio.paused,
                    readyState: audio.readyState,
                    networkState: audio.networkState
                  });
                });
              }
              console.log('🔍 Signaling connected:', !!signalingRef.current);
              console.log('🔍 Participants:', participants);
            }}
            sx={{ mr: 2 }}
          >
            Debug State
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
        
        {/* Show microphone initialization prompt if needed */}
        {!micInitialized && (
          <Paper variant="outlined" sx={{ p: 3, mb: 2, bgcolor: 'info.light' }}>
            {console.log('🎤 Mic not initialized:', { micInitialized, requiresUserGesture, micInitializing, isIOS })}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MicIcon sx={{ fontSize: 36, color: 'primary.main', mr: 2 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">
                  Microphone Not Initialized
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {requiresUserGesture ?
                    'Click below to grant microphone access. Required for voice communication.' :
                    'Initializing microphone...'
                  }
                </Typography>
              </Box>
            </Box>
            {requiresUserGesture ? (
              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                startIcon={<MicIcon />}
                onClick={() => {
                  console.log('🎤 User clicked Grant Microphone Access button');
                  console.log('🎤 Current state:', { micInitialized, micInitializing, requiresUserGesture });
                  initializeMicrophone();
                }}
                disabled={micInitializing}
              >
                {micInitializing ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Initializing...
                  </>
                ) : (
                  'Grant Microphone Access'
                )}
              </Button>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2">Requesting permission...</Typography>
              </Box>
            )}
            {audioError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {audioError}
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={() => {
                    console.log('🎤 User clicked Retry button');
                    setAudioError(null);
                    initializeMicrophone();
                  }}
                  disabled={micInitializing}
                  sx={{ mt: 1, ml: 2 }}
                >
                  Retry
                </Button>
              </Alert>
            )}
          </Paper>
        )}

        {/* Always show UI sections - just disable controls if mic not initialized */}
        <Box>
          {/* Simplified Mic controls */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, opacity: micInitialized ? 1 : 0.6 }}>
            <Typography variant="subtitle1" gutterBottom>
              Mic Controls {!micInitialized && <Chip label="Mic Not Ready" size="small" color="warning" sx={{ ml: 1 }} />}
            </Typography>
              
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Tooltip title={
                  !micInitialized
                    ? "Microphone not initialized - click Grant Microphone Access above"
                    : isPushToTalkActive 
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
                    disabled={!micInitialized}
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
                      onChange={(e, newValue) => changeMusicVolume(newValue)}
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
                    audio.volume = 0.5; // Increased volume for testing
                    audio.muted = false;
                  }
                }}
                style={{ display: 'none' }}
                autoPlay
                muted={false}
              />
            )}

            {/* Simple Audio Test */}
            <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Audio Test
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Test your microphone by speaking. The level meter above should move when you talk.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (localStream) {
                      console.log('🎤 Current audio tracks:', localStream.getAudioTracks().map(t => ({
                        enabled: t.enabled,
                        muted: t.muted,
                        readyState: t.readyState,
                        label: t.label
                      })));
                      alert(`Microphone working! Tracks: ${localStream.getAudioTracks().length}`);
                    } else {
                      alert('No microphone stream available');
                    }
                  }}
                >
                  Test Mic Status
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Input Level: {Math.round(inputLevel * 100)}%
                </Typography>
              </Box>
            </Paper>
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
      </Paper>
      
      {/* Music Dialog */}
      <Dialog
        open={openMusicDialog}
        onClose={() => setOpenMusicDialog(false)}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 9999 }}
      >
        <DialogTitle>Music Player</DialogTitle>
        <DialogContent>
          {/* Music Player */}
          <Box sx={{ mb: 3 }}>
            <MusicPlayer
              currentTrack={currentTrack}
              isPlaying={musicIsPlaying}
              currentTime={musicCurrentTime}
              duration={musicDuration}
              volume={musicVolume}
              isController={isMusicController}
              onPlay={musicPlay}
              onPause={musicPause}
              onNext={musicNext}
              onPrevious={musicPrevious}
              onSeek={musicSeek}
              onVolumeChange={changeMusicVolume}
              onTakeControl={takeMusicControl}
              onReleaseControl={releaseMusicControl}
              disabled={!session}
            />
          </Box>

          {/* Music Playlist */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Playlist
            </Typography>
            <MusicPlaylist
              playlist={playlist}
              currentTrack={currentTrack}
              isController={isMusicController}
              onPlayTrack={(track) => musicLoadAndPlay(track)}
              onRemoveTrack={(trackId) => musicRemoveTrack(trackId)}
              disabled={!session}
            />
          </Box>

          {/* Music Upload */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Upload Music
            </Typography>
            <MusicUpload
              sessionId={session?.id || session?._id}
              onTracksAdded={async (tracks) => {
                console.log('Tracks uploaded:', tracks);
                // Add each track to the playlist
                for (const track of tracks) {
                  await musicAddTrack(track);
                }
                console.log('All tracks added to playlist');
              }}
              disabled={!session}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMusicDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

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
