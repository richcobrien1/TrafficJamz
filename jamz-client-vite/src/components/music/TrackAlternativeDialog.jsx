import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  YouTube as YouTubeIcon,
  MusicNote as SpotifyIcon
} from '@mui/icons-material';
import api from '../../services/api';

/**
 * Dialog for finding alternative YouTube videos when playback fails
 */
const TrackAlternativeDialog = ({ 
  open, 
  onClose, 
  track,
  onSelectAlternative 
}) => {
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [customQuery, setCustomQuery] = useState('');

  // Auto-search when dialog opens
  React.useEffect(() => {
    if (open && track) {
      handleSearch();
    }
  }, [open, track]);

  const handleSearch = async (customSearchTerm = null) => {
    if (!track) return;

    setSearching(true);
    setError(null);

    try {
      const searchTerm = customSearchTerm || customQuery || `${track.artist} ${track.title}`;
      const response = await api.get('/music/search/youtube', {
        params: { q: searchTerm, limit: 5 }
      });

      setSearchResults(response.data.results || []);
    } catch (err) {
      console.error('Failed to search YouTube:', err);
      setError('Failed to search for alternatives. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectVideo = (video) => {
    // Create updated track with new YouTube ID
    const updatedTrack = {
      ...track,
      youtubeId: video.videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      albumArt: video.thumbnail || track.albumArt
    };

    onSelectAlternative(updatedTrack);
    onClose();
  };

  const handleUseSpotifyPreview = () => {
    if (!track.spotifyPreviewUrl) {
      setError('No Spotify preview available for this track');
      return;
    }

    // Switch track to use Spotify preview
    const updatedTrack = {
      ...track,
      source: 'spotify',
      youtubeId: null,
      youtubeUrl: null
    };

    onSelectAlternative(updatedTrack);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Find Alternative for "{track?.title}"
      </DialogTitle>

      <DialogContent>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Custom Search */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Search YouTube"
            placeholder={`${track?.artist} ${track?.title}`}
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch(customQuery);
              }
            }}
            InputProps={{
              endAdornment: (
                <Button
                  onClick={() => handleSearch(customQuery)}
                  disabled={searching}
                >
                  <SearchIcon />
                </Button>
              )
            }}
          />
        </Box>

        {/* Loading Indicator */}
        {searching && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Search Results */}
        {!searching && searchResults.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              YouTube Alternatives:
            </Typography>
            <List>
              {searchResults.map((video) => (
                <ListItem key={video.videoId} disablePadding>
                  <ListItemButton onClick={() => handleSelectVideo(video)}>
                    <ListItemAvatar>
                      <Avatar
                        variant="square"
                        src={video.thumbnail}
                        sx={{ width: 80, height: 60 }}
                      >
                        <YouTubeIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={video.title}
                      secondary={`${video.channel} • ${video.duration || 'Unknown duration'}`}
                      sx={{ ml: 2 }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Spotify Preview Option */}
        {track?.spotifyPreviewUrl && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Or use Spotify preview:
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<SpotifyIcon />}
              onClick={handleUseSpotifyPreview}
            >
              Use Spotify 30-second Preview
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrackAlternativeDialog;
