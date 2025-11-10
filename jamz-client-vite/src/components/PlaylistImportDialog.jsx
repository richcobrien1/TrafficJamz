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
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  MusicNote as SpotifyIcon,
  VideoLibrary as YouTubeIcon,
  Album as AppleMusicIcon,
  Link as LinkIcon,
  CheckCircle as ConnectedIcon,
  Error as DisconnectedIcon
} from '@mui/icons-material';
import { spotify, youtube, appleMusic, integrations } from '../services/integrations.service';

/**
 * PlaylistImportDialog Component
 * Browse and import playlists from Spotify, YouTube, and Apple Music
 */
const PlaylistImportDialog = ({ open, onClose, onImport }) => {
  console.log('🎬 PlaylistImportDialog RENDER - open:', open);
  
  const [activeTab, setActiveTab] = useState(0); // 0: Spotify, 1: YouTube, 2: Apple Music
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [platformStatuses, setPlatformStatuses] = useState({
    spotify: { connected: false },
    appleMusic: { connected: false },
    youtube: { connected: true }
  });

  // Reset state when dialog opens
  useEffect(() => {
    console.log('📱 PlaylistImportDialog open state changed:', open);
    if (open) {
      setSelectedPlaylist(null);
      setTracks([]);
      setSelectedTracks([]);
      setError(null);
      loadPlatformStatuses();
      loadPlaylists();
    }
  }, [open, activeTab]);

  // Load platform connection statuses
  const loadPlatformStatuses = async () => {
    try {
      const statuses = await integrations.getAllStatuses();
      setPlatformStatuses(statuses);
    } catch (err) {
      console.error('Error loading platform statuses:', err);
    }
  };

  // Handle platform connection
  const handleConnectPlatform = async (platform) => {
    setError(null);
    
    if (platform === 'spotify') {
      try {
        const result = await spotify.initiateAuth();
        if (result.authUrl) {
          window.open(result.authUrl, '_blank', 'width=600,height=800');
          setError('Please complete authentication in the popup window, then refresh this dialog.');
        }
      } catch (err) {
        setError('Failed to connect to Spotify. Please try again.');
      }
    } else if (platform === 'appleMusic') {
      try {
        if (!window.MusicKit) {
          throw new Error('Apple Music SDK not loaded');
        }
        const { developerToken } = await appleMusic.getDeveloperToken();
        const music = window.MusicKit.configure({
          developerToken,
          app: { name: 'TrafficJamz', build: '1.0.0' }
        });
        const userToken = await music.authorize();
        await appleMusic.saveToken(userToken, music.storefrontId);
        await loadPlatformStatuses();
        loadPlaylists();
      } catch (err) {
        setError('Failed to connect to Apple Music. Please try again.');
      }
    }
  };

  // Load playlists based on active tab
  const loadPlaylists = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data = [];
      
      if (activeTab === 0) { // Spotify
        if (!platformStatuses.spotify.connected) {
          setPlaylists([]);
          setLoading(false);
          return;
        }
        data = await spotify.getPlaylists();
      } else if (activeTab === 1) { // YouTube
        // Note: YouTube requires playlist URL/ID input
        setError('Enter a YouTube playlist URL or ID to import');
        data = [];
      } else if (activeTab === 2) { // Apple Music
        if (!platformStatuses.appleMusic.connected) {
          setPlaylists([]);
          setLoading(false);
          return;
        }
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
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      sx={{ zIndex: 9999 }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Import Playlist</Typography>
          {activeTab === 0 && (
            <Chip
              icon={platformStatuses.spotify.connected ? <ConnectedIcon /> : <DisconnectedIcon />}
              label={platformStatuses.spotify.connected ? 'Spotify Connected' : 'Spotify Not Connected'}
              size="small"
              color={platformStatuses.spotify.connected ? 'success' : 'default'}
            />
          )}
          {activeTab === 2 && (
            <Chip
              icon={platformStatuses.appleMusic.connected ? <ConnectedIcon /> : <DisconnectedIcon />}
              label={platformStatuses.appleMusic.connected ? 'Apple Music Connected' : 'Apple Music Not Connected'}
              size="small"
              color={platformStatuses.appleMusic.connected ? 'success' : 'default'}
            />
          )}
        </Box>
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
            
            {/* Show connect button if not connected */}
            {((activeTab === 0 && !platformStatuses.spotify.connected) || 
              (activeTab === 2 && !platformStatuses.appleMusic.connected)) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">
                    Connect your {activeTab === 0 ? 'Spotify' : 'Apple Music'} account to access your playlists
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={() => handleConnectPlatform(activeTab === 0 ? 'spotify' : 'appleMusic')}
                    sx={{ ml: 2 }}
                  >
                    Connect
                  </Button>
                </Box>
              </Alert>
            )}
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : playlists.length === 0 ? (
              <Typography color="textSecondary" align="center" sx={{ p: 4 }}>
                {activeTab === 0 && !platformStatuses.spotify.connected && 'Connect your Spotify account to view playlists.'}
                {activeTab === 0 && platformStatuses.spotify.connected && 'No playlists found.'}
                {activeTab === 1 && 'Enter a YouTube playlist URL to import.'}
                {activeTab === 2 && !platformStatuses.appleMusic.connected && 'Connect your Apple Music account to view playlists.'}
                {activeTab === 2 && platformStatuses.appleMusic.connected && 'No playlists found.'}
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
