import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  MusicNote as MusicIcon
} from '@mui/icons-material';

const MusicUpload = ({ onTracksAdded, sessionId, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://trafficjamz.onrender.com';

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
          >
            {uploading ? 'Uploading...' : 'Add Music Files'}
          </Button>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC
          </Typography>
        </Box>

        {/* Upload Progress */}
        {uploading && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Uploading... {Math.round(uploadProgress)}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MusicUpload;
