import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  MusicNote as MusicIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import PlaylistImportDialog from '../PlaylistImportDialog';

const MusicUpload = ({ onTracksAdded, sessionId, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
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

        {/* File Upload Button */}
        <Box sx={{ mb: 2 }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={disabled || uploading}
          />
          
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            fullWidth
            sx={{ mb: 1 }}
          >
            {uploading ? 'Uploading...' : 'Upload Music Files'}
          </Button>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
            Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC
          </Typography>

          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary">OR</Typography>
          </Divider>

          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={() => setShowImportDialog(true)}
            disabled={disabled || uploading}
            fullWidth
          >
            Link Playlist from Spotify/YouTube/Apple Music
          </Button>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            Import tracks from your connected music platforms
          </Typography>
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
        <PlaylistImportDialog
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImport={handlePlaylistImport}
        />
      </CardContent>
    </Card>
  );
};

export default MusicUpload;
