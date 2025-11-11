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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as UploadIcon,
  Link as LinkIcon,
  MusicNote as MusicIcon
} from '@mui/icons-material';
import { useMusic } from '../../contexts/MusicContext';
import MusicPlaylist from '../../components/music/MusicPlaylist';
import MusicPlayer from '../../components/music/MusicPlayer';
import PlaylistImportAccordion from '../../components/music/PlaylistImportAccordion';

const MusicPlayerPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [showPlaylist, setShowPlaylist] = React.useState(false);
  const [showPlaylistImport, setShowPlaylistImport] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState('');
  
  const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://trafficjamz.v2u.us';
  
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
    clearPlaylist: musicClearPlaylist,
    loadAndPlay: musicLoadAndPlay,
    takeControl: takeMusicControl,
    releaseControl: releaseMusicControl,
    changeVolume: changeMusicVolume
  } = useMusic();

  /**
   * Handle file selection and upload
   */
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    
    // Filter audio files only
    const audioFiles = files.filter(file => {
      const isAudio = file.type.startsWith('audio/');
      const hasAudioExtension = /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
      return isAudio || hasAudioExtension;
    });

    if (audioFiles.length !== files.length) {
      setUploadError('Some files were skipped because they are not audio files');
    } else {
      setUploadError('');
    }

    if (audioFiles.length === 0) {
      setUploadError('Please select valid audio files');
      return;
    }

    // Upload the files
    await uploadFiles(audioFiles);
  };

  /**
   * Upload files to server
   */
  const uploadFiles = async (filesToUpload) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      const uploadedTracks = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        console.log(`📤 Uploading file ${i + 1}/${filesToUpload.length}: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/api/audio/sessions/${sessionId}/upload-music`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}: ${response.statusText}`);
        }

        const result = await response.json();
        uploadedTracks.push(result.track);

        // Update progress
        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
      }

      console.log('✅ All files uploaded successfully:', uploadedTracks);

      // Add tracks to playlist
      for (const track of uploadedTracks) {
        await musicAddTrack(track);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setUploadError(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle playlist import
   */
  const handlePlaylistImport = async (tracks) => {
    setShowPlaylistImport(false);
    setUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      console.log(`📥 Importing ${tracks.length} tracks from playlist`);
      
      const uploadedTracks = [];
      
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        console.log(`📤 Processing track ${i + 1}/${tracks.length}: ${track.title}`);

        const response = await fetch(`${API_URL}/api/audio/sessions/${sessionId}/import-track`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            track: {
              title: track.title,
              artist: track.artist,
              album: track.album,
              duration: track.duration,
              albumArt: track.albumArt,
              source: track.source,
              externalId: track.id,
              previewUrl: track.previewUrl,
              streamUrl: track.streamUrl
            }
          })
        });

        if (!response.ok) {
          console.warn(`⚠️ Failed to import ${track.title}: ${response.statusText}`);
          continue;
        }

        const result = await response.json();
        uploadedTracks.push(result.track);

        // Update progress
        setUploadProgress(((i + 1) / tracks.length) * 100);
      }

      console.log('✅ Playlist import completed:', uploadedTracks);

      // Add tracks to playlist
      for (const track of uploadedTracks) {
        await musicAddTrack(track);
      }

      if (uploadedTracks.length < tracks.length) {
        setUploadError(`Imported ${uploadedTracks.length} of ${tracks.length} tracks. Some tracks may not be available.`);
      }

    } catch (error) {
      console.error('❌ Playlist import failed:', error);
      setUploadError(`Import failed: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle clear playlist confirmation
   */
  const handleClearPlaylist = async () => {
    if (!window.confirm('Are you sure you want to clear all tracks from the playlist? This cannot be undone.')) {
      return;
    }

    try {
      await musicClearPlaylist();
      setShowPlaylist(false);
      console.log('✅ Playlist cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear playlist:', error);
      setUploadError(`Failed to clear playlist: ${error.message}`);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
      {/* App Bar - Simple header */}
      <AppBar position="static" color="secondary">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(`/groups/${groupId}`)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Music Player
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Content Area */}
      <Box sx={{ p: 2 }}>
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
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'center' }}>
          <MusicIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Add Music to Session
          </Typography>
        </Box>

        {/* Icons */}
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
              onChange={handleFileSelect}
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
                onClick={() => setShowPlaylistImport(true)}
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
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={() => setShowPlaylist(!showPlaylist)}
            disabled={!sessionId || playlist.length === 0}
          >
            {showPlaylist ? 'Hide Playlist' : `View Playlist (${playlist.length})`}
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            onClick={handleClearPlaylist}
            disabled={!sessionId || playlist.length === 0 || !isMusicController}
          >
            Clear All Tracks
          </Button>
        </Box>
      </Paper>

      {/* Playlist Import Dialog */}
      <Dialog 
        open={showPlaylistImport} 
        onClose={() => setShowPlaylistImport(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Link Playlist</DialogTitle>
        <DialogContent>
          <PlaylistImportAccordion
            sessionId={sessionId}
            onImport={handlePlaylistImport}
          />
        </DialogContent>
      </Dialog>

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
      </Box>
    </Box>
  );
};

export default MusicPlayerPage;
