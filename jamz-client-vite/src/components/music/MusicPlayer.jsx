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
  playlist = [],
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
  
  // Use currentTrack if available, otherwise show first track in playlist as preview
  const displayTrack = currentTrack || (playlist && playlist.length > 0 ? playlist[0] : null);
  
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

  if (!displayTrack) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ textAlign: 'center', py: 2 }}>
          <MusicIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
            No music playing
          </Typography>
          
          {/* Show prominent Take Control button when not controller */}
          {!isController && (
            <Button
              variant="contained"
              size="medium"
              startIcon={<RadioIcon />}
              onClick={onTakeControl}
              disabled={disabled}
              sx={{ mt: 1 }}
            >
              Take Control
            </Button>
          )}
          
          {/* Show DJ status when already controller */}
          {isController && (
            <Chip
              icon={<RadioIcon />}
              label="You are the DJ"
              color="primary"
              sx={{ mt: 1 }}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 2,
        position: 'relative',
        overflow: 'hidden',
        // Blurred background with album art if available
        ...(displayTrack.albumArt && {
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${displayTrack.albumArt})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px) brightness(0.3)',
            opacity: 0.2,
            zIndex: 0
          }
        })
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Track Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {displayTrack.albumArt ? (
            <Avatar 
              src={displayTrack.albumArt} 
              alt={displayTrack.album || displayTrack.title}
              sx={{ 
                mr: 1.5, 
                width: 48, 
                height: 48,
                boxShadow: 2
              }}
            />
          ) : (
            <Avatar sx={{ bgcolor: 'primary.main', mr: 1.5, width: 48, height: 48 }}>
              <MusicIcon />
            </Avatar>
          )}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 500, lineHeight: 1.3 }}>
              {displayTrack.title || 'Unknown Track'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ lineHeight: 1.2 }}>
              {displayTrack.artist || 'Unknown Artist'}
            </Typography>
          </Box>
          
          {/* Controller Status */}
          {isController ? (
            <Tooltip title="You are controlling playback">
              <Chip
                icon={<RadioIcon />}
                label="DJ"
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

        {/* Progress Bar */}
        <Box sx={{ mb: 1 }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Tooltip title={!isController ? "Take control to use this" : "Previous track"}>
            <span>
              <IconButton
                onClick={handlePrevious}
                disabled={!isController || disabled}
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
              >
                <NextIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MusicPlayer;
