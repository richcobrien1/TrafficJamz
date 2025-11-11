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
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as UploadIcon,
  Link as LinkIcon
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
  const fileInputRef = React.useRef(null);
  const [uploading, setUploading] = React.useState(false);
  
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
      {/* App Bar - Simple header */}
      <AppBar position="static" color="secondary" sx={{ mb: 3 }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(`/groups/${groupId}`)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Music Player
          </Typography>
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

      {/* Upload and Playlist Icons Panel */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 4 
        }}>
          {/* Upload Files Icon */}
          <Box sx={{ textAlign: 'center' }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
              onChange={(e) => {
                setShowUpload(true);
                // The MusicUpload component will handle the actual upload
              }}
              style={{ display: 'none' }}
              disabled={!sessionId || uploading}
            />
            <Tooltip title="Upload Music Files" arrow>
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={!sessionId || uploading}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                  }
                }}
              >
                <UploadIcon sx={{ fontSize: 40 }} />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
              Upload Files
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              MP3, WAV, M4A, etc.
            </Typography>
          </Box>

          {/* Link Playlist Icon */}
          <Box sx={{ textAlign: 'center' }}>
            <Tooltip title="Link Playlist from Spotify/YouTube/Apple Music" arrow>
              <IconButton
                onClick={() => setShowUpload(true)}
                disabled={!sessionId || uploading}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'secondary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'secondary.dark',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                  }
                }}
              >
                <LinkIcon sx={{ fontSize: 40 }} />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
              Link Playlist
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Spotify, YouTube, Apple
            </Typography>
          </Box>
        </Box>

        {/* View Playlist Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={() => setShowPlaylist(!showPlaylist)}
            disabled={!sessionId || playlist.length === 0}
          >
            {showPlaylist ? 'Hide Playlist' : `View Playlist (${playlist.length})`}
          </Button>
        </Box>
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
