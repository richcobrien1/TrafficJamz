import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  MusicNote as SpotifyIcon,
  VideoLibrary as YouTubeIcon,
  Album as AppleMusicIcon,
  CheckCircle as ConnectedIcon,
  Error as DisconnectedIcon,
  Link as LinkIcon,
  Refresh as RefreshIcon,
  PlaylistPlay as PlaylistIcon
} from '@mui/icons-material';
import { spotify, youtube, appleMusic, integrations } from '../../services/integrations.service';
import PlaylistImportDialog from '../PlaylistImportDialog';

/**
 * MusicPlatformIntegration Component
 * Manages connections to Spotify, YouTube, and Apple Music
 * Allows users to browse and import playlists from connected platforms
 */
const MusicPlatformIntegration = ({ onPlaylistImport, sessionId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [platforms, setPlatforms] = useState({
    spotify: { connected: false, loading: false },
    appleMusic: { connected: false, loading: false },
    youtube: { connected: true, loading: false } // YouTube doesn't require auth
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  const [youtubePlaylistUrl, setYoutubePlaylistUrl] = useState('');

  useEffect(() => {
    loadPlatformStatuses();
    
    // Listen for OAuth success message from popup window
    const handleMessage = (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }
      
      if (event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
        console.log('🎵 Received Spotify auth success from popup');
        
        // Update connected status
        setPlatforms(prev => ({ 
          ...prev, 
          spotify: { connected: true, loading: false } 
        }));
        
        // Open playlist import dialog
        setShowImportDialog(true);
      } else if (event.data.type === 'SPOTIFY_AUTH_FAILED') {
        console.error('❌ Spotify auth failed:', event.data.error);
        setError(`Spotify authorization failed: ${event.data.error}`);
        setPlatforms(prev => ({ 
          ...prev, 
          spotify: { connected: false, loading: false } 
        }));
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * Load connection status for all platforms
   */
  const loadPlatformStatuses = async () => {
    setLoading(true);
    setError(null);

    try {
      const statuses = await integrations.getAllStatuses();
      setPlatforms({
        spotify: { connected: statuses.spotify.connected || false, loading: false },
        appleMusic: { connected: statuses.appleMusic.connected || false, loading: false },
        youtube: { connected: true, loading: false }
      });
    } catch (err) {
      console.error('Error loading platform statuses:', err);
      setError('Failed to load platform connection status');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Connect to Spotify
   */
  const handleSpotifyConnect = async () => {
    setPlatforms(prev => ({ ...prev, spotify: { ...prev.spotify, loading: true } }));
    setError(null);

    try {
      const result = await spotify.initiateAuth();
      if (result.authUrl) {
        // Open Spotify OAuth in popup window
        // The popup will send a message back when auth completes
        const popup = window.open(result.authUrl, 'spotify-auth', 'width=600,height=800');
        
        // Check if popup was blocked
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          throw new Error('Popup was blocked. Please allow popups for this site.');
        }
        
        // If popup closes without success, reset loading state
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setPlatforms(prev => {
              // Only reset if still loading (success message would have set connected)
              if (prev.spotify.loading) {
                return { 
                  ...prev, 
                  spotify: { connected: prev.spotify.connected, loading: false } 
                };
              }
              return prev;
            });
          }
        }, 500);
      }
    } catch (err) {
      console.error('Spotify connection error:', err);
      setError(err.message || 'Failed to connect to Spotify');
      setPlatforms(prev => ({ ...prev, spotify: { ...prev.spotify, loading: false } }));
    }
  };

  /**
   * Disconnect from Spotify
   */
  const handleSpotifyDisconnect = async () => {
    setPlatforms(prev => ({ ...prev, spotify: { ...prev.spotify, loading: true } }));
    
    try {
      await spotify.disconnect();
      setPlatforms(prev => ({ 
        ...prev, 
        spotify: { connected: false, loading: false } 
      }));
    } catch (err) {
      console.error('Spotify disconnect error:', err);
      setError('Failed to disconnect from Spotify');
      setPlatforms(prev => ({ ...prev, spotify: { ...prev.spotify, loading: false } }));
    }
  };

  /**
   * Connect to Apple Music
   */
  const handleAppleMusicConnect = async () => {
    setPlatforms(prev => ({ ...prev, appleMusic: { ...prev.appleMusic, loading: true } }));
    setError(null);

    try {
      // Initialize MusicKit
      if (!window.MusicKit) {
        throw new Error('Apple Music SDK not loaded');
      }

      // Get developer token from backend
      const { developerToken } = await appleMusic.getDeveloperToken();
      
      const music = window.MusicKit.configure({
        developerToken,
        app: {
          name: 'TrafficJamz',
          build: '1.0.0'
        }
      });

      // Authorize user
      const userToken = await music.authorize();
      const storefront = music.storefrontId;

      // Save token to backend
      await appleMusic.saveToken(userToken, storefront);

      setPlatforms(prev => ({ 
        ...prev, 
        appleMusic: { connected: true, loading: false } 
      }));
    } catch (err) {
      console.error('Apple Music connection error:', err);
      setError('Failed to connect to Apple Music');
      setPlatforms(prev => ({ ...prev, appleMusic: { ...prev.appleMusic, loading: false } }));
    }
  };

  /**
   * Disconnect from Apple Music
   */
  const handleAppleMusicDisconnect = async () => {
    setPlatforms(prev => ({ ...prev, appleMusic: { ...prev.appleMusic, loading: true } }));
    
    try {
      await appleMusic.disconnect();
      setPlatforms(prev => ({ 
        ...prev, 
        appleMusic: { connected: false, loading: false } 
      }));
    } catch (err) {
      console.error('Apple Music disconnect error:', err);
      setError('Failed to disconnect from Apple Music');
      setPlatforms(prev => ({ ...prev, appleMusic: { ...prev.appleMusic, loading: false } }));
    }
  };

  /**
   * Handle YouTube playlist import via URL
   */
  const handleYouTubeImport = () => {
    setShowYouTubeDialog(true);
  };

  /**
   * Open playlist import dialog
   */
  const handleBrowsePlaylists = () => {
    setShowImportDialog(true);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PlaylistIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Music Platform Connections
            </Typography>
          </Box>
          <IconButton onClick={loadPlatformStatuses} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Connect your music platforms to import playlists and tracks
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Platform List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {/* Spotify */}
            <ListItem
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 2,
                bgcolor: platforms.spotify.connected ? 'success.50' : 'background.paper'
              }}
            >
              <SpotifyIcon sx={{ mr: 2, fontSize: 40, color: '#1DB954' }} />
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">Spotify</Typography>
                    <Chip
                      icon={platforms.spotify.connected ? <ConnectedIcon /> : <DisconnectedIcon />}
                      label={platforms.spotify.connected ? 'Connected' : 'Not Connected'}
                      size="small"
                      color={platforms.spotify.connected ? 'success' : 'default'}
                    />
                  </Box>
                }
                secondary={
                  platforms.spotify.connected
                    ? 'Access your Spotify playlists and library'
                    : 'Connect to import playlists from Spotify'
                }
              />
              <ListItemSecondaryAction>
                {platforms.spotify.connected ? (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PlaylistIcon />}
                      onClick={handleBrowsePlaylists}
                      sx={{ mr: 1 }}
                    >
                      Browse Playlists
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleSpotifyDisconnect}
                      disabled={platforms.spotify.loading}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={handleSpotifyConnect}
                    disabled={platforms.spotify.loading}
                  >
                    {platforms.spotify.loading ? 'Connecting...' : 'Connect'}
                  </Button>
                )}
              </ListItemSecondaryAction>
            </ListItem>

            {/* YouTube */}
            <ListItem
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 2,
                bgcolor: 'success.50'
              }}
            >
              <YouTubeIcon sx={{ mr: 2, fontSize: 40, color: '#FF0000' }} />
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">YouTube</Typography>
                    <Chip
                      icon={<ConnectedIcon />}
                      label="Always Available"
                      size="small"
                      color="success"
                    />
                  </Box>
                }
                secondary="Import playlists using YouTube playlist URLs"
              />
              <ListItemSecondaryAction>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PlaylistIcon />}
                  onClick={handleYouTubeImport}
                >
                  Import Playlist
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            {/* Apple Music */}
            <ListItem
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: platforms.appleMusic.connected ? 'success.50' : 'background.paper'
              }}
            >
              <AppleMusicIcon sx={{ mr: 2, fontSize: 40, color: '#FA243C' }} />
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">Apple Music</Typography>
                    <Chip
                      icon={platforms.appleMusic.connected ? <ConnectedIcon /> : <DisconnectedIcon />}
                      label={platforms.appleMusic.connected ? 'Connected' : 'Not Connected'}
                      size="small"
                      color={platforms.appleMusic.connected ? 'success' : 'default'}
                    />
                  </Box>
                }
                secondary={
                  platforms.appleMusic.connected
                    ? 'Access your Apple Music library'
                    : 'Connect to import playlists from Apple Music'
                }
              />
              <ListItemSecondaryAction>
                {platforms.appleMusic.connected ? (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PlaylistIcon />}
                      onClick={handleBrowsePlaylists}
                      sx={{ mr: 1 }}
                    >
                      Browse Playlists
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAppleMusicDisconnect}
                      disabled={platforms.appleMusic.loading}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={handleAppleMusicConnect}
                    disabled={platforms.appleMusic.loading}
                  >
                    {platforms.appleMusic.loading ? 'Connecting...' : 'Connect'}
                  </Button>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        )}

        {/* Playlist Import Dialog */}
        <PlaylistImportDialog
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImport={onPlaylistImport}
        />

        {/* YouTube URL Dialog */}
        <Dialog open={showYouTubeDialog} onClose={() => setShowYouTubeDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Import YouTube Playlist</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter a YouTube playlist URL or ID
            </Typography>
            <TextField
              fullWidth
              label="Playlist URL or ID"
              placeholder="https://www.youtube.com/playlist?list=..."
              value={youtubePlaylistUrl}
              onChange={(e) => setYoutubePlaylistUrl(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowYouTubeDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={async () => {
                // Extract playlist ID from URL
                const playlistIdMatch = youtubePlaylistUrl.match(/[?&]list=([^&]+)/);
                const playlistId = playlistIdMatch ? playlistIdMatch[1] : youtubePlaylistUrl;
                
                try {
                  const tracks = await youtube.getPlaylistItems(playlistId);
                  onPlaylistImport(tracks);
                  setShowYouTubeDialog(false);
                  setYoutubePlaylistUrl('');
                } catch (err) {
                  setError('Failed to import YouTube playlist');
                }
              }}
              disabled={!youtubePlaylistUrl}
            >
              Import
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MusicPlatformIntegration;
