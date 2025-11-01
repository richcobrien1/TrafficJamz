// Music Player Component for synchronized group playback
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Slider,
  LinearProgress,
  Chip,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as VolumeMuteIcon,
  QueueMusic as PlaylistIcon,
  Close as CloseIcon,
  MusicNote as MusicNoteIcon,
  PersonPin as DJIcon
} from '@mui/icons-material';

const MusicPlayer = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  playlist,
  isController,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onClose,
  onTakeControl,
  onReleaseControl,
  onSelectTrack
}) => {
  const [showPlaylist, setShowPlaylist] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [previousVolume, setPreviousVolume] = React.useState(volume);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeToggle = () => {
    if (isMuted) {
      onVolumeChange(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      onVolumeChange(0);
      setIsMuted(true);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: { xs: '90%', sm: 400 },
        zIndex: 1300,
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      {/* Progress Bar */}
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ height: 3 }}
      />

      {/* Close Button */}
      <IconButton
        size="small"
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      {/* Main Player */}
      <Box sx={{ p: 2, pt: 1 }}>
        {/* Track Info */}
        <Box sx={{ mb: 2, pr: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <MusicNoteIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {currentTrack?.title || 'No track playing'}
            </Typography>
          </Box>
          {currentTrack?.artist && (
            <Typography variant="body2" color="text.secondary">
              {currentTrack.artist}
            </Typography>
          )}
          
          {/* Controller Badge */}
          {isController && (
            <Chip
              icon={<DJIcon />}
              label="You're DJ"
              size="small"
              color="primary"
              sx={{ mt: 1 }}
              onDelete={onReleaseControl}
            />
          )}
          {!isController && (
            <Chip
              label="Take DJ control"
              size="small"
              variant="outlined"
              sx={{ mt: 1 }}
              onClick={onTakeControl}
            />
          )}
        </Box>

        {/* Time Slider */}
        <Box sx={{ mb: 2 }}>
          <Slider
            value={currentTime}
            max={duration || 100}
            onChange={(_, value) => onSeek(value)}
            disabled={!isController}
            size="small"
            sx={{ mb: 0.5 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              {formatTime(currentTime)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTime(duration)}
            </Typography>
          </Box>
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
          <Tooltip title="Previous">
            <span>
              <IconButton 
                onClick={onPrevious}
                disabled={!isController}
              >
                <PrevIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
            <span>
              <IconButton
                onClick={isPlaying ? onPause : onPlay}
                disabled={!isController || !currentTrack}
                color="primary"
                sx={{ 
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&:disabled': { bgcolor: 'grey.300' }
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Next">
            <span>
              <IconButton 
                onClick={onNext}
                disabled={!isController}
              >
                <NextIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Volume and Playlist */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Volume Control */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <IconButton size="small" onClick={handleVolumeToggle}>
              {isMuted || volume === 0 ? <VolumeMuteIcon /> : <VolumeIcon />}
            </IconButton>
            <Slider
              value={isMuted ? 0 : volume}
              max={1}
              step={0.01}
              onChange={(_, value) => {
                onVolumeChange(value);
                setIsMuted(value === 0);
              }}
              size="small"
              sx={{ width: 100 }}
            />
          </Box>

          {/* Playlist Toggle */}
          <Tooltip title="Playlist">
            <IconButton 
              size="small"
              onClick={() => setShowPlaylist(!showPlaylist)}
              color={showPlaylist ? 'primary' : 'default'}
            >
              <PlaylistIcon />
              {playlist.length > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem'
                  }}
                >
                  {playlist.length}
                </Typography>
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Playlist */}
      <Collapse in={showPlaylist}>
        <Box sx={{ 
          maxHeight: 200, 
          overflow: 'auto',
          bgcolor: 'grey.50',
          borderTop: 1,
          borderColor: 'divider'
        }}>
          {playlist.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No tracks in playlist
              </Typography>
            </Box>
          ) : (
            <List dense>
              {playlist.map((track, index) => (
                <ListItem
                  key={track.id}
                  button
                  selected={currentTrack?.id === track.id}
                  onClick={() => isController && onSelectTrack(track)}
                  disabled={!isController}
                >
                  <ListItemText
                    primary={track.title}
                    secondary={track.artist}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <ListItemSecondaryAction>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(track.duration)}
                    </Typography>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default MusicPlayer;
