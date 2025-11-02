import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Chip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  MusicNote as MusicIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';

const MusicUpload = ({ onTracksAdded, sessionId, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://trafficjamz.onrender.com';

  /**
   * Handle file selection
   */
  const handleFileSelect = (event) => {
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

    setSelectedFiles(prev => [...prev, ...audioFiles]);
  };

  /**
   * Remove a selected file
   */
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Clear all selected files
   */
  const clearFiles = () => {
    setSelectedFiles([]);
    setError('');
  };

  /**
   * Upload files to server and add to playlist
   */
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select some music files first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const uploadedTracks = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log(`📤 Uploading file ${i + 1}/${selectedFiles.length}: ${file.name}`);

        const formData = new FormData();
        formData.append('music', file);
        formData.append('sessionId', sessionId);

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
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      console.log('✅ All files uploaded successfully:', uploadedTracks);

      // Notify parent component
      if (onTracksAdded) {
        onTracksAdded(uploadedTracks);
      }

      // Clear selected files
      clearFiles();
      
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
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            fullWidth
          >
            Choose Music Files
          </Button>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC
          </Typography>
        </Box>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">
                Selected Files ({selectedFiles.length})
              </Typography>
              <Button size="small" onClick={clearFiles} disabled={uploading}>
                Clear All
              </Button>
            </Box>

            <List dense>
              {selectedFiles.map((file, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={file.name}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip 
                          label={formatFileSize(file.size)} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={file.type || 'Unknown'} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Upload Progress */}
        {uploading && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Uploading... {Math.round(uploadProgress)}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        {/* Upload Button */}
        <Button
          variant="contained"
          startIcon={<PlayIcon />}
          onClick={handleUpload}
          disabled={disabled || uploading || selectedFiles.length === 0}
          fullWidth
        >
          {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Track${selectedFiles.length !== 1 ? 's' : ''}`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MusicUpload;
