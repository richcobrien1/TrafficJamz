import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Add this import at the top of your file
import io from 'socket.io-client';
import { 
  Container, 
  Box, 
  Typography, 
  Grid, 
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
// import MicIcon from '@mui/icons-material/Mic';
// import MicOffIcon from '@mui/icons-material/MicOff';
// import VolumeUpIcon from '@mui/icons-material/VolumeUp';
// import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import api from '../services/api'; // Adjust the path as needed to point to your api.js file
import { useAuth } from '../contexts/AuthContext';

const AudioSession = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState([]);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  // Add to AudioSession.js
  const [inputVolume, setInputVolume] = useState(1.0);
  const [outputVolume, setOutputVolume] = useState(1.0);
  const [openMusicDialog, setOpenMusicDialog] = useState(false);
  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  
  // Add this state variable in your component
  const [socket, setSocket] = useState(null);
  
  // WebRTC related states
  const [webrtcReady, setWebrtcReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // References for WebRTC
  const localStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const rtcConnectionRef = useRef(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [inputLevel, setInputLevel] = useState(0);
  const [pushToTalkEnabled, setPushToTalkEnabled] = useState(false);
  const [pushToTalkMode, setPushToTalkMode] = useState('hold');
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.5);

  // Add to AudioSession.js
  const [audioDevices, setAudioDevices] = useState({ inputs: [], outputs: [] });
  const [selectedInputDevice, setSelectedInputDevice] = useState('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState('');

  // Add to AudioSession.js
  const [musicState, setMusicState] = useState({
    currentTrack: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    volume: 0.5
  });

  // Music player reference
  const audioPlayerRef = useRef(null);

  // Push-to-talk button handlers
  // const handlePushToTalkDown = () => {
  //   if (pushToTalkEnabled) {
  //     setIsPushToTalkActive(true);
  //     // Temporarily unmute microphone
  //     if (localStream) {
  //       localStream.getAudioTracks().forEach(track => {
  //         track.enabled = true;
  //       });
  //     }
  //   }
  // };

  // const handlePushToTalkUp = () => {
  //   if (pushToTalkEnabled) {
  //     setIsPushToTalkActive(false);
  //     // Mute microphone again
  //     if (localStream && micMuted) {
  //       localStream.getAudioTracks().forEach(track => {
  //         track.enabled = false;
  //       });
  //     }
  //   }
  // };

  useEffect(() => {
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
  }, []);

  // Add this useEffect to initialize the stream when the component mounts
  useEffect(() => {
    // Only initialize if we don't already have a stream
    if (!localStream) {
      initializeAudioStream();
    }
    
    // Cleanup function to stop tracks when component unmounts
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Add this function to handle stream initialization
  const initializeAudioStream = async () => {
    try {
      // Request audio permissions and get stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      // Store the stream in state
      setLocalStream(stream);
      
      // Initially mute the stream if settings require it
      // const userPreferences = getUserAudioPreferences(); // Get from your user settings
      // if (userPreferences?.auto_mute_on_join) {
      //   stream.getAudioTracks().forEach(track => {
      //     track.enabled = false;
      //   });
      // }
      
      console.log('Audio stream initialized successfully');
    } catch (error) {
      console.error('Error initializing audio stream:', error);
      // Show error to user
      setAudioError('Could not access microphone. Please check permissions.');
    }
  };

  const handleJoinAudio = async () => {
    setIsJoined(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      setLocalStream(stream);
      
      // Set up audio level monitoring
      setupAudioLevelMonitoring(stream);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setAudioError('Could not access microphone. Please check permissions.');
    }
  };
  
  const handleLeaveAudio = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsJoined(false);
    setIsMuted(false);
    setIsPushToTalkActive(false);
  };
  
  const toggleMute = () => {
    if (localStream) {
      const newMuteState = !isMuted;
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !newMuteState;
      });
      setIsMuted(newMuteState);
    }
  };
  
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
  };  

  // Add keyboard shortcut for push-to-talk (spacebar)
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

  // Create audio level visualization
  useEffect(() => {
    if (localStream) {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(localStream);
      const analyser = audioContext.createAnalyser();
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
        setInputLevel(average / 255); // 0 to 1
        
        requestAnimationFrame(updateMeter);
      };
      
      updateMeter();
      
      return () => {
        source.disconnect();
        audioContext.close();
      };
    }
  }, [localStream]);

  // Handle music events from server
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
          // Calculate time difference between server and client
          const timeDiff = Date.now() - data.timestamp;
          const adjustedPosition = data.position + timeDiff;
          
          audioPlayerRef.current.currentTime = adjustedPosition / 1000;
          audioPlayerRef.current.play();
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
    }
  }, [socket]);
  
  useEffect(() => {
    fetchSessionDetails();
    
    // Cleanup function to leave the session when component unmounts
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      leaveSession();
    };
  }, [sessionId]);
  
  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      // In a real implementation, we would fetch the actual session
      // For the prototype, we'll simulate a session
      
      // Simulated API call
      const response = await api.get(`/api/audio/sessions/group/${sessionId}`);
      setSession(response.data.session);
      
      // Simulate session data
      const mockSession = {
        id: sessionId,
        group_id: sessionId,
        status: 'active',
        session_type: 'voice_with_music',
        participants: [
          {
            user_id: user.user_id,
            username: user.username,
            profile_image_url: user.profile_image_url,
            status: 'active',
            mic_muted: false,
            speaker_muted: false,
            joined_at: new Date().toISOString()
          },
          {
            user_id: 'user2',
            username: 'JaneDoe',
            profile_image_url: null,
            status: 'active',
            mic_muted: true,
            speaker_muted: false,
            joined_at: new Date().toISOString()
          },
          {
            user_id: 'user3',
            username: 'BobSmith',
            profile_image_url: null,
            status: 'active',
            mic_muted: false,
            speaker_muted: true,
            joined_at: new Date().toISOString()
          }
        ],
        music: {
          current_track: {
            title: 'Sample Track',
            artist: 'Sample Artist',
            duration: 240,
            position: 45
          },
          playlist: [
            {
              id: 'track1',
              title: 'Sample Track',
              artist: 'Sample Artist',
              duration: 240
            },
            {
              id: 'track2',
              title: 'Another Track',
              artist: 'Another Artist',
              duration: 180
            }
          ],
          status: 'playing'
        },
        created_at: new Date().toISOString()
      };
      
      setSession(mockSession);
      setParticipants(mockSession.participants);
      
      // Initialize WebRTC
      initializeWebRTC();
      
      setError('');
    } catch (error) {
      console.error('Error fetching session details:', error);
      setError('Failed to load audio session. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const initializeWebRTC = async () => {
    try {
      setConnecting(true);
      
      // Request user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      // In a real implementation, we would:
      // 1. Connect to the signaling server
      // 2. Create RTCPeerConnection
      // 3. Add local stream tracks to the connection
      // 4. Set up event handlers for ICE candidates, etc.
      // 5. Create offer/answer based on the role
      
      // For the prototype, we'll simulate the connection
      setTimeout(() => {
        setWebrtcReady(true);
        setConnecting(false);
        setConnected(true);
      }, 1500);
      
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      setError('Failed to access microphone. Please check your permissions.');
      setConnecting(false);
    }
  };
  
  const handleMicToggle = async () => {
    const newMicState = !micMuted;
    setMicMuted(newMicState);
    
    // Update local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMicState;
      });
    }
    
    // In a real implementation, we would also update the server
    try {
      await api.put(`/api/audio/sessions/${sessionId}/status`, {
        mic_muted: newMicState
      });
      
      // Update local participant state
      const updatedParticipants = participants.map(p => 
        p.user_id === user.user_id 
          ? { ...p, mic_muted: newMicState } 
          : p
      );
      setParticipants(updatedParticipants);
    } catch (error) {
      console.error('Error updating mic status:', error);
      // Revert the UI state if the API call fails
      setMicMuted(!newMicState);
    }
  };
  
  const handleSpeakerToggle = async () => {
    const newSpeakerState = !speakerMuted;
    setSpeakerMuted(newSpeakerState);
    
    // In a real implementation, we would mute the remote audio streams
    
    // Update the server
    try {
      await api.put(`/api/audio/sessions/${sessionId}/status`, {
        speaker_muted: newSpeakerState
      });
      
      // Update local participant state
      const updatedParticipants = participants.map(p => 
        p.user_id === user.user_id 
          ? { ...p, speaker_muted: newSpeakerState } 
          : p
      );
      setParticipants(updatedParticipants);
    } catch (error) {
      console.error('Error updating speaker status:', error);
      // Revert the UI state if the API call fails
      setSpeakerMuted(!newSpeakerState);
    }
  };
  
  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    // In a real implementation, we would adjust the volume of the audio elements
  };
  
  const leaveSession = async () => {
    try {
      setLeaveLoading(true);
      
      // In a real implementation, we would:
      // 1. Close the RTCPeerConnection
      // 2. Notify the server that we're leaving
      
      await api.post(`/api/audio/sessions/${sessionId}/leave`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      navigate(`/groups/${sessionId}`);
    } catch (error) {
      console.error('Error leaving session:', error);
      setError('Failed to leave session. Please try again.');
      setLeaveLoading(false);
    }
  };
  
  // Inside your AudioSession component's return statement
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
        
        {/* Join/Leave buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleJoinAudio}
            disabled={isJoined}
          >
            Join Audio
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleLeaveAudio}
            disabled={!isJoined}
          >
            Leave Audio
          </Button>
        </Box>
        
        {/* Conditional rendering based on localStream */}
        {isJoined && (
          localStream ? (
            <Box>
              {/* Basic audio controls */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Audio Controls
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
                </Grid>
              </Paper>
              
              {/* Enhanced Audio Controls Component */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Advanced Audio Settings
                </Typography>
                
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
                
                {/* Volume Controls */}
                <Box sx={{ mb: 2 }}>
                  <Typography id="voice-volume-slider" gutterBottom>
                    Voice Volume
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item>
                      <VolumeDownIcon />
                    </Grid>
                    <Grid item xs>
                      <Slider
                        value={voiceVolume}
                        onChange={(e, newValue) => setVoiceVolume(newValue)}
                        aria-labelledby="voice-volume-slider"
                        min={0}
                        max={1}
                        step={0.01}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                      />
                    </Grid>
                    <Grid item>
                      <VolumeUpIcon />
                    </Grid>
                  </Grid>
                </Box>
                
                <Box>
                  <Typography id="music-volume-slider" gutterBottom>
                    Music Volume
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item>
                      <VolumeDownIcon />
                    </Grid>
                    <Grid item xs>
                      <Slider
                        value={musicVolume}
                        onChange={(e, newValue) => setMusicVolume(newValue)}
                        aria-labelledby="music-volume-slider"
                        min={0}
                        max={1}
                        step={0.01}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                      />
                    </Grid>
                    <Grid item>
                      <VolumeUpIcon />
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Box>
          ) : (
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
          )
        )}
      </Paper>
    </Container>
  );
};

export default AudioSession;
