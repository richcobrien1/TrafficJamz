import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Button,
  Grid
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as UploadIcon,
  QueueMusic as PlaylistIcon
} from '@mui/icons-material';
import { useMusic } from '../../contexts/MusicContext';
import MusicUpload from '../../components/music/MusicUpload';
import MusicPlaylist from '../../components/music/MusicPlaylist';
import MusicPlayer from '../../components/music/MusicPlayer';

const MusicPlayerPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = React.useState(false);
  const [showPlaylist, setShowPlaylist] = React.useState(false);
  
  // Music context
  const {
    currentTrack,
    playlist,
    isPlaying: musicIsPlaying,
    currentTime: musicCurrentTime,
    duration: musicDuration,
    volume: musicVolume,
    isController: isMusicController,
    sessionId,
    play: musicPlay,
    pause: musicPause,
    seekTo: musicSeek,
    playNext: musicNext,
    playPrevious: musicPrevious,
    addTrack: musicAddTrack,
    removeTrack: musicRemoveTrack,
    loadAndPlay: musicLoadAndPlay,
    takeControl: takeMusicControl,
    releaseControl: releaseMusicControl,
    changeVolume: changeMusicVolume
  } = useMusic();

  return (
    <Container maxWidth="lg" sx={{ pb: 4 }}>
      {/* App Bar with Upload and Playlist on opposite sides */}
      <AppBar position="static" color="secondary" sx={{ mb: 3 }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(`/groups/${groupId}`)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Music Player
          </Typography>
          
          {/* Upload Button - Right Side */}
          <Button
            color="inherit"
            startIcon={<UploadIcon />}
            onClick={() => setShowUpload(!showUpload)}
            sx={{ mr: 1 }}
          >
            Upload
          </Button>
          
          {/* Playlist Button - Far Right */}
          <Button
            color="inherit"
            startIcon={<PlaylistIcon />}
            onClick={() => setShowPlaylist(!showPlaylist)}
          >
            Playlist ({playlist.length})
          </Button>
        </Toolbar>
      </AppBar>

      {/* Music Player - Always Visible */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
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
          disabled={!sessionId}
        />
      </Paper>

      {/* Upload Section - Toggleable */}
      {showUpload && (
        <Box sx={{ mb: 3 }}>
          <MusicUpload
            sessionId={sessionId}
            onTracksAdded={async (tracks) => {
              for (const track of tracks) {
                await musicAddTrack(track);
              }
              setShowUpload(false); // Auto-close after upload
            }}
            disabled={!sessionId}
          />
        </Box>
      )}

      {/* Playlist Section - Toggleable */}
      {showPlaylist && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Playlist ({playlist.length} tracks)
            </Typography>
            <Button size="small" onClick={() => setShowPlaylist(false)}>
              Close
            </Button>
          </Box>
          <MusicPlaylist
            playlist={playlist}
            currentTrack={currentTrack}
            isController={isMusicController}
            onPlayTrack={(track) => musicLoadAndPlay(track)}
            onRemoveTrack={(trackId) => musicRemoveTrack(trackId)}
            disabled={!sessionId}
          />
        </Paper>
      )}
    </Container>
  );
};

export default MusicPlayerPage;
