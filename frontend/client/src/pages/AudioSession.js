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
  Switch,
  FormControlLabel,
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
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
  
  // Push-to-talk state
  const [pushToTalkEnabled, setPushToTalkEnabled] = useState(false);
  const [pushToTalkMode, setPushToTalkMode] = useState('hold');
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  
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
    // Automatically join audio session when component mounts
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
  
  // Push-to-talk keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && pushToTalkEnabled && !isPushToTalkActive) {
        handlePushToTalkDown();
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.code === 'Space' && pushToTalkEnabled && isPushToTalkActive) {
        handlePushToTalkUp();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [pushToTalkEnabled, isPushToTalkActive]);
  
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
  
  // Push-to-talk handlers
  const handlePushToTalkDown = () => {
    if (pushToTalkEnabled && pushToTalkMode === 'hold') {
      setIsPushToTalkActive(true);
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
      }
    }
  };
  
  const handlePushToTalkUp = () => {
    if (pushToTalkEnabled && pushToTalkMode === 'hold' && isPushToTalkActive) {
      setIsPushToTalkActive(false);
      if (localStream && isMuted) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
    }
  };
  
  const togglePushToTalk = () => {
    if (pushToTalkEnabled && pushToTalkMode === 'toggle') {
      const newState = !isPushToTalkActive;
      setIsPushToTalkActive(newState);
      
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = newState;
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
        const response = await api.get(`/api/audio/sessions/${sessionId}`);
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
          const createResponse = await api.post('/api/audio/sessions', {
            group_id: sessionId, // Assuming sessionId is the group ID
            created_by: user.id,
            type: 'voice_only'
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
        const joinResponse = await api.post(`/api/audio/sessions/${sessionData.id}/join`, {
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
      
      // Fetch participants
      try {
        const participantsResponse = await api.get(`/api/audio/sessions/${sessionData.id}/participants`);
        if (participantsResponse.data && participantsResponse.data.participants) {
          setParticipants(participantsResponse.data.participants);
        }
      } catch (participantsError) {
        console.error('Error fetching participants:', participantsError);
        // Continue anyway, we can update participants later
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
  const initializeWebRTC = (sessionId) => {
    try {
      // Set up signaling - this could be WebSocket or your existing WebRTC signaling
      const signaling = setupSignaling(sessionId);
      
      // Initialize peer connection
      setupPeerConnection(signaling);
      
      setWebrtcReady(true);
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      setError('Failed to initialize audio connection');
    }
  };
  
  // Set up signaling for WebRTC
  const setupSignaling = (sessionId) => {
    // Use your existing WebRTC signaling mechanism
    // This could be a WebSocket connection or another method
    
    // Example with WebSocket
    const wsUrl = `${process.env.REACT_APP_WS_URL || 'wss://your-api-domain.com'}/audio/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setConnecting(false);
      setConnected(true);
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleSignalingMessage(message, ws); // Pass ws as the signaling object
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
      setError('Connection error');
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setConnected(false);
    };
    
    // Store the signaling object in the ref
    signalingRef.current = ws;
    
    return ws;
  };
  
  // Handle signaling messages
  const handleSignalingMessage = (message, signaling) => {
    switch (message.type) {
      case 'offer':
        handleOffer(message, signaling);
        break;
      case 'answer':
        handleAnswer(message, signaling);
        break;
      case 'candidate':
        handleCandidate(message, signaling);
        break;
      case 'participant_joined':
        handleParticipantJoined(message.participant);
        break;
      case 'participant_left':
        handleParticipantLeft(message.participant_id);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  };
  
  // Set up peer connection
  const setupPeerConnection = (signaling) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
        // Add TURN servers for production
      ]
    };
    
    const peerConnection = new RTCPeerConnection(configuration);
    rtcConnectionRef.current = peerConnection;
    
    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signaling.send(JSON.stringify({
          type: 'candidate',
          candidate: event.candidate
        }));
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
    };
    
    // Handle tracks from remote peers
    peerConnection.ontrack = (event) => {
      // Create audio element for remote stream
      const audioElement = new Audio();
      audioElement.srcObject = event.streams[0];
      audioElement.play().catch(error => console.error('Error playing audio:', error));
      
      // Store the audio element
      const remoteAudios = document.getElementById('remote-audios');
      if (remoteAudios) {
        remoteAudios.appendChild(audioElement);
      }
    };
    
    return peerConnection;
  };
  
  // WebRTC signaling handlers
  const handleOffer = async (message, signaling) => {
    try {
      const peerConnection = rtcConnectionRef.current;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Send answer
      signaling.send(JSON.stringify({
        type: 'answer',
        answer: peerConnection.localDescription
      }));
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };
  
  const handleAnswer = async (message, signaling) => {
    try {
      const peerConnection = rtcConnectionRef.current;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };
  
  const handleCandidate = async (message, signaling) => {
    try {
      const peerConnection = rtcConnectionRef.current;
      await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };
  
  const handleParticipantJoined = (participant) => {
    setParticipants(prev => [...prev, participant]);
  };
  
  const handleParticipantLeft = (participantId) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
  };
  
  // Leave session
  const leaveSession = async () => {
    try {
      if (session) {
        await api.post(`/api/audio/sessions/${session.id}/leave`, {
          user_id: user.id
        });
      }
      
      // Close WebRTC connection
      if (rtcConnectionRef.current) {
        rtcConnectionRef.current.close();
      }
      
      // Close signaling connection
      if (signalingRef.current) {
        signalingRef.current.close();
      }
      
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  };
  
  // Render component
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Audio Session
        </Typography>
        
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
          >
            Leave Audio
          </Button>
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
            {/* Mic controls */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Mic Controls
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Tooltip title={isMuted ? "Unmute Microphone" : "Mute Microphone"}>
                    <IconButton 
                      color={isMuted ? "default" : "primary"} 
                      onClick={toggleMute}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <MicOffIcon /> : <MicIcon />}
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

                {/* Push-to-Talk Controls */}
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={pushToTalkEnabled} 
                        onChange={(e) => setPushToTalkEnabled(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Enable Push-to-Talk"
                  />
                  
                  {pushToTalkEnabled && (
                    <Box sx={{ ml: 3, mt: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={pushToTalkMode === 'toggle'} 
                            onChange={(e) => setPushToTalkMode(e.target.checked ? 'toggle' : 'hold')}
                            color="primary"
                          />
                        }
                        label="Toggle Mode (instead of Hold)"
                      />
                      
                      <Box sx={{ mt: 1 }}>
                        <Button 
                          variant="contained" 
                          color={isPushToTalkActive ? "secondary" : "primary"}
                          onMouseDown={pushToTalkMode === 'hold' ? handlePushToTalkDown : undefined}
                          onMouseUp={pushToTalkMode === 'hold' ? handlePushToTalkUp : undefined}
                          onMouseLeave={pushToTalkMode === 'hold' ? handlePushToTalkUp : undefined}
                          onClick={pushToTalkMode === 'toggle' ? togglePushToTalk : undefined}
                          sx={{ width: '100%', py: 1.5 }}
                        >
                          {isPushToTalkActive 
                            ? (pushToTalkMode === 'toggle' ? 'Speaking (Click to Stop)' : 'Speaking...') 
                            : (pushToTalkMode === 'toggle' ? 'Click to Speak' : 'Hold to Speak')}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              
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
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AudioSession;
