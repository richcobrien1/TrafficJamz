import React, { useState, useEffect } from 'react';
import {
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
  Album as AppleMusicIcon,
  Link as LinkIcon,
  CheckCircle as ConnectedIcon,
  Error as DisconnectedIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import { youtube, appleMusic, integrations } from '../../services/integrations.service';
import spotifyClient from '../../services/spotify-client.service';
import appleMusicClient from '../../services/apple-music-client.service';
import youtubeClient from '../../services/youtube-client.service';
import platformPlayer from '../../services/platform-player.service';
import { useMusic } from '../../contexts/MusicContext';

/**
 * PlaylistImportAccordion Component
 * Interface for browsing and importing playlists from music platforms
 */
const PlaylistImportAccordion = ({ onImport, sessionId }) => {
  const { loadAndPlay, pause, isController } = useMusic();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [playingTrackIndex, setPlayingTrackIndex] = useState(null);
  const [platformStatuses, setPlatformStatuses] = useState({
    spotify: { connected: false },
    appleMusic: { connected: false },
    youtube: { connected: true }
  });

  // Load platform statuses and playlists on mount
  useEffect(() => {
    const init = async () => {
      const statuses = await loadPlatformStatuses();
      await loadPlaylists(statuses);
    };
    init();
  }, [activeTab]);

  const loadPlatformStatuses = async () => {
    try {
      console.log('🔍 [PlaylistImport] Checking platform authentication...');
      
      // Check Spotify token
      const spotifyConnected = spotifyClient.isAuthenticated();
      console.log('🎵 [Spotify] isAuthenticated():', spotifyConnected);
      console.log('🎵 [Spotify] Access token exists:', !!localStorage.getItem('spotify_access_token'));
      console.log('🎵 [Spotify] Token expiry:', localStorage.getItem('spotify_token_expiry'));
      console.log('🎵 [Spotify] Current time:', Date.now());
      
      // Check Apple Music token  
      const appleMusicConnected = appleMusicClient.isAuthenticated();
      
      // Check YouTube token
      const youtubeConnected = youtubeClient.isAuthenticated();
      
      const newStatuses = {
        spotify: { connected: spotifyConnected },
        appleMusic: { connected: appleMusicConnected },
        youtube: { connected: youtubeConnected }
      };
      
      console.log('🔍 [PlaylistImport] Updated platform statuses:', newStatuses);
      setPlatformStatuses(newStatuses);
      return newStatuses; // Return the statuses so they can be used immediately
    } catch (err) {
      console.error('❌ [PlaylistImport] Error loading platform statuses:', err);
      return platformStatuses; // Return current state on error
    }
  };

  const handleConnectPlatform = async (platform) => {
    setError(null);
    
    if (platform === 'spotify') {
      try {
        localStorage.setItem('spotify_return_to', window.location.pathname);
        await spotifyClient.authorize();
      } catch (err) {
        console.error('Spotify auth error:', err);
        setError('Failed to connect to Spotify. Please try again.');
      }
    } else if (platform === 'appleMusic') {
      try {
        await appleMusicClient.authorize();
        const newStatuses = {
          ...platformStatuses,
          appleMusic: { connected: true }
        };
        setPlatformStatuses(newStatuses);
        await loadPlaylists(newStatuses);
      } catch (err) {
        console.error('Apple Music auth error:', err);
        setError('Failed to connect to Apple Music. Please try again.');
      }
    } else if (platform === 'youtube') {
      try {
        localStorage.setItem('youtube_auth_return', window.location.pathname);
        await youtubeClient.authorize();
      } catch (err) {
        console.error('YouTube auth error:', err);
        setError('Failed to connect to YouTube. Please try again.');
      }
    }
  };

  const loadPlaylists = async (statuses = null) => {
    setLoading(true);
    setError(null);
    
    // Use passed statuses or fall back to state
    const currentStatuses = statuses || platformStatuses;
    
    try {
      let data = [];
      
      console.log('📋 [PlaylistImport] Loading playlists for tab:', activeTab);
      console.log('📋 [PlaylistImport] Using statuses:', currentStatuses);
      
      if (activeTab === 0) {
        if (!currentStatuses.spotify.connected) {
          console.log('⚠️ [PlaylistImport] Spotify not connected');
          setPlaylists([]);
          setLoading(false);
          return;
        }
        console.log('🎵 [PlaylistImport] Calling spotifyClient.getPlaylists()...');
        data = await spotifyClient.getPlaylists();
        console.log('🎵 [PlaylistImport] Received playlists:', data);
      } else if (activeTab === 1) {
        if (!currentStatuses.youtube.connected) {
          setPlaylists([]);
          setLoading(false);
          return;
        }
        data = await youtubeClient.getPlaylists();
      } else if (activeTab === 2) {
        if (!currentStatuses.appleMusic.connected) {
          setPlaylists([]);
          setLoading(false);
          return;
        }
        data = await appleMusicClient.getPlaylists();
      }
      
      console.log('📋 [PlaylistImport] Setting playlists state:', data);
      setPlaylists(data);
    } catch (err) {
      console.error('❌ [PlaylistImport] Error loading playlists:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load playlists.');
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylistTracks = async (playlist) => {
    setLoadingTracks(true);
    setError(null);
    
    try {
      let data = [];
      
      if (activeTab === 0) {
        data = await spotifyClient.getPlaylistTracks(playlist.id);
      } else if (activeTab === 1) {
        data = await youtubeClient.getPlaylistTracks(playlist.id);
      } else if (activeTab === 2) {
        data = await appleMusicClient.getPlaylistTracks(playlist.id);
      }
      
      setTracks(data);
      setSelectedTracks(data.map((_, index) => index));
    } catch (err) {
      console.error('Error loading playlist tracks:', err);
      setError(err.message || 'Failed to load playlist tracks');
    } finally {
      setLoadingTracks(false);
    }
  };

  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
    loadPlaylistTracks(playlist);
  };

  const toggleTrackSelection = (index) => {
    setSelectedTracks(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      return [...prev, index];
    });
  };

  const handleImport = () => {
    const tracksToImport = selectedTracks.map(index => tracks[index]);
    onImport(tracksToImport);
    setSelectedPlaylist(null);
    setTracks([]);
    setSelectedTracks([]);
    setPlayingTrackIndex(null);
  };

  const handlePlayTrack = async (track, index) => {
    try {
      if (!isController) {
        setError('Only the DJ can play tracks');
        return;
      }
      
      if (playingTrackIndex === index) {
        // Pause if already playing
        await pause();
        setPlayingTrackIndex(null);
      } else {
        // Play new track - use loadAndPlay to load and play immediately
        await loadAndPlay(track);
        setPlayingTrackIndex(index);
      }
    } catch (err) {
      console.error('Error playing track:', err);
      setError('Failed to play track: ' + err.message);
    }
  };

  const getPlatformIcon = () => {
    if (activeTab === 0) return <SpotifyIcon />;
    if (activeTab === 1) return <YouTubeIcon />;
    return <AppleMusicIcon />;
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} sx={{ mb: 2 }}>
        <Tab icon={<SpotifyIcon />} label="Spotify" />
        <Tab icon={<YouTubeIcon />} label="YouTube" />
        <Tab icon={<AppleMusicIcon />} label="Apple Music" />
      </Tabs>

      {/* Connection Status Chips */}
      <Box sx={{ mb: 2 }}>
        {activeTab === 0 && (
          <Chip
            icon={platformStatuses.spotify.connected ? <ConnectedIcon /> : <DisconnectedIcon />}
            label={platformStatuses.spotify.connected ? 'Spotify Connected' : 'Spotify Not Connected'}
            size="small"
            color={platformStatuses.spotify.connected ? 'success' : 'default'}
          />
        )}
        {activeTab === 1 && (
          <Chip
            icon={platformStatuses.youtube.connected ? <ConnectedIcon /> : <DisconnectedIcon />}
            label={platformStatuses.youtube.connected ? 'YouTube Connected' : 'YouTube Not Connected'}
            size="small"
            color={platformStatuses.youtube.connected ? 'success' : 'default'}
          />
        )}
        {activeTab === 2 && (
          <Chip
            icon={platformStatuses.appleMusic.connected ? <ConnectedIcon /> : <DisconnectedIcon />}
            label={platformStatuses.appleMusic.connected ? 'Apple Music Connected' : 'Not Connected'}
            size="small"
            color={platformStatuses.appleMusic.connected ? 'success' : 'default'}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!selectedPlaylist ? (
        // Playlist selection view
        <Box>
          {/* Show connect button if not connected */}
          {((activeTab === 0 && !platformStatuses.spotify.connected) || 
            (activeTab === 1 && !platformStatuses.youtube.connected) ||
            (activeTab === 2 && !platformStatuses.appleMusic.connected)) && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  Connect your {activeTab === 0 ? 'Spotify' : activeTab === 1 ? 'YouTube' : 'Apple Music'} account
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={() => handleConnectPlatform(activeTab === 0 ? 'spotify' : activeTab === 1 ? 'youtube' : 'appleMusic')}
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
            <Typography color="textSecondary" align="center" sx={{ p: 2 }}>
              {activeTab === 0 && !platformStatuses.spotify.connected && 'Connect Spotify to view playlists'}
              {activeTab === 0 && platformStatuses.spotify.connected && 'No playlists found'}
              {activeTab === 1 && !platformStatuses.youtube.connected && 'Connect YouTube to view playlists'}
              {activeTab === 1 && platformStatuses.youtube.connected && 'No playlists found'}
              {activeTab === 2 && !platformStatuses.appleMusic.connected && 'Connect Apple Music to view playlists'}
              {activeTab === 2 && platformStatuses.appleMusic.connected && 'No playlists found'}
            </Typography>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {playlists.map((playlist) => (
                <ListItem
                  key={playlist.id}
                  button
                  onClick={() => handlePlaylistClick(playlist)}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}
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
                    secondary={`${playlist.tracksCount || playlist.itemCount || 0} tracks`}
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
              ← Back
            </Button>
            <Chip
              label={`${selectedTracks.length} / ${tracks.length} selected`}
              color="primary"
              size="small"
            />
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            {selectedPlaylist.name}
          </Typography>

          {loadingTracks ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
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
                    backgroundColor: selectedTracks.includes(index) ? 'action.selected' : 'transparent'
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
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayTrack(track, index);
                    }}
                    startIcon={playingTrackIndex === index ? <PauseIcon /> : <PlayIcon />}
                  >
                    {playingTrackIndex === index ? 'Pause' : 'Play'}
                  </Button>
                </ListItem>
              ))}
            </List>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={selectedTracks.length === 0}
            >
              Import {selectedTracks.length > 0 && `(${selectedTracks.length})`}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PlaylistImportAccordion;
