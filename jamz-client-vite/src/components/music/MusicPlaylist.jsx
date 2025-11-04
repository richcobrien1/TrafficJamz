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

        {/* Playlist Items */}
        <List dense>
          {playlist.map((track, index) => {
            const isCurrentTrack = currentTrack && currentTrack.id === track.id;
            
            return (
              <ListItem
                key={track.id || index}
                sx={{
                  bgcolor: isCurrentTrack ? 'primary.50' : 'transparent',
                  borderRadius: 1,
                  mb: 1,
                  border: isCurrentTrack ? '1px solid' : '1px solid transparent',
                  borderColor: isCurrentTrack ? 'primary.200' : 'transparent'
                }}
              >
                {/* Track Avatar */}
                {track.albumArt ? (
                  <Avatar 
                    src={track.albumArt}
                    alt={track.album || track.title}
                    sx={{ 
                      mr: 2, 
                      width: 40, 
                      height: 40,
                      border: isCurrentTrack ? '2px solid' : 'none',
                      borderColor: isCurrentTrack ? 'primary.main' : 'transparent'
                    }}
                  />
                ) : (
                  <Avatar 
                    sx={{ 
                      mr: 2, 
                      width: 40, 
                      height: 40,
                      bgcolor: isCurrentTrack ? 'primary.main' : 'grey.400'
                    }}
                  >
                    <MusicIcon fontSize="small" />
                  </Avatar>
                )}

                {/* Track Info */}
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: isCurrentTrack ? 'bold' : 'normal',
                          color: isCurrentTrack ? 'primary.main' : 'text.primary'
                        }}
                      >
                        {track.title}
                      </Typography>
                      {isCurrentTrack && (
                        <Chip 
                          label="Now Playing" 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {track.artist || 'Unknown Artist'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {track.duration && (
                          <Chip 
                            label={formatDuration(track.duration)} 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                        {track.file_size && (
                          <Chip 
                            label={formatFileSize(track.file_size)} 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                        {track.added_by && (
                          <Tooltip title={`Added by ${track.added_by_name || 'Unknown'}`}>
                            <Chip 
                              icon={<PersonIcon />}
                              label={track.added_by_name || 'Unknown'}
                              size="small" 
                              variant="outlined"
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  }
                />

                {/* Actions */}
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Play Button - only show when NOT currently playing this track */}
                    {isController && !isCurrentTrack && (
                      <Tooltip title="Play this track">
                        <IconButton
                          edge="end"
                          onClick={() => handlePlayTrack(track)}
                          disabled={disabled}
                          size="small"
                          sx={{
                            color: 'primary.main'
                          }}
                        >
                          <PlayIcon />
                        </IconButton>
                      </Tooltip>
                    )}

                    {/* Remove Button */}
                    {isController && (
                      <Tooltip title="Remove from playlist">
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveTrack(track.id)}
                          disabled={disabled}
                          size="small"
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
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
