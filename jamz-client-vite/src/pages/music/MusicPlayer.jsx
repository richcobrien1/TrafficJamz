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
  DialogContent,
  CircularProgress,
  Fade,
  LinearProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as UploadIcon,
  Link as LinkIcon,
  MusicNote as MusicIcon,
  People as PeopleIcon,
  MusicNoteOutlined as MusicNoteOutlinedIcon,
  Headset as HeadsetIcon,
  HeadsetOff as HeadsetOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  LocationOn as MapIcon
} from '@mui/icons-material';
import { useMusic } from '../../contexts/MusicContext';
import MusicPlaylist from '../../components/music/MusicPlaylist';
import MusicPlayer from '../../components/music/MusicPlayer';
import PlaylistImportAccordion from '../../components/music/PlaylistImportAccordion';

const MusicPlayerPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = React.useState(null);
  const [showPlaylistImport, setShowPlaylistImport] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState('');
  const [isInitializing, setIsInitializing] = React.useState(true);
  const initializationRef = React.useRef(false);
  
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
    refreshPlaylist: musicRefreshPlaylist,
    loadAndPlay: musicLoadAndPlay,
    takeControl: takeMusicControl,
    releaseControl: releaseMusicControl,
    changeVolume: changeMusicVolume,
    initializeSession
  } = useMusic();

  // Debug: Log the functions to verify they exist
  React.useEffect(() => {
    console.log('🎵 [MusicPlayer Page] Music functions:', {
      hasPlayNext: typeof musicNext === 'function',
      hasPrev: typeof musicPrevious === 'function',
      hasPlay: typeof musicPlay === 'function',
      hasPause: typeof musicPause === 'function',
      isController: isMusicController
    });
  }, [musicNext, musicPrevious, musicPlay, musicPause, isMusicController]);

  /**
   * Initialize music session when component mounts
   */
  React.useEffect(() => {
    const initMusic = async () => {
      // Prevent multiple initializations
      if (initializationRef.current) {
        console.log('🎵 Already initialized, skipping');
        return;
      }
      
      if (!groupId) {
        console.error('No groupId provided');
        setIsInitializing(false);
        return;
      }

      initializationRef.current = true;
      
      try {
        const token = localStorage.getItem('token');
        
        // Fetch group details
        const groupResponse = await fetch(`${API_URL}/api/groups/${groupId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          setGroup(groupData.group);
        }
        
        // Fetch or create an active audio session for this group
        const response = await fetch(`${API_URL}/api/audio/sessions/group/${groupId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch audio session');
        }

        const data = await response.json();
        const audioSessionId = data.session?._id || data.session?.id;

        if (audioSessionId) {
          console.log('🎵 Initializing music session:', audioSessionId);
          initializeSession(audioSessionId, groupId);
        } else {
          console.error('No active audio session found for group:', groupId);
        }
      } catch (error) {
        console.error('Error initializing music session:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]); // Only run when groupId changes, not when initializeSession reference changes

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
      const totalFiles = filesToUpload.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = filesToUpload[i];
        console.log(`📤 Uploading file ${i + 1}/${totalFiles}: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);

        // Use XMLHttpRequest for progress tracking
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          // Track cumulative upload progress across all files
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              // Calculate: (completed files + current file progress) / total files
              const currentFileProgress = (e.loaded / e.total);
              const totalProgress = ((i + currentFileProgress) / totalFiles) * 100;
              setUploadProgress(Math.round(totalProgress));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const result = JSON.parse(xhr.responseText);
              console.log('✅ Upload response:', result);
              uploadedTracks.push(result.track);
              resolve();
            } else {
              reject(new Error(`Upload failed for ${file.name}: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error(`Network error uploading ${file.name}`));
          });

          xhr.open('POST', `${API_URL}/api/audio/sessions/${sessionId}/upload-music`);
          xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
          xhr.send(formData);
        });
      }

      console.log('✅ All files uploaded successfully:', uploadedTracks);
      setUploadProgress(100);

      // Refresh playlist from backend to show newly uploaded tracks
      try {
        await musicRefreshPlaylist();
        console.log('✅ Playlist refreshed after upload');
      } catch (refreshError) {
        console.error('Failed to refresh playlist:', refreshError);
      }

      // Wait a moment to show 100% completion, then reset
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 800);

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setUploadError(`Upload failed: ${error.message}`);
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
      const skippedTracks = [];
      
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        console.log(`📤 Processing track ${i + 1}/${tracks.length}: ${track.title}`);

        // Check if track has a playable URL
        const hasPlayableUrl = track.url || track.previewUrl || track.spotifyPreviewUrl || track.youtubeUrl || track.youtubeId;
        if (!hasPlayableUrl) {
          console.warn(`⚠️ Skipping track without playable URL: ${track.title} by ${track.artist}`);
          skippedTracks.push(track);
          setUploadProgress(((i + 1) / tracks.length) * 100);
          continue;
        }

        const trackPayload = {
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration,
          albumArt: track.albumArt,
          source: track.source,
          externalId: track.id,
          url: track.url,
          previewUrl: track.previewUrl || track.spotifyPreviewUrl,
          spotifyPreviewUrl: track.spotifyPreviewUrl,
          streamUrl: track.streamUrl,
          youtubeUrl: track.youtubeUrl,
          youtubeId: track.youtubeId
        };

        console.log(`📦 Sending track data:`, {
          title: trackPayload.title,
          source: trackPayload.source,
          hasYoutubeId: !!trackPayload.youtubeId,
          youtubeId: trackPayload.youtubeId,
          hasUrl: !!trackPayload.url
        });

        const response = await fetch(`${API_URL}/api/audio/sessions/${sessionId}/import-track`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            track: trackPayload
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

      // Show summary message
      if (skippedTracks.length > 0) {
        const skippedMessage = skippedTracks.length === 1
          ? `1 track was skipped (no preview available): "${skippedTracks[0].title}"`
          : `${skippedTracks.length} tracks were skipped (no preview available)`;
        
        setUploadError(`Imported ${uploadedTracks.length} of ${tracks.length} tracks. ${skippedMessage}`);
      } else if (uploadedTracks.length < tracks.length) {
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
      console.log('✅ Playlist cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear playlist:', error);
      setUploadError(`Failed to clear playlist: ${error.message}`);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
      {/* App Bar - Blue to match Music category */}
      <AppBar position="static" sx={{ bgcolor: '#2196f3', backgroundColor: '#2196f3' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(`/groups/${groupId}`)}>
            <ArrowBackIcon />
          </IconButton>
          
          {/* Standard Icon Set - Left Justified */}
          <Tooltip title="Group Members">
            <IconButton 
              color="inherit"
              onClick={() => {/* TODO: Navigate to members list */}}
            >
              <PeopleIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Music Player (Active)">
            <IconButton 
              color="inherit"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
            >
              <MusicNoteOutlinedIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Voice Audio Off">
            <IconButton 
              color="inherit"
              onClick={() => {/* TODO: Toggle voice */}}
            >
              <HeadsetOffIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Microphone Off">
            <IconButton 
              color="inherit"
              onClick={() => {/* TODO: Toggle mic */}}
            >
              <MicOffIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Location Tracking">
            <IconButton 
              color="inherit"
              onClick={() => navigate(`/groups/${groupId}/location`)}
            >
              <MapIcon />
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1 }} />
          
          <span style={{ fontSize: '28px', marginRight: '8px' }}>🎵</span>
          <Typography variant="h6">
            Music
          </Typography>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Upload and Link Icons - Right aligned */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={!sessionId || uploading}
          />
          <Tooltip title="Link Playlist from Spotify/YouTube/Apple Music" arrow>
            <IconButton
              color="inherit"
              onClick={() => setShowPlaylistImport(true)}
              disabled={!sessionId || uploading}
            >
              <LinkIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Upload Music Files" arrow>
            <IconButton
              color="inherit"
              onClick={() => fileInputRef.current?.click()}
              disabled={!sessionId || uploading}
            >
              <UploadIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        {/* Discrete Upload Progress Bar */}
        {uploading && (
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress} 
            sx={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#4caf50'
              }
            }} 
          />
        )}
      </AppBar>

      {/* Vertical Group Name Panel */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 64,
          bottom: 0,
          width: '32px',
          zIndex: 10,
          bgcolor: '#2196f3',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: '8px',
          transition: 'all 0.3s ease',
          boxShadow: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            color: '#fff',
            fontWeight: 'bold',
            fontStyle: 'italic',
            letterSpacing: '0.05em',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
          }}
        >
          {group?.name || 'Music Player'}
        </Typography>
      </Box>

      {/* Upload Success/Error Snackbar */}
      <Snackbar
        open={!!uploadError}
        autoHideDuration={6000}
        onClose={() => setUploadError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setUploadError('')}>
          {uploadError}
        </Alert>
      </Snackbar>

      {/* Loading State */}
      {isInitializing ? (
        <Fade in={isInitializing}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '60vh',
            gap: 2
          }}>
            <CircularProgress size={60} />
            <Typography variant="h6" color="text.secondary">
              Loading Music Session...
            </Typography>
          </Box>
        </Fade>
      ) : (
        <>
          {/* Content Area */}
          <Box sx={{ p: 2 }}>
      {/* Music Player - Always Visible */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <MusicPlayer
          currentTrack={currentTrack}
          playlist={playlist}
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

      {/* Playlist Section - Always Visible */}
      {playlist.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <MusicPlaylist
            playlist={playlist}
            currentTrack={currentTrack}
            isController={isMusicController}
            onPlayTrack={(track) => musicLoadAndPlay(track)}
            onRemoveTrack={(trackId) => musicRemoveTrack(trackId)}
            onClearPlaylist={handleClearPlaylist}
            disabled={!sessionId}
          />
        </Paper>
      )}
      </Box>
        </>
      )}
    </Box>
  );
};

export default MusicPlayerPage;
