import React, { useState } from 'react';
import {
  Box,
  Button,
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
  Tooltip,
  Checkbox
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
  onClearPlaylist,
  disabled = false
}) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState(new Set());
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

  /**
   * Toggle selection mode
   */
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedTracks(new Set());
  };

  /**
   * Toggle track selection
   */
  const toggleTrackSelection = (trackId) => {
    const newSelected = new Set(selectedTracks);
    if (newSelected.has(trackId)) {
      newSelected.delete(trackId);
    } else {
      newSelected.add(trackId);
    }
    setSelectedTracks(newSelected);
  };

  /**
   * Toggle select all
   */
  const toggleSelectAll = () => {
    if (selectedTracks.size === playlist.length) {
      setSelectedTracks(new Set());
    } else {
      setSelectedTracks(new Set(playlist.map(track => track.id || track._id)));
    }
  };

  /**
   * Delete selected tracks
   */
  const deleteSelectedTracks = () => {
    if (isController && onRemoveTrack) {
      selectedTracks.forEach(trackId => {
        onRemoveTrack(trackId);
      });
      setSelectedTracks(new Set());
      setSelectionMode(false);
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!selectionMode && <PlaylistIcon sx={{ mr: 1, color: 'primary.main' }} />}
            
            {/* Select All Checkbox - Only shown in selection mode */}
            {selectionMode && isController && (
              <Tooltip title="Select All">
                <Checkbox
                  checked={selectedTracks.size === playlist.length}
                  indeterminate={selectedTracks.size > 0 && selectedTracks.size < playlist.length}
                  onChange={toggleSelectAll}
                  sx={{ p: 0.5 }}
                />
              </Tooltip>
            )}
            
            <Chip 
              label={selectionMode && selectedTracks.size > 0 
                ? `${selectedTracks.size} selected`
                : `${playlist.length} track${playlist.length !== 1 ? 's' : ''}`
              }
              size="small"
              sx={{ 
                bgcolor: selectionMode && selectedTracks.size > 0 ? 'warning.main' : 'primary.main',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Selection Mode Toggle - Shows trash icon */}
            {isController && !selectionMode && (
              <Tooltip title="Select tracks to delete">
                <IconButton
                  size="small"
                  onClick={toggleSelectionMode}
                  sx={{ 
                    color: 'text.secondary',
                    '&:hover': { color: 'error.main' }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {/* Cancel Selection Button */}
            {isController && selectionMode && (
              <Button
                variant="outlined"
                size="small"
                onClick={toggleSelectionMode}
              >
                Cancel
              </Button>
            )}
            
            {/* Delete Selected Button - Only shown when tracks are selected */}
            {isController && selectionMode && selectedTracks.size > 0 && (
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={deleteSelectedTracks}
                startIcon={<DeleteIcon />}
              >
                Delete ({selectedTracks.size})
              </Button>
            )}
            
            {/* Clear All Button - Only shown when NOT in selection mode */}
            {onClearPlaylist && !selectionMode && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={onClearPlaylist}
                disabled={!isController}
              >
                CLEAR ALL
              </Button>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Playlist Items - Mobile-first design with large touch targets */}
        <List sx={{ p: 0 }}>
          {playlist.map((track, index) => {
            // More robust current track matching - check multiple ID fields
            const isCurrentTrack = currentTrack && (
              currentTrack.id === track.id || 
              currentTrack._id === track._id ||
              currentTrack.id === track._id ||
              currentTrack._id === track.id
            );
            
            return (
              <Box
                key={track.id || index}
                sx={{
                  mb: 2,
                  position: 'relative'
                }}
              >
                {/* Checkbox for selection mode */}
                {selectionMode && isController && (
                  <Checkbox
                    checked={selectedTracks.has(track.id || track._id)}
                    onChange={() => toggleTrackSelection(track.id || track._id)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ 
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 3,
                      bgcolor: 'rgba(255,255,255,0.9)',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,1)'
                      }
                    }}
                  />
                )}

                {/* Main clickable area - full panel for mobile touch */}
                <Box
                  onClick={() => {
                    if (selectionMode && isController) {
                      toggleTrackSelection(track.id || track._id);
                    } else if (isController && !isCurrentTrack && !disabled) {
                      handlePlayTrack(track);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    pl: selectionMode && isController ? 7 : 2,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: isCurrentTrack ? 'primary.main' : 
                               (selectionMode && selectedTracks.has(track.id || track._id)) ? 'warning.main' : 'divider',
                    cursor: (isController && !disabled) ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    minHeight: { xs: 80, sm: 72 },
                    position: 'relative',
                    overflow: 'hidden',
                    // Full background with album art for currently playing track - BRIGHT!
                    ...(isCurrentTrack && track.albumArt && {
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `url(${track.albumArt})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(8px) brightness(0.6)',  // INCREASED from 0.3 to 0.6
                        zIndex: 0
                      }
                    }),
                    // Subtle blurred background for non-playing tracks
                    ...(!isCurrentTrack && track.albumArt && {
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `url(${track.albumArt})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(20px)',
                        opacity: 0.15,
                        zIndex: 0
                      }
                    }),
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
                      variant="rounded"
                      sx={{ 
                        mr: 2, 
                        width: { xs: 72, sm: 64 },
                        height: { xs: 72, sm: 64 },
                        border: '2px solid',
                        borderColor: 'rgba(255,255,255,0.1)',
                        flexShrink: 0,
                        boxShadow: 2,
                        borderRadius: 2,
                        position: 'relative',
                        zIndex: 1
                      }}
                    />
                  ) : (
                    <Avatar 
                      variant="rounded"
                      sx={{ 
                        mr: 2, 
                        width: { xs: 72, sm: 64 },
                        height: { xs: 72, sm: 64 },
                        bgcolor: isCurrentTrack ? 'primary.main' : 'grey.400',
                        flexShrink: 0,
                        borderRadius: 2,
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      <MusicIcon sx={{ fontSize: { xs: 36, sm: 32 } }} />
                    </Avatar>
                  )}

                  {/* Track Info - Takes remaining space */}
                  <Box sx={{ flex: 1, minWidth: 0, pr: 0, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: isCurrentTrack ? 'bold' : '600',
                          color: isCurrentTrack ? 'white' : 'text.primary',
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
                      color={isCurrentTrack ? 'rgba(255,255,255,0.8)' : 'text.secondary'}
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
                      {track.duration && (
                        <Chip 
                          label={formatDuration(track.duration)} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            ...(isCurrentTrack && {
                              borderColor: 'rgba(255,255,255,0.5)',
                              color: 'white'
                            })
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
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
