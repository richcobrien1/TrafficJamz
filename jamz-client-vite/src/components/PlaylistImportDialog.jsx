import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Typography,
  Alert,
  Checkbox,
  Chip
} from '@mui/material';
import {
  MusicNote as SpotifyIcon,
  VideoLibrary as YouTubeIcon,
  Album as AppleMusicIcon
} from '@mui/icons-material';
import { spotify, youtube, appleMusic } from '../services/integrations.service';

/**
 * PlaylistImportDialog Component
 * Browse and import playlists from Spotify, YouTube, and Apple Music
 */
const PlaylistImportDialog = ({ open, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState(0); // 0: Spotify, 1: YouTube, 2: Apple Music
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPlaylist(null);
      setTracks([]);
      setSelectedTracks([]);
      setError(null);
      loadPlaylists();
    }
  }, [open, activeTab]);

  // Load playlists based on active tab
  const loadPlaylists = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data = [];
      
      if (activeTab === 0) { // Spotify
        data = await spotify.getPlaylists();
      } else if (activeTab === 1) { // YouTube
        // Note: YouTube requires playlist URL/ID input
        setError('Enter a YouTube playlist URL or ID to import');
        data = [];
      } else if (activeTab === 2) { // Apple Music
        data = await appleMusic.getPlaylists();
      }
      
      setPlaylists(data);
    } catch (err) {
      console.error('Error loading playlists:', err);
      setError(err.response?.data?.error || 'Failed to load playlists. Please try connecting your account.');
    } finally {
      setLoading(false);
    }
  };

  // Load tracks from selected playlist
  const loadPlaylistTracks = async (playlist) => {
    setLoadingTracks(true);
    setError(null);
    
    try {
      let data = [];
      
      if (activeTab === 0) { // Spotify
        data = await spotify.getPlaylistTracks(playlist.id);
      } else if (activeTab === 1) { // YouTube
        data = await youtube.getPlaylistItems(playlist.id);
      } else if (activeTab === 2) { // Apple Music
        data = await appleMusic.getPlaylistTracks(playlist.id);
      }
      
      setTracks(data);
      setSelectedTracks(data.map((_, index) => index)); // Select all by default
    } catch (err) {
      console.error('Error loading playlist tracks:', err);
      setError('Failed to load playlist tracks');
    } finally {
      setLoadingTracks(false);
    }
  };

  // Handle playlist selection
  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
    loadPlaylistTracks(playlist);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSelectedPlaylist(null);
    setTracks([]);
    setPlaylists([]);
  };

  // Toggle track selection
  const toggleTrackSelection = (index) => {
    setSelectedTracks(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // Handle import
  const handleImport = () => {
    const tracksToImport = selectedTracks.map(index => tracks[index]);
    onImport(tracksToImport);
    onClose();
  };

  // Get platform icon
  const getPlatformIcon = () => {
    if (activeTab === 0) return <SpotifyIcon />;
    if (activeTab === 1) return <YouTubeIcon />;
    return <AppleMusicIcon />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Import Playlist
      </DialogTitle>
      
      <DialogContent>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab icon={<SpotifyIcon />} label="Spotify" />
          <Tab icon={<YouTubeIcon />} label="YouTube" />
          <Tab icon={<AppleMusicIcon />} label="Apple Music" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!selectedPlaylist ? (
          // Playlist selection view
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select a playlist to import:
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : playlists.length === 0 ? (
              <Typography color="textSecondary" align="center" sx={{ p: 4 }}>
                No playlists found. {activeTab === 0 && 'Connect your Spotify account in Settings.'}
                {activeTab === 2 && 'Connect your Apple Music account in Settings.'}
              </Typography>
            ) : (
              <List>
                {playlists.map((playlist) => (
                  <ListItem
                    key={playlist.id}
                    button
                    onClick={() => handlePlaylistClick(playlist)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={playlist.images?.[0]?.url || playlist.artwork || playlist.thumbnail}
                        variant="rounded"
                      >
                        {getPlatformIcon()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={playlist.name}
                      secondary={`${playlist.tracksCount || playlist.itemCount || 0} tracks • ${playlist.owner || playlist.channelTitle || 'Your Library'}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        ) : (
          // Track selection view
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Button variant="outlined" size="small" onClick={() => setSelectedPlaylist(null)}>
                ← Back to Playlists
              </Button>
              <Chip
                label={`${selectedTracks.length} / ${tracks.length} selected`}
                color="primary"
                size="small"
              />
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              {selectedPlaylist.name}
            </Typography>

            {loadingTracks ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {tracks.map((track, index) => (
                  <ListItem
                    key={index}
                    button
                    onClick={() => toggleTrackSelection(index)}
                    sx={{
                      border: '1px solid',
                      borderColor: selectedTracks.includes(index) ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: selectedTracks.includes(index) ? 'action.selected' : 'background.paper'
                    }}
                  >
                    <Checkbox
                      checked={selectedTracks.includes(index)}
                      onChange={() => toggleTrackSelection(index)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <ListItemAvatar>
                      <Avatar src={track.albumArt} variant="rounded">
                        {getPlatformIcon()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={track.title}
                      secondary={`${track.artist} • ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!selectedPlaylist || selectedTracks.length === 0}
        >
          Import {selectedTracks.length > 0 && `(${selectedTracks.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlaylistImportDialog;
