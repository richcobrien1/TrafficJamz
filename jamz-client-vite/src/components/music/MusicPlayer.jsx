import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Slider,
  Chip,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as VolumeOffIcon,
  MusicNote as MusicIcon,
  Radio as RadioIcon
} from '@mui/icons-material';

/**
 * MusicPlayer Component - Synchronized music playback control
 */
const MusicPlayer = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isController,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onTakeControl,
  onReleaseControl,
  disabled = false
}) => {
  /**
   * Format time for display
   */
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle seek slider change
   */
  const handleSeekChange = (event, newValue) => {
    if (onSeek && isController) {
      onSeek(newValue);
    }
  };

  /**
   * Handle volume slider change
   */
  const handleVolumeChange = (event, newValue) => {
    if (onVolumeChange) {
      onVolumeChange(newValue / 100);
    }
  };

  /**
   * Toggle play/pause
   */
  const handlePlayPause = () => {
    if (!isController) return;
    
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  };

  if (!currentTrack) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <MusicIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No music playing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload some tracks to get started!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        {/* Track Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
            <MusicIcon />
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {currentTrack.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {currentTrack.artist || 'Unknown Artist'}
            </Typography>
            {currentTrack.album && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {currentTrack.album}
              </Typography>
            )}
          </Box>
          
          {/* Controller Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isController ? (
              <Tooltip title="You are controlling playback">
                <Chip
                  icon={<RadioIcon />}
                  label="DJ Mode"
                  color="primary"
                  size="small"
                  onClick={onReleaseControl}
                  clickable
                />
              </Tooltip>
            ) : (
              <Tooltip title="Take control of playback">
                <Chip
                  icon={<RadioIcon />}
                  label="Take Control"
                  variant="outlined"
                  size="small"
                  onClick={onTakeControl}
                  clickable
                  disabled={disabled}
                />
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Slider
            value={currentTime || 0}
            max={duration || 100}
            onChange={handleSeekChange}
            disabled={!isController || disabled}
            sx={{ 
              color: isController ? 'primary.main' : 'grey.400',
              '& .MuiSlider-thumb': {
                display: isController ? 'block' : 'none'
              }
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -1 }}>
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
          <IconButton
            onClick={onPrevious}
            disabled={!isController || disabled}
            size="large"
          >
            <PrevIcon />
          </IconButton>
          
          <IconButton
            onClick={handlePlayPause}
            disabled={!isController || disabled}
            size="large"
            sx={{ 
              bgcolor: isController ? 'primary.main' : 'grey.300',
              color: isController ? 'white' : 'grey.600',
              '&:hover': {
                bgcolor: isController ? 'primary.dark' : 'grey.400'
              },
              '&:disabled': {
                bgcolor: 'grey.200',
                color: 'grey.500'
              }
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          
          <IconButton
            onClick={onNext}
            disabled={!isController || disabled}
            size="large"
          >
            <NextIcon />
          </IconButton>
        </Box>

        {/* Volume Control */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton size="small">
            {volume > 0 ? <VolumeIcon /> : <VolumeOffIcon />}
          </IconButton>
          <Slider
            value={volume * 100}
            max={100}
            onChange={handleVolumeChange}
            disabled={disabled}
            sx={{ flexGrow: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: '3ch' }}>
            {Math.round(volume * 100)}%
          </Typography>
        </Box>

        {/* Status Messages */}
        {!isController && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              Another member is controlling playback. Click "Take Control" to become the DJ.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MusicPlayer;
