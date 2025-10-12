import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
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
  Divider
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
    // Initialize microphone capture automatically, but do not auto-connect
    // signaling. Users will manually connect to signaling using the UI.
    handleJoinAudio();

    // Fetch session details
    fetchSessionDetails();
    
    // Enumerate available devices
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
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
      });
    
    // Cleanup function for when component unmounts
    return () => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          deviceId: selectedInputDevice ? { exact: selectedInputDevice } : undefined
        },
        video: false
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      console.log('Audio stream initialized successfully');
      
      // Set up audio level monitoring
      setupAudioLevelMonitoring(stream);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setAudioError('Could not access microphone. Please check permissions.');
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
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !newMuteState;
      });
      setIsMuted(newMuteState);
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
    try {
      setLoading(true);
      
      // Check if we have the necessary data
      if (!sessionId || !user) {
        setError('Missing session ID or user information');
        setLoading(false);
        return;
      }
      
      // First, check if the session exists
      let sessionData;
      try {
        const response = await api.get(`/audio/sessions/group/${sessionId}`);
        if (response.data && response.data.session) {
          sessionData = response.data.session;
        }
      } catch (error) {
        // Session might not exist yet, which is fine
        console.log('Session not found, will create a new one');
      }
      
      // If session doesn't exist, create it
      if (!sessionData) {
        try {
          const createResponse = await api.post('/audio/sessions', {
            group_id: sessionId,
            session_type: 'voice_only',
            device_type: 'web'
          });
          
          if (createResponse.data && createResponse.data.session) {
            sessionData = createResponse.data.session;
          } else {
            throw new Error('Failed to create session');
          }
        } catch (createError) {
          console.error('Error creating audio session:', createError);
          setError('Failed to create audio session');
          setLoading(false);
          return;
        }
      }
      
      // Now join the session as a participant
      try {
  const joinResponse = await api.post(`/audio/sessions/${sessionData.id}/join`, {
          user_id: user.id,
          display_name: user.name || user.username || 'User',
          device_type: 'web'
        });
        
        if (joinResponse.data && joinResponse.data.success) {
          console.log('Successfully joined audio session');
        } else {
          console.warn('Join response incomplete:', joinResponse);
        }
      } catch (joinError) {
        // If joining fails, we might already be a participant
        console.warn('Error joining session, might already be a participant:', joinError);
      }
      
      // Set the session in state
      setSession(sessionData);
      
      // Set participants from session data
      if (sessionData.participants) {
        setParticipants(sessionData.participants.filter(p => !p.left_at));
      }
      
      // Initialize WebRTC connection
      initializeWebRTC(sessionData.id);
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchSessionDetails:', error);
      setError('Failed to load or create audio session');
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
    // Use Socket.IO for signaling. Default to same-origin so dev servers
    // using the same port don't need an explicit VITE_WS_URL set.
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(socketUrl, {
      transports: ['websocket'],
      // default path '/socket.io' is fine unless your server uses a custom path
    });

    socket.on('connect', () => {
      console.log('Socket.IO connection established');
      setConnecting(false);
      setConnected(true);

      // Join the audio session room
      socket.emit('join-audio-session', { sessionId });

      // Send ready signal to let others know we're here
      socket.emit('webrtc-ready', { sessionId });
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO connection closed');
      setConnected(false);
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
      const newParticipant = {
        id: data.userId || null,
        socketId: data.socketId || null,
        display_name: data.display_name || null
      };
      setParticipants(prev => {
        // avoid duplicates
        const exists = prev.some(p => p.socketId === newParticipant.socketId || p.id === newParticipant.id);
        if (exists) return prev;
        return [...prev, newParticipant];
      });
    });

    socket.on('participant-left', (data) => {
      console.log('Participant left via socket:', data);
      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId && p.id !== data.userId));
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

    return new Promise((resolve, reject) => {
      // Request a transport from server
      signaling.emit('mediasoup-create-transport', { sessionId }, async (resp) => {
        try {
          if (!resp || !resp.success) {
            // mediasoup disabled or failed
            return reject(new Error(resp && resp.error ? resp.error : 'mediasoup-unavailable'));
          }

          const transport = resp.transport;
          if (!transport) return reject(new Error('no-transport'));

          // For simplicity we will use the native RTCPeerConnection to send audio
          // after connecting DTLS via mediasoup-connect-transport. This is a light
          // handshake and does not require mediasoup-client on the browser.

          // Connect transport (server will map DTLS parameters, but since we're not
          // using mediasoup-client to manage DTLS directly, attempt to call connect
          // and then fallback to native publishing.
          signaling.emit('mediasoup-connect-transport', { sessionId, transportId: transport.id, dtlsParameters: {} }, async (connectResp) => {
            if (!connectResp || !connectResp.success) {
              // fallback to native P2P
              try {
                await nativePublishFallback(signaling);
                return resolve({ mode: 'native-fallback' });
              } catch (e) {
                return reject(e);
              }
            }

            // Server reported connected; but without mediasoup-client the full
            // mediasoup transport lifecycle can't complete on the browser. Fall back.
            try {
              await nativePublishFallback(signaling);
              resolve({ mode: 'native-after-connect' });
            } catch (e) {
              reject(e);
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    });
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
        signalingRef.current.emit('leave-audio-session', { sessionId });
        signalingRef.current.disconnect();
      }
      
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  };
  
  // Render component
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
                signalingRef.current.emit('leave-audio-session', { sessionId });
                signalingRef.current.disconnect();
                setSocket(null);
                signalingRef.current = null;
                setConnected(false);
              }
            }}>
              Disconnect Signaling
            </Button>
          ) : (
            <Button variant="contained" color="primary" onClick={() => {
              // Connect signaling
              const s = setupSignaling(sessionId);
              // once connected, try to initialize WebRTC
              s.on('connect', () => initializeWebRTC(sessionId));
            }}>
              Connect Signaling
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

            {/* Participant list */}
            <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
              <Typography variant="subtitle1">Participants</Typography>
              <List dense>
                {participants.map((p, idx) => (
                  <React.Fragment key={p.socketId || p.id || idx}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <GroupIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={p.display_name || p.id || p.socketId || 'Unknown'} secondary={p.socketId ? `socket:${p.socketId}` : ''} />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
                {participants.length === 0 && (
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
