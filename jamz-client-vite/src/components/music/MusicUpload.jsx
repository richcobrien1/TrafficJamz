import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  MusicNote as MusicIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import PlaylistImportAccordion from './PlaylistImportAccordion';

const MusicUpload = ({ onTracksAdded, sessionId, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://trafficjamz.v2u.us';

  /**
   * Handle file selection - automatically upload after selection
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
      setError('Some files were skipped because they are not audio files');
    } else {
      setError('');
    }

    if (audioFiles.length === 0) {
      setError('Please select valid audio files');
      return;
    }

    // Immediately upload the selected files
    await uploadFiles(audioFiles);
  };

  /**
   * Upload files to server and add to playlist
   */
  const uploadFiles = async (filesToUpload) => {
    setUploading(true);
    setUploadProgress(0);
    setError('');

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
        console.log('📤 Upload response for', file.name, ':', {
          hasTrack: !!result.track,
          trackTitle: result.track?.title,
          hasAlbumArt: !!result.track?.albumArt,
          albumArtLength: result.track?.albumArt?.length,
          albumArtPrefix: result.track?.albumArt?.substring(0, 50),
          trackKeys: Object.keys(result.track || {})
        });
        
        uploadedTracks.push(result.track);

        // Update progress
        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
      }

      console.log('✅ All files uploaded successfully:', uploadedTracks);

      // Notify parent component
      if (onTracksAdded) {
        onTracksAdded(uploadedTracks);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setError(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle playlist import from music platforms
   */
  const handlePlaylistImport = async (tracks) => {
    setPlaylistDialogOpen(false);
    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      console.log(`📥 Importing ${tracks.length} tracks from playlist`);
      
      // Upload tracks to the session
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
              source: track.source, // 'spotify', 'youtube', 'appleMusic'
              externalId: track.id,
              previewUrl: track.previewUrl,
              streamUrl: track.streamUrl
            }
          })
        });

        if (!response.ok) {
          console.warn(`⚠️ Failed to import ${track.title}: ${response.statusText}`);
          continue; // Skip failed tracks
        }

        const result = await response.json();
        uploadedTracks.push(result.track);

        // Update progress
        setUploadProgress(((i + 1) / tracks.length) * 100);
      }

      console.log('✅ Playlist import completed:', uploadedTracks);

      // Notify parent component
      if (onTracksAdded && uploadedTracks.length > 0) {
        onTracksAdded(uploadedTracks);
      }

      if (uploadedTracks.length < tracks.length) {
        setError(`Imported ${uploadedTracks.length} of ${tracks.length} tracks. Some tracks may not be available.`);
      }

    } catch (error) {
      console.error('❌ Playlist import failed:', error);
      setError(`Import failed: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <MusicIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Add Music to Session
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Icon-based actions */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 4, 
          my: 3 
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
              disabled={disabled || uploading}
            />
            <Tooltip title="Upload Music Files" arrow>
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
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
                onClick={() => setPlaylistDialogOpen(true)}
                disabled={disabled || uploading}
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

        {/* Upload Progress */}
        {uploading && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {uploadProgress < 100 ? 'Uploading...' : 'Processing...'} {Math.round(uploadProgress)}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        {/* Playlist Import Dialog */}
        <Dialog 
          open={playlistDialogOpen} 
          onClose={() => setPlaylistDialogOpen(false)}
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
      </CardContent>
    </Card>
  );
};

export default MusicUpload;
