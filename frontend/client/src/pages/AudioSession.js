import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  MusicNote as MusicNoteIcon,
  Group as GroupIcon,
  ExitToApp as LeaveIcon
} from '@mui/icons-material';
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
  const [openMusicDialog, setOpenMusicDialog] = useState(false);
  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  
  // WebRTC related states
  const [webrtcReady, setWebrtcReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // References for WebRTC
  const localStreamRef = useRef(null);
  const rtcConnectionRef = useRef(null);
  
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
      // const response = await api.get(`/api/audio/sessions/group/${sessionId}`);
      // setSession(response.data.session);
      
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
      // await api.put(`/api/audio/sessions/${sessionId}/status`, {
      //   mic_muted: newMicState
      // });
      
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
      // await api.put(`/api/audio/sessions/${sessionId}/status`, {
      //   speaker_muted: newSpeakerState
      // });
      
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
      
      // await api.post(`/api/audio/sessions/${sessionId}/leave`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      navigate(`/groups/${sessionId}`);
    } catch (error) {
      console.error('Error leaving session:', error);
      setError('Failed to leave session. Please try again.');
      setLeaveLoading(false);
    }
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            sx={{ mr: 2 }}
            onClick={() => setOpenLeaveDialog(true)}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {loading ? 'Loading...' : `Audio Session${session?.music ? ' with Music' : ''}`}
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setOpenMusicDialog(true)}
            disabled={!session?.music}
          >
            <MusicNoteIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Container sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      ) : (
        <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
          {connecting && (
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="h6">
                Connecting to audio session...
              </Typography>
            </Box>
          )}
          
          {connected && (
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                Connected to audio session
              </Typography>
              {session?.music?.current_track && (
                <Paper sx={{ p: 2, display: 'inline-flex', alignItems: 'center' }}>
                  <MusicNoteIcon sx={{ mr: 1 }} />
                  <Typography variant="body1">
                    Now Playing: {session.music.current_track.title} - {session.music.current_track.artist}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Participants ({participants.length})
                </Typography>
                <List>
                  {participants.map((participant, index) => (
                    <React.Fragment key={participant.user_id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar src={participant.profile_image_url}>
                            {participant.username[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={
                            <>
                              {participant.username}
                              {participant.user_id === user.user_id && ' (You)'}
                            </>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {participant.mic_muted ? (
                                <MicOffIcon fontSize="small" color="disabled" sx={{ mr: 0.5 }} />
                              ) : (
                                <MicIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                              )}
                              {participant.speaker_muted ? (
                                <VolumeOffIcon fontSize="small" color="disabled" sx={{ mr: 0.5 }} />
                              ) : (
                                <VolumeUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < participants.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Audio Controls
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!micMuted}
                        onChange={handleMicToggle}
                        color="primary"
                      />
                    }
                    label={micMuted ? "Microphone Off" : "Microphone On"}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={handleMicToggle}>
                      {micMuted ? <MicOffIcon color="disabled" /> : <MicIcon color="primary" />}
                    </IconButton>
                    <Typography variant="body2" color={micMuted ? "text.secondary" : "primary"}>
                      {micMuted ? "Click to unmute" : "Click to mute"}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!speakerMuted}
                        onChange={handleSpeakerToggle}
                        color="primary"
                      />
                    }
                    label={speakerMuted ? "Speaker Off" : "Speaker On"}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={handleSpeakerToggle}>
                      {speakerMuted ? <VolumeOffIcon color="disabled" /> : <VolumeUpIcon color="primary" />}
                    </IconButton>
                    <Typography variant="body2" color={speakerMuted ? "text.secondary" : "primary"}>
                      {speakerMuted ? "Click to unmute" : "Click to mute"}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Typography id="volume-slider" gutterBottom>
                    Volume
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <VolumeOffIcon sx={{ mr: 2 }} />
                    <Slider
                      aria-labelledby="volume-slider"
                      value={volume}
                      onChange={handleVolumeChange}
                      disabled={speakerMuted}
                    />
                    <VolumeUpIcon sx={{ ml: 2 }} />
                  </Box>
                </Box>
                
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  startIcon={<LeaveIcon />}
                  onClick={() => setOpenLeaveDialog(true)}
                >
                  Leave Session
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      )}
      
      {/* Music Dialog */}
      <Dialog open={openMusicDialog} onClose={() => setOpenMusicDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Music Playlist</DialogTitle>
        <DialogContent>
          {session?.music?.current_track && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Now Playing
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="h6">
                  {session.music.current_track.title}
                </Typography>
                <Typography variant="body1">
                  {session.music.current_track.artist}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Slider
                    value={session.music.current_track.position}
                    max={session.music.current_track.duration}
                    aria-label="track position"
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => {
                      const minutes = Math.floor(value / 60);
                      const seconds = value % 60;
                      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }}
                  />
                </Box>
              </Paper>
            </Box>
          )}
          
          <Typography variant="subtitle1" gutterBottom>
            Playlist
          </Typography>
          <List>
            {session?.music?.playlist.map((track, index) => (
              <React.Fragment key={track.id}>
                <ListItem button>
                  <ListItemAvatar>
                    <Avatar>
                      <MusicNoteIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={track.title}
                    secondary={`${track.artist} • ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`}
                  />
                </ListItem>
                {index < session.music.playlist.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMusicDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Leave Session Dialog */}
      <Dialog open={openLeaveDialog} onClose={() => setOpenLeaveDialog(false)}>
        <DialogTitle>Leave Audio Session</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to leave this audio session?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLeaveDialog(false)}>Cancel</Button>
          <Button 
            onClick={leaveSession} 
            variant="contained"
            color="error"
            disabled={leaveLoading}
          >
            {leaveLoading ? <CircularProgress size={24} /> : 'Leave'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AudioSession;
