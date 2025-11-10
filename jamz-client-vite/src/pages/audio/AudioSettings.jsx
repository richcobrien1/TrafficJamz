import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
  MusicNote as MusicNoteIcon
} from '@mui/icons-material';
import { useMusic } from '../../contexts/MusicContext';
import MusicUpload from '../../components/music/MusicUpload';
import MusicPlaylist from '../../components/music/MusicPlaylist';
import MusicPlayer from '../../components/music/MusicPlayer';

const AudioSettings = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  
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
    <Container maxWidth="lg">
      {/* App Bar */}
      <AppBar position="static" color="primary" sx={{ mb: 3 }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(`/groups/${groupId}`)}>
            <ArrowBackIcon />
          </IconButton>
          <SettingsIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Audio & Music Session
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} centered>
          <Tab icon={<SettingsIcon />} label="Audio Settings" />
          <Tab icon={<MusicNoteIcon />} label="Music Player" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 ? (
        // Audio Settings Tab - Clean and simple
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
              <SettingsIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Audio Controls
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Voice and music audio are automatically managed.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Use your device volume buttons to adjust levels.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        // Music Player Tab
        <Grid container spacing={3}>
          {/* Music Player - Top Section */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
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
          </Grid>

          {/* Music Upload - Left Column */}
          <Grid item xs={12} md={6}>
            <MusicUpload
              sessionId={sessionId}
              onTracksAdded={async (tracks) => {
                for (const track of tracks) {
                  await musicAddTrack(track);
                }
              }}
              disabled={!sessionId}
            />
          </Grid>

          {/* Music Playlist - Right Column */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Playlist ({playlist.length} tracks)
              </Typography>
              <MusicPlaylist
                playlist={playlist}
                currentTrack={currentTrack}
                isController={isMusicController}
                onPlayTrack={(track) => musicLoadAndPlay(track)}
                onRemoveTrack={(trackId) => musicRemoveTrack(trackId)}
                disabled={!sessionId}
              />
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default AudioSettings;
