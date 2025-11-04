import React from 'react';
import { Chip } from '@mui/material';
import {
  CloudUpload as LocalIcon,
  MusicNote as SpotifyIcon,
  VideoLibrary as YouTubeIcon,
  Album as AppleMusicIcon
} from '@mui/icons-material';

/**
 * TrackSourceBadge Component
 * Displays a badge indicating the source of a track
 */
const TrackSourceBadge = ({ source, size = 'small', showIcon = true, showLabel = true }) => {
  const getSourceConfig = (source) => {
    switch (source) {
      case 'spotify':
        return {
          label: 'Spotify',
          color: '#1DB954',
          icon: <SpotifyIcon sx={{ fontSize: size === 'small' ? 14 : 18 }} />
        };
      case 'youtube':
        return {
          label: 'YouTube',
          color: '#FF0000',
          icon: <YouTubeIcon sx={{ fontSize: size === 'small' ? 14 : 18 }} />
        };
      case 'apple_music':
        return {
          label: 'Apple Music',
          color: '#FA243C',
          icon: <AppleMusicIcon sx={{ fontSize: size === 'small' ? 14 : 18 }} />
        };
      case 'local':
      default:
        return {
          label: 'Local',
          color: '#757575',
          icon: <LocalIcon sx={{ fontSize: size === 'small' ? 14 : 18 }} />
        };
    }
  };

  const config = getSourceConfig(source);

  return (
    <Chip
      icon={showIcon ? config.icon : undefined}
      label={showLabel ? config.label : ''}
      size={size}
      sx={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        height: size === 'small' ? 20 : 24,
        '& .MuiChip-icon': {
          color: config.color
        }
      }}
    />
  );
};

export default TrackSourceBadge;
