import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Avatar,
  Chip,
  Divider,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  MusicNote as MusicIcon,
  QueueMusic as PlaylistIcon,
  Person as PersonIcon
} from '@mui/icons-material';

const MusicPlaylist = ({
  playlist = [],
  currentTrack,
  isController,
  onPlayTrack,
  onRemoveTrack,
  disabled = false
}) => {
  /**
   * Format duration for display
   */
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  /**
   * Handle track play
   */
  const handlePlayTrack = (track) => {
    if (isController && onPlayTrack) {
      onPlayTrack(track);
    }
  };

  /**
   * Handle track removal
   */
  const handleRemoveTrack = (trackId) => {
    if (isController && onRemoveTrack) {
      onRemoveTrack(trackId);
    }
  };

  if (playlist.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <PlaylistIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No tracks in playlist
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload some music to build your playlist!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PlaylistIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Playlist
          </Typography>
          <Chip 
            label={`${playlist.length} track${playlist.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{ ml: 2 }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Playlist Items - Mobile-first design with large touch targets */}
        <List sx={{ p: 0 }}>
          {playlist.map((track, index) => {
            const isCurrentTrack = currentTrack && currentTrack.id === track.id;
            
            return (
              <Box
                key={track.id || index}
                sx={{
                  mb: 2,
                  position: 'relative'
                }}
              >
                {/* Main clickable area - full panel for mobile touch */}
                <Box
                  onClick={() => isController && !isCurrentTrack && !disabled && handlePlayTrack(track)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    bgcolor: isCurrentTrack ? 'primary.50' : 'background.paper',
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: isCurrentTrack ? 'primary.main' : 'divider',
                    cursor: isController && !isCurrentTrack && !disabled ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    minHeight: { xs: 80, sm: 72 },
                    '&:hover': isController && !isCurrentTrack && !disabled ? {
                      bgcolor: 'primary.50',
                      borderColor: 'primary.light',
                      transform: 'translateY(-2px)',
                      boxShadow: 2
                    } : {},
                    '&:active': isController && !isCurrentTrack && !disabled ? {
                      transform: 'translateY(0)',
                      boxShadow: 1
                    } : {}
                  }}
                >
                  {/* Album Art - Larger for touch */}
                  {track.albumArt ? (
                    <Avatar 
                      src={track.albumArt}
                      alt={track.album || track.title}
                      sx={{ 
                        mr: 2, 
                        width: { xs: 56, sm: 48 },
                        height: { xs: 56, sm: 48 },
                        border: isCurrentTrack ? '3px solid' : 'none',
                        borderColor: isCurrentTrack ? 'primary.main' : 'transparent',
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <Avatar 
                      sx={{ 
                        mr: 2, 
                        width: { xs: 56, sm: 48 },
                        height: { xs: 56, sm: 48 },
                        bgcolor: isCurrentTrack ? 'primary.main' : 'grey.400',
                        flexShrink: 0
                      }}
                    >
                      <MusicIcon sx={{ fontSize: { xs: 28, sm: 24 } }} />
                    </Avatar>
                  )}

                  {/* Track Info - Takes remaining space */}
                  <Box sx={{ flex: 1, minWidth: 0, pr: isController ? 6 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: isCurrentTrack ? 'bold' : '600',
                          color: isCurrentTrack ? 'primary.main' : 'text.primary',
                          fontSize: { xs: '1rem', sm: '0.95rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {track.title}
                      </Typography>
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        mb: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {track.artist || 'Unknown Artist'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      {isCurrentTrack && (
                        <Chip 
                          label="Now Playing" 
                          size="small" 
                          color="primary"
                          variant="filled"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                      {track.duration && (
                        <Chip 
                          label={formatDuration(track.duration)} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Play indicator for current track */}
                  {isCurrentTrack && (
                    <Box sx={{ 
                      position: 'absolute',
                      right: 16,
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}>
                      <PlayIcon sx={{ color: 'primary.main', fontSize: 32 }} />
                    </Box>
                  )}
                </Box>

                {/* Delete button - Separate for controller, large touch target */}
                {isController && (
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTrack(track.id);
                    }}
                    disabled={disabled}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'error.main',
                      color: 'white',
                      width: { xs: 40, sm: 36 },
                      height: { xs: 40, sm: 36 },
                      '&:hover': {
                        bgcolor: 'error.dark'
                      },
                      '&:disabled': {
                        bgcolor: 'action.disabledBackground',
                        color: 'action.disabled'
                      },
                      zIndex: 1
                    }}
                    aria-label="Remove track"
                  >
                    <DeleteIcon sx={{ fontSize: { xs: 20, sm: 18 } }} />
                  </IconButton>
                )}
              </Box>
            );
          })}
        </List>

        {/* Controller Info */}
        {!isController && playlist.length > 0 && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              Only the DJ can play tracks or modify the playlist
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MusicPlaylist;
