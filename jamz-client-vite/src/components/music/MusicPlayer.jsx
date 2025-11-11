import React, { useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Slider,
  Chip,
  Tooltip,
  Avatar,
  Button
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
  // Remember previous volume for mute/unmute
  const previousVolumeRef = useRef(0.5);
  
  // Update previous volume when volume changes (but not to 0)
  useEffect(() => {
    if (volume > 0) {
      previousVolumeRef.current = volume;
    }
  }, [volume]);
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
      console.log('🎵 [MusicPlayer] Seeking to:', newValue);
      onSeek(newValue);
    }
  };

  /**
   * Handle volume slider change
   */
  const handleVolumeChange = (event, newValue) => {
    if (onVolumeChange) {
      console.log('🎵 [MusicPlayer] Volume change:', newValue / 100);
      onVolumeChange(newValue / 100);
    }
  };

  /**
   * Toggle play/pause
   */
  const handlePlayPause = () => {
    if (!isController) {
      console.warn('🎵 [MusicPlayer] Not controller - cannot play/pause');
      return;
    }
    
    console.log('🎵 [MusicPlayer] Play/Pause clicked - isPlaying:', isPlaying);
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  };

  /**
   * Handle previous track
   */
  const handlePrevious = () => {
    if (!isController) {
      console.warn('🎵 [MusicPlayer] Not controller - cannot go to previous');
      return;
    }
    console.log('🎵 [MusicPlayer] Previous clicked');
    onPrevious?.();
  };

  /**
   * Handle next track
   */
  const handleNext = () => {
    if (!isController) {
      console.warn('🎵 [MusicPlayer] Not controller - cannot go to next');
      return;
    }
    console.log('🎵 [MusicPlayer] Next clicked');
    onNext?.();
  };

  if (!currentTrack) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <MusicIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No music playing
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {isController 
              ? "Upload tracks below, then click a track in the playlist to play it"
              : "You need to take control to play music"
            }
          </Typography>
          
          {/* Show prominent Take Control button when not controller */}
          {!isController && (
            <Button
              variant="contained"
              size="large"
              startIcon={<RadioIcon />}
              onClick={onTakeControl}
              disabled={disabled}
              sx={{ mt: 2, mb: 2 }}
            >
              Take Control of Music
            </Button>
          )}
          
          {/* Show DJ status when already controller */}
          {isController && (
            <Chip
              icon={<RadioIcon />}
              label="You are the DJ"
              color="primary"
              sx={{ mt: 2, mb: 2 }}
            />
          )}
          
          <Typography variant="caption" color="text.secondary" display="block">
            {isController 
              ? "Upload tracks below to get started"
              : "Only one person can control music at a time"
            }
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
          {currentTrack.albumArt ? (
            <Avatar 
              src={currentTrack.albumArt} 
              alt={currentTrack.album || currentTrack.title}
              sx={{ mr: 2, width: 56, height: 56 }}
            />
          ) : (
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
              <MusicIcon />
            </Avatar>
          )}
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
          <Tooltip title={isController ? "Drag to seek" : "Take control to seek"} placement="top">
            <Slider
              value={currentTime || 0}
              max={duration || 100}
              onChange={handleSeekChange}
              disabled={!isController || disabled}
              sx={{ 
                color: isController ? 'primary.main' : 'grey.400',
                '& .MuiSlider-thumb': {
                  display: isController ? 'block' : 'none'
                },
                '&:hover .MuiSlider-thumb': {
                  boxShadow: isController ? '0px 0px 0px 8px rgba(25, 118, 210, 0.16)' : 'none'
                }
              }}
            />
          </Tooltip>
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
          <Tooltip title={!isController ? "Take control to use this" : "Previous track"}>
            <span>
              <IconButton
                onClick={handlePrevious}
                disabled={!isController || disabled}
                size="large"
              >
                <PrevIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title={!isController ? "Take control to use this" : (isPlaying ? "Pause" : "Play")}>
            <span>
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
            </span>
          </Tooltip>
          
          <Tooltip title={!isController ? "Take control to use this" : "Next track"}>
            <span>
              <IconButton
                onClick={handleNext}
                disabled={!isController || disabled}
                size="large"
              >
                <NextIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Status Messages */}
        {!isController && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              🎧 Listening Mode
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Another member is controlling playback. Click "Take Control" above to become the DJ and control the music.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MusicPlayer;
