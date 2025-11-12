// CRITICAL PIN CONFIGURATION:
// =============================
// Pins behave as GEOGRAPHIC ANCHORS that move with map panning/zooming
// They ARE anchored to geographic coordinates and recalibrate on map changes
// Pin positions change during map moveend/zoomend events
// Map moveend/zoomend events are ENABLED to maintain this behavior
// =============================

import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api, { MAPBOX_TOKEN } from '../../services/api';
import mapboxgl from 'mapbox-gl';
import io from 'socket.io-client';
import { getAvatarContent, getAvatarFallback } from '../../utils/avatar.utils';
import { useAudioSession } from '../../hooks/useAudioSession';
import { useMusicSession } from '../../hooks/useMusicSession';
import MusicPlayer from '../../components/music/MusicPlayer';
import MusicUpload from '../../components/music/MusicUpload';
import MusicPlaylist from '../../components/music/MusicPlaylist';
import { 
  Container, 
  Badge,
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  List,
  TextField,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  Tooltip,
  Chip,
  Fade,
  Drawer,
  AppBar,
  Toolbar,
  Collapse,
  Snackbar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  MyLocation as MyLocationIcon,
  GpsFixed as GpsFixedIcon,
  Navigation as NavigationIcon,
  LocationOn as LocationIcon,
  LocationOff as LocationOffIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  People as PeopleIcon,
  Close as CloseIcon,
  Satellite as SatelliteIcon,
  Place as PlaceIcon,
  LocationOff as PlaceOffIcon,
  Phone as PhoneIcon,
  PhoneDisabled as PhoneDisabledIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  MusicNote as MusicNoteIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon
} from '@mui/icons-material';

const LocationTracking = () => {
  // PIN BEHAVIOR CONFIGURATION - DO NOT CHANGE WITHOUT CAREFUL CONSIDERATION
  // =======================================================================
  // Visual constants
  const PLACE_PIN_COLOR = '#4caf50'; // material green 500 - place pins
  const MEMBER_PIN_COLOR = 'orange';
  // pinsAsScreenOverlays: When true, pins move with map viewport (geographic anchors)
  // PIN BEHAVIOR CONFIGURATION:
  // allowRecalibrationOnMapChange controls whether pins move with map viewport
  // When true: pins are geographic anchors that move with map panning/zooming
  // When false: pins stay fixed on screen like HUD overlays
  const PIN_CONFIG = {
    pinsAsScreenOverlays: false, // Set to false for geographic anchor behavior
    allowRecalibrationOnMapChange: true // Set to true to enable geographic anchor behavior
  };
  // =======================================================================

  // Get hooks
  const { user } = useAuth();
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  // Audio session hook
  const { 
    isInSession, 
    isMuted, 
    isSpeaking, 
    participants: audioParticipants,
    error: audioError,
    audioLevel,
    joinSession, 
    leaveSession, 
    toggleMute,
    shareDesktopAudio,
    stopDesktopAudio
  } = useAudioSession(groupId);
  
  // Desktop audio sharing state
  const [isSharingDesktopAudio, setIsSharingDesktopAudio] = useState(false);
  
  // Music session hook
  const {
    currentTrack,
    playlist,
    isPlaying,
    currentTime,
    duration,
    volume,
    isController,
    play: musicPlay,
    pause: musicPause,
    seekTo: musicSeek,
    playNext,
    playPrevious,
    setVolume,
    takeControl,
    releaseControl,
    addTrack,
    removeTrack,
    loadAndPlay
  } = useMusicSession(groupId, groupId); // Use groupId as sessionId for location tracking
  
  // Music player visibility
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  
  // Debug: Check user on every render
  console.log('🔄 Component render - user from useAuth:', user);

  // Fallback to extract user info from JWT token if useAuth() returns undefined
  const currentUser = useMemo(() => {
    console.log('🔍 useMemo executing - user:', user);
    console.log('🔍 user?.id:', user?.id, 'user?.user_id:', user?.user_id);
    console.log('🔍 user?.profile_image_url:', user?.profile_image_url);
    console.log('🔍 user?.first_name:', user?.first_name, 'user?.last_name:', user?.last_name);
    
    // Always try to enrich from JWT if fields are missing
    const needsEnrichment = user && (user.id || user.user_id) && 
      (!user.first_name || !user.last_name || !user.profile_image_url);
    
    if (user && (user.id || user.user_id) && !needsEnrichment) {
      console.log('✅ Using user from useAuth (has all fields):', user);
      const result = {
        ...user,
        id: user.id || user.user_id  // Ensure id is always set
      };
      console.log('🔍 currentUser result.profile_image_url:', result.profile_image_url);
      return result;
    }
    
    console.log('⚠️ user missing fields or undefined, attempting JWT decode to enrich');
    
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'null');
      
      if (!token) {
        console.log('❌ No token in localStorage');
        return null;
      }
      
      // Decode JWT (basic decode, not verification)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      console.log('📦 JWT payload:', payload);
      
      const extractedUser = {
        id: payload.sub || payload.user_id || payload.id,
        username: payload.username,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        profile_image_url: payload.profile_image_url,
        social_accounts: payload.social_accounts,
        gender: payload.gender
      };
      
      console.log('✅ Extracted user from JWT:', extractedUser);
      
      // Merge with existing user object if available
      if (user && (user.id || user.user_id)) {
        const merged = {
          ...user,
          ...extractedUser,
          id: user.id || user.user_id || extractedUser.id
        };
        console.log('✅ Merged user with JWT data:', merged);
        return merged;
      }
      
      return extractedUser;
    } catch (e) {
      console.error('❌ Failed to decode JWT token:', e);
      return null;
    }
  }, [user]);

  // Default coordinates - try to use last known location from localStorage, fallback to Denver, CO
  const getDefaultCenter = () => {
    try {
      const lastLocation = localStorage.getItem('lastUserLocation');
      if (lastLocation) {
        const parsed = JSON.parse(lastLocation);
        return [parsed.longitude, parsed.latitude];
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    // Fallback to Denver, CO (more reasonable than Atlantic Ocean)
    return [-104.882029, 39.573640];
  };

  const [defaultCenter] = useState(getDefaultCenter);
    
  // State variables
  const [sharingLocation, setSharingLocation] = useState(true); // Default ON - location sharing enabled by default
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [retryDelay, setRetryDelay] = useState(15);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [locations, setLocations] = useState([]);
  const [showProximityAlerts, setShowProximityAlerts] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCentering, setIsCentering] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);
  const [geolocationRetries, setGeolocationRetries] = useState(0);
  const [highAccuracyMode, setHighAccuracyMode] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(30);
  const [proximityDistance, setProximityDistance] = useState(100);
  const [controlsOpacity, setControlsOpacity] = useState(0.9);
  const [showControls, setShowControls] = useState(true);
  const [showMembersList, setShowMembersList] = useState(false);
  const [showLocationInfo, setShowLocationInfo] = useState(false);
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [satelliteMode, setSatelliteMode] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);
  const [placeSelectionMode, setPlaceSelectionMode] = useState(false);
  const [overlayCreateMode, setOverlayCreateMode] = useState(() => {
    try {
      const v = localStorage.getItem('overlayCreateMode');
      return v === 'true';
    } catch (e) { return false; }
  }); // when true, show center HUD dot for place creation
  const [draggingPlaceId, setDraggingPlaceId] = useState(null);
  const [useBestReading, setUseBestReading] = useState(false);
  const [gpsReadingsBuffer, setGpsReadingsBuffer] = useState([]);
  const [accuracyThreshold, setAccuracyThreshold] = useState(100);
  const [places, setPlaces] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [openAggregatedDialog, setOpenAggregatedDialog] = useState(false);
  const [aggregatedBucketMembers, setAggregatedBucketMembers] = useState([]);
  const [openCreatePlaceDialog, setOpenCreatePlaceDialog] = useState(false);
  const [createPlaceName, setCreatePlaceName] = useState('New Place');
  const [createPlaceCoords, setCreatePlaceCoords] = useState(null);
  const [isCreatingPlace, setIsCreatingPlace] = useState(false);
  const [createPlaceAddress, setCreatePlaceAddress] = useState('');
  const [createPlaceFeature, setCreatePlaceFeature] = useState(null);
  const [bucketPrecision, setBucketPrecision] = useState(4); // digits for coordinate bucketing
  // Screen-space clustering threshold (pixels) - persisted so tuning can be locked in
  const [screenThreshold, setScreenThreshold] = useState(() => {
    try {
      const raw = localStorage.getItem('screenThreshold');
      if (raw) return Number(raw);
    } catch (e) {}
    return 18; // default tuned value
  });
  
  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const placeSelectionModeRef = useRef(false);
  const markersRef = useRef({});
  const lastKnownLocationsRef = useRef({});
  const pendingLocationsRef = useRef(null);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null); // For watchPosition
  const updateMarkerDebounceRef = useRef(null);
  const clusterModeRef = useRef(false);
  const clusterSourceIdRef = useRef('tj_members_source');
  const userLocationRef = useRef(null); // Keep userLocation in sync for event handlers
  const [clusterThreshold, setClusterThreshold] = useState(150); // above this, switch to clustered layer rendering

  // Create cluster layers and source for large numbers of markers
  const createClusterLayers = (locationData = []) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const sourceId = clusterSourceIdRef.current;

    // If source already exists, update it
    if (map.getSource && map.getSource(sourceId)) {
      try {
        const features = locationData.map(loc => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [loc.coordinates.longitude, loc.coordinates.latitude] },
          properties: { user_id: loc.user_id, username: loc.username, place: !!loc.place }
        }));
        map.getSource(sourceId).setData({ type: 'FeatureCollection', features });
      } catch (e) { console.warn('Error updating existing cluster source', e); }
      return;
    }

    const features = locationData.map(loc => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [loc.coordinates.longitude, loc.coordinates.latitude] },
      properties: { user_id: loc.user_id, username: loc.username, place: !!loc.place }
    }));

    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    // Cluster circles
    // Use circle layer for clusters (auto-size by point_count) and a symbol layer for numeric labels
    map.addLayer({
      id: `${sourceId}-clusters`,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': MEMBER_PIN_COLOR,
        'circle-radius': [
          'step', ['get', 'point_count'], 18, 10, 22, 50, 28, 100, 36
        ],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Cluster count label (number) centered in cluster
    map.addLayer({
      id: `${sourceId}-cluster-count`,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': [
          'step', ['get', 'point_count'], 12, 10, 14, 50, 16, 100, 18
        ],
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // Unclustered points as single small circle or symbol
    map.addLayer({
      id: `${sourceId}-unclustered`,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['case', ['boolean', ['get', 'place'], false], PLACE_PIN_COLOR, MEMBER_PIN_COLOR],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Click handlers for cluster interactions (dev/prod): show aggregated member list or single item dialog
    try {
      // When clicking a cluster, retrieve its leaves and show aggregated dialog
      map.on('click', `${sourceId}-clusters`, (e) => {
        try {
          const features = map.queryRenderedFeatures(e.point, { layers: [`${sourceId}-clusters`] });
          if (!features || features.length === 0) return;
          const cluster = features[0];
          const clusterId = cluster.properties && (cluster.properties.cluster_id || cluster.properties.clusterId || cluster.properties.clusterId);
          if (!clusterId) return;
          const src = map.getSource(sourceId);
          if (!src || !src.getClusterLeaves) return;
          // Get up to 1000 leaves for display
          src.getClusterLeaves(clusterId, 1000, 0, (err, leaves) => {
            if (err) { console.warn('Error getting cluster leaves', err); return; }
            const members = (leaves || []).map(f => ({
              user_id: f.properties && f.properties.user_id,
              username: f.properties && f.properties.username,
              first_name: null,
              coordinates: { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] },
              timestamp: null
            }));
            setAggregatedBucketMembers(members);
            setOpenAggregatedDialog(true);
          });
        } catch (err) {
          console.warn('Cluster click handler error', err);
        }
      });

      // When clicking an unclustered point, open the usual location dialog
      map.on('click', `${sourceId}-unclustered`, (e) => {
        try {
          const features = e.features || map.queryRenderedFeatures(e.point, { layers: [`${sourceId}-unclustered`] });
          if (!features || features.length === 0) return;
          const f = features[0];
          const props = f.properties || {};
          const loc = {
            user_id: props.user_id,
            username: props.username,
            coordinates: { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] },
            timestamp: null,
            place: !!props.place
          };
          handleMarkerClick(loc);
        } catch (err) {
          console.warn('Unclustered click handler error', err);
        }
      });

      // Cursor feedback
      map.on('mouseenter', `${sourceId}-clusters`, () => { try { map.getCanvas().style.cursor = 'pointer'; } catch (e) {} });
      map.on('mouseleave', `${sourceId}-clusters`, () => { try { map.getCanvas().style.cursor = ''; } catch (e) {} });
      map.on('mouseenter', `${sourceId}-unclustered`, () => { try { map.getCanvas().style.cursor = 'pointer'; } catch (e) {} });
      map.on('mouseleave', `${sourceId}-unclustered`, () => { try { map.getCanvas().style.cursor = ''; } catch (e) {} });
    } catch (e) {
      console.warn('Failed to attach cluster click handlers', e);
    }
  };

  const removeClusterLayers = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const sourceId = clusterSourceIdRef.current;
    try {
      // Remove event handlers we added for cluster interactions
      try {
        map.off('click', `${sourceId}-clusters`);
        map.off('click', `${sourceId}-unclustered`);
        map.off('mouseenter', `${sourceId}-clusters`);
        map.off('mouseleave', `${sourceId}-clusters`);
        map.off('mouseenter', `${sourceId}-unclustered`);
        map.off('mouseleave', `${sourceId}-unclustered`);
      } catch (e) {}

      const layers = [`${sourceId}-clusters`, `${sourceId}-cluster-count`, `${sourceId}-unclustered`];
      layers.forEach(l => { if (map.getLayer && map.getLayer(l)) map.removeLayer(l); });
      if (map.getSource && map.getSource(sourceId)) map.removeSource(sourceId);
    } catch (e) {
      console.warn('Error removing cluster layers', e);
    }
  };

  // Dev helper: simulate many member locations for testing performance
  const simulateLocationLoad = (count = 200) => {
    if (process.env.NODE_ENV !== 'production') console.debug('[simulateLocationLoad] generating', count, 'locations');
    const baseLat = userLocation ? userLocation.latitude : defaultCenter[1];
    const baseLng = userLocation ? userLocation.longitude : defaultCenter[0];
    const generated = [];
    for (let i = 0; i < count; i++) {
      const jitterLat = baseLat + (Math.random() - 0.5) * 0.02;
      const jitterLng = baseLng + (Math.random() - 0.5) * 0.02;
      generated.push({
        user_id: `sim_${i}`,
        username: `Sim${i}`,
        coordinates: { latitude: jitterLat, longitude: jitterLng },
        timestamp: new Date().toISOString(),
        place: false
      });
    }
    // Persist the simulated locations into component state so other handlers (zoom/moveend)
    // will use the same dataset and not overwrite the simulated markers.
    try {
      setLocations(generated);
      devSimulationActiveRef.current = true;
    } catch (e) {
      // ignore state update errors in dev
    }
    // If the map isn't ready, queue the simulated locations so they'll be flushed on load
    try {
      if (!mapRef.current) {
        pendingLocationsRef.current = generated;
      }
    } catch (e) {}

    // Force immediate update and potentially switch to cluster mode
    if (process.env.NODE_ENV !== 'production') console.debug('[simulateLocationLoad] calling updateMapMarkers with', generated.length);
    updateMapMarkers(generated, true);
  };

  // Expose a clearSimulation helper in dev to revert to normal runtime updates
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      window.clearSimulation = () => {
        try {
          devSimulationActiveRef.current = false;
          // Optionally clear simulated markers and trigger a refresh from real data
          setLocations([]);
          updateMapMarkers([], true);
          // Re-fetch runtime data to repopulate actual members
          if (mapRef.current) {
            try { const c = mapRef.current.getCenter(); generateRuntimeData({ lng: c.lng, lat: c.lat }); } catch (e) {}
          }
        } catch (e) {
          console.warn('clearSimulation failed', e);
        }
      };
    }
    return () => { try { if (window.clearSimulation) delete window.clearSimulation; } catch (e) {} };
  }, []);

  // Expose simulation helper in dev for quick manual testing
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      try { window.simulateLocationLoad = simulateLocationLoad; } catch (e) {}
    }
    return () => { try { if (window.simulateLocationLoad) delete window.simulateLocationLoad; } catch (e) {} };
  }, [userLocation]);

  // Load last-known locations cache from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lastKnownLocations');
      if (raw) lastKnownLocationsRef.current = JSON.parse(raw) || {};
    } catch (e) {
      lastKnownLocationsRef.current = {};
    }
  }, []);

  // Dev helper: simulate the 'Warriors' group overlap (3 nearby members)
  const simulateWarriorsOverlap = (center = null) => {
    // Determine center from userLocation, map center, fallback to defaultCenter
    let baseLat = defaultCenter[1];
    let baseLng = defaultCenter[0];
    if (userLocation) {
      baseLat = userLocation.latitude; baseLng = userLocation.longitude;
    } else if (mapRef.current) {
      try { const c = mapRef.current.getCenter(); baseLat = c.lat; baseLng = c.lng; } catch (e) {}
    }
    if (center && center.latitude && center.longitude) {
      baseLat = center.latitude; baseLng = center.longitude;
    }

    // Create 3 mock members clustered within ~5 meters
    const mockMembers = [
      { user_id: 'warrior_1', username: 'Alex', first_name: 'Alex', coordinates: { latitude: baseLat + 0.00001, longitude: baseLng + 0.00001 }, timestamp: new Date().toISOString(), place: false },
      { user_id: 'warrior_2', username: 'Bri', first_name: 'Bri', coordinates: { latitude: baseLat - 0.00001, longitude: baseLng - 0.000012 }, timestamp: new Date().toISOString(), place: false },
      { user_id: 'warrior_3', username: 'Cam', first_name: 'Cam', coordinates: { latitude: baseLat + 0.000012, longitude: baseLng - 0.000009 }, timestamp: new Date().toISOString(), place: false }
    ];

    // Merge with existing locations to ensure marker rendering includes them
    const merged = [...locations.filter(l => !mockMembers.find(m => m.user_id === l.user_id)), ...mockMembers];
    setLocations(merged);
    // Force immediate update
    updateMapMarkers(merged, true);
    showNotification('Simulated Warriors overlap (3 members)', 'info');
  };

  // Expose simulateWarriorsOverlap in dev
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      try { window.simulateWarriorsOverlap = simulateWarriorsOverlap; } catch (e) {}
    }
    return () => { try { if (window.simulateWarriorsOverlap) delete window.simulateWarriorsOverlap; } catch (e) {} };
  }, [locations, userLocation]);
  const locationDataRef = useRef(null);
  const locationsRef = useRef([]);
  const placesRef = useRef([]);
  const devSimulationActiveRef = useRef(false);
  const centerMarkerRef = useRef(null);
  const hoverRingRef = useRef(null);
  const selectionMouseMoveRef = useRef(null);

  // Keep a ref in sync so map event handlers can read the latest selection mode
  useEffect(() => {
    placeSelectionModeRef.current = placeSelectionMode;
  }, [placeSelectionMode]);

  // Keep refs in sync with state for map event handlers
  useEffect(() => { locationsRef.current = locations; }, [locations]);
  useEffect(() => { placesRef.current = places; }, [places]);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  // Persist screenThreshold so tuning remains between sessions
  useEffect(() => {
    try { localStorage.setItem('screenThreshold', String(screenThreshold)); } catch (e) {}
  }, [screenThreshold]);
  
  // Show drop notification
  const showNotification = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Fetch member locations with rate limiting protection
  const fetchWithRateLimitProtection = async () => {
    // Don't fetch if we don't have member data yet
    if (!members || members.length === 0) {
      console.log('Skipping location fetch - member data not loaded yet');
      return;
    }
    
    // Enforce minimum time between requests (at least 5 seconds)
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    const minTimeBetweenFetches = 5000; // 5 seconds minimum
    
    if (timeSinceLastFetch < minTimeBetweenFetches) {
      // console.log(`Too soon since last fetch (${Math.round(timeSinceLastFetch/1000)}s). Minimum wait time is ${minTimeBetweenFetches/1000}s.`);
      return;
    }
    
    // Update last fetch time
    setLastFetchTime(now);
    
    try {
      const response = await api.get(`/location/group/${groupId}`);
      const locationData = response.data.locations;
      
      // Reset consecutive errors and retry delay on success
      if (consecutiveErrors > 0) {
        setConsecutiveErrors(0);
        setRetryDelay(15); // Reset to default
      }
      
      // Enrich location data with usernames from members
      // Filter out current user's location since we handle it separately
      // Use multiple strategies since currentUser might be undefined
      const enrichedLocations = locationData
        .filter(location => {
          // Strategy 1: Filter by user_id if currentUser is available
          if (currentUser?.id && location.user_id === currentUser.id) {
            console.log('🚫 Filtered out current user by ID:', location.user_id);
            return false;
          }
          
          // Strategy 2: Check if this location matches any member with username "richcobrien"
          // (hardcoded fallback - we'll see this in logs and can make it dynamic)
          const member = members.find(m => m.user_id === location.user_id);
          if (member?.username === 'richcobrien') {
            console.log('🚫 Filtered out richcobrien by username match');
            return false;
          }
          
          return true;
        })
        .map(location => {
          const member = members.find(m => m.user_id === location.user_id);

          // Only include users that have proper member data
          if (member) {
            const enriched = {
              ...location,
              username: member.username,
              first_name: member.first_name,
              last_name: member.last_name,
              profile_image_url: member.profile_image_url,
              social_accounts: member.social_accounts
            };
            console.log('🎨 Enriched location:', {
              user_id: enriched.user_id,
              username: enriched.username,
              first_name: enriched.first_name,
              last_name: enriched.last_name,
              has_profile_image: !!enriched.profile_image_url,
              has_social_accounts: !!enriched.social_accounts,
              avatar_content: getAvatarContent(enriched)
            });
            return enriched;
          }

          // Skip users without member data (return null to filter out later)
          return null;
        }).filter(location => location !== null); // Remove null entries

      setLocations(enrichedLocations);

      // Update last-known locations cache for members that provided coordinates
      try {
        enrichedLocations.forEach(loc => {
          if (loc && loc.coordinates && loc.user_id) {
            lastKnownLocationsRef.current[loc.user_id] = { ...loc.coordinates, timestamp: loc.timestamp || Date.now() };
          }
        });
        try { localStorage.setItem('lastKnownLocations', JSON.stringify(lastKnownLocationsRef.current)); } catch (e) {}
      } catch (e) {}

      // Update map markers - include current user location if available
      let allLocations = enrichedLocations;
      console.log('🗺️ [fetchWithRateLimitProtection] Building allLocations. userLocation:', userLocation ? 'SET' : 'NULL');
      console.log('🔍 [fetchWithRateLimitProtection] currentUser (JWT-enriched):', currentUser);
      console.log('🔍 [fetchWithRateLimitProtection] currentUser?.profile_image_url:', currentUser?.profile_image_url);
      console.log('🔍 [fetchWithRateLimitProtection] currentUser?.first_name:', currentUser?.first_name);
      console.log('🔍 [fetchWithRateLimitProtection] currentUser?.last_name:', currentUser?.last_name);
      if (userLocation) {
        const currentUserLocation = {
          user_id: currentUser?.id || currentUser?.user_id || 'current-user',
          username: currentUser?.username || 'CurrentUser',
          first_name: currentUser?.first_name || null,
          last_name: currentUser?.last_name || null,
          profile_image_url: currentUser?.profile_image_url || null,
          social_accounts: currentUser?.social_accounts || null,
          gender: currentUser?.gender || null,
          coordinates: userLocation,
          timestamp: new Date().toISOString(),
          battery_level: 85
        };
        console.log('🖼️ [fetchWithRateLimitProtection] currentUserLocation.profile_image_url:', currentUserLocation.profile_image_url);
        console.log('✅ [fetchWithRateLimitProtection] Adding current user to allLocations');
        // No need to filter again - we already filtered enrichedLocations above
        allLocations = [currentUserLocation, ...enrichedLocations];
      } else {
        console.log('⚠️ [fetchWithRateLimitProtection] userLocation is null');
      }

      // Add places if they should be shown
      if (showPlaces) {
        allLocations = [...allLocations, ...places];
      }

      // Ensure every group member has an entry on the map — use last-known or default center as placeholder
      try {
        const byId = Object.fromEntries(allLocations.map(l => [String(l.user_id), l]));
        (members || []).forEach(m => {
          if (!byId[String(m.user_id)]) {
            const last = lastKnownLocationsRef.current[m.user_id] || null;
            const coords = last ? { latitude: last.latitude, longitude: last.longitude } : { latitude: defaultCenter[1], longitude: defaultCenter[0] };
            const placeholder = {
              user_id: m.user_id,
              username: m.username,
              first_name: m.first_name,
              coordinates: coords,
              timestamp: last && last.timestamp ? last.timestamp : null,
              battery_level: null,
              location_missing: true
            };
            allLocations.push(placeholder);
          }
        });
      } catch (e) {}

      updateMapMarkers(allLocations);

      // Check for proximity alerts
      if (showProximityAlerts && userLocation) {
        console.log('🔍 [Line 610] Proximity check - enrichedLocations:', enrichedLocations.map(l => ({ user_id: l.user_id, username: l.username })));
        console.log('🔍 [Line 610] Current user:', { id: currentUser?.id, username: currentUser?.username });
        checkProximityAlerts(enrichedLocations);
      }
    } catch (error) {
      console.error('Error in fetchMemberLocations (rate limited):', error);
    }
  };

  useEffect(() => {    // Initial fetch when component mounts
    if (sharingLocation) {
      fetchWithRateLimitProtection();
    }
    
    // Set up interval with dynamic timing based on rate limiting
    const intervalId = setInterval(() => {
      if (sharingLocation) {
        fetchWithRateLimitProtection();
      }
    }, isRateLimited ? retryDelay * 10000 : Math.max(updateInterval * 1000, 15000)); // Minimum 15 seconds
    
    return () => clearInterval(intervalId);
  }, [sharingLocation, updateInterval, isRateLimited, retryDelay, groupId, userLocation, showProximityAlerts, consecutiveErrors, lastFetchTime]);
  
  // Fetch group details and member information
  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/groups/${groupId}`);
      const groupData = response.data.group;
      
      console.log('Group data received:', groupData);
      console.log('Members in group:', groupData.members);
      
    setGroup(groupData);
    setMembers(groupData.members);
    
    // Fetch initial member locations with the fresh member data
    fetchMemberLocations(groupData.members);
    
    // If location sharing is enabled, also start the rate-limited fetching
    if (sharingLocation) {
      // Small delay to ensure the initial fetch completes first
      setTimeout(() => {
        fetchWithRateLimitProtection();
      }, 100);
    }
    
    // Check if group has places by fetching them
    try {
      const placesResponse = await api.get(`/groups/${groupId}/places`);
      const places = placesResponse.data.places || [];
      if (places.length > 0) {
        setShowPlaces(true);
      }
    } catch (placesError) {
      console.warn('Could not fetch places for group:', placesError);
      // Don't fail the whole load if places fetch fails
    }
    
    setError('');
    } catch (error) {
      console.error('Error fetching group details:', error);
      setError('Failed to load group details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch locations of all group members
  const fetchMemberLocations = async (membersData = null) => {
    try {
      const response = await api.get(`/location/group/${groupId}`);
      const locationData = response.data.locations;
      
      // Enrich location data with usernames from members
      // Filter out current user's location since we handle it separately
      // Use multiple strategies since currentUser might be undefined
      let enrichedLocations = locationData
        .filter(location => {
          // Strategy 1: Filter by user_id if currentUser is available
          if (currentUser?.id && location.user_id === currentUser.id) {
            console.log('🚫 [fetchMemberLocations] Filtered out current user by ID:', location.user_id);
            return false;
          }
          
          // Strategy 2: Check if this location matches any member with username "richcobrien"
          const member = (membersData || members).find(m => m.user_id === location.user_id);
          if (member?.username === 'richcobrien') {
            console.log('🚫 [fetchMemberLocations] Filtered out richcobrien by username match');
            return false;
          }
          
          return true;
        })
        .map(location => {
          const member = (membersData || members).find(m => m.user_id === location.user_id);

          // Only include users that have proper member data
          if (member) {
            const enriched = {
              ...location,
              username: member.username,
              first_name: member.first_name,
              last_name: member.last_name,
              profile_image_url: member.profile_image_url,
              social_accounts: member.social_accounts
            };
            console.log('🎨 [fetchMemberLocations] Enriched location:', {
              user_id: enriched.user_id,
              username: enriched.username,
              first_name: enriched.first_name,
              last_name: enriched.last_name,
              has_profile_image: !!enriched.profile_image_url,
              has_social_accounts: !!enriched.social_accounts,
              avatar_content: getAvatarContent(enriched)
            });
            return enriched;
          }

          // Skip users without member data (return null to filter out later)
          return null;
        }).filter(location => location !== null); // Remove null entries

      setLocations(enrichedLocations);

      // Update last-known locations cache
      try {
        enrichedLocations.forEach(loc => {
          if (loc && loc.coordinates && loc.user_id) {
            lastKnownLocationsRef.current[loc.user_id] = { ...loc.coordinates, timestamp: loc.timestamp || Date.now() };
          }
        });
        try { localStorage.setItem('lastKnownLocations', JSON.stringify(lastKnownLocationsRef.current)); } catch (e) {}
      } catch (e) {}

      // Update map markers - include current user location if available
      let allLocations = enrichedLocations;
      console.log('🗺️ [fetchMemberLocations] Building allLocations. userLocation:', userLocation ? 'SET' : 'NULL', 'enrichedLocations count:', enrichedLocations.length);
      console.log('🔍 [fetchMemberLocations] user from useAuth:', user);
      console.log('🔍 [fetchMemberLocations] user?.profile_image_url:', user?.profile_image_url);
      if (userLocation) {
        const currentUserLocation = {
          user_id: user?.user_id || user?.id || currentUser?.id || 'current-user',
          username: user?.username || currentUser?.username || 'CurrentUser',
          first_name: user?.first_name || currentUser?.first_name || null,
          last_name: user?.last_name || currentUser?.last_name || null,
          profile_image_url: user?.profile_image_url || currentUser?.profile_image_url || null,
          social_accounts: user?.social_accounts || currentUser?.social_accounts || null,
          gender: user?.gender || currentUser?.gender || null,
          coordinates: userLocation,
          timestamp: new Date().toISOString(),
          battery_level: 85
        };
        console.log('✅ Adding current user to allLocations:', { user_id: currentUserLocation.user_id, username: currentUserLocation.username });
        console.log('🖼️ [fetchMemberLocations] currentUserLocation.profile_image_url:', currentUserLocation.profile_image_url);
        // No need to filter again - we already filtered enrichedLocations above
        allLocations = [currentUserLocation, ...enrichedLocations];
      } else {
        console.log('⚠️ userLocation is null, not adding current user to map');
      }

      // Add places if they should be shown
      if (showPlaces) {
        allLocations = [...allLocations, ...places];
      }

      if (!placeSelectionMode) {
        try {
          const byId = Object.fromEntries(allLocations.map(l => [String(l.user_id), l]));
          (members || []).forEach(m => {
            if (!byId[String(m.user_id)]) {
              const last = lastKnownLocationsRef.current[m.user_id] || null;
              const coords = last ? { latitude: last.latitude, longitude: last.longitude } : { latitude: defaultCenter[1], longitude: defaultCenter[0] };
              const placeholder = {
                user_id: m.user_id,
                username: m.username,
                first_name: m.first_name,
                coordinates: coords,
                timestamp: last && last.timestamp ? last.timestamp : null,
                battery_level: null,
                location_missing: true
              };
              allLocations.push(placeholder);
            }
          });
        } catch (e) {}

        updateMapMarkers(allLocations);
      }

      // Check for proximity alerts
      if (showProximityAlerts && userLocation) {
        console.log('🔍 [Line 763] Proximity check - enrichedLocations:', enrichedLocations.map(l => ({ user_id: l.user_id, username: l.username })));
        console.log('🔍 [Line 763] Current user:', { id: currentUser?.id, username: currentUser?.username });
        checkProximityAlerts(enrichedLocations);
      }
      
      // Add mock test users for Warriors group testing
      const mockUsers = [
        {
          user_id: 'mock_breanna',
          username: 'Breanna O\'Brien',
          first_name: 'Breanna',
          last_name: 'O\'Brien',
          coordinates: {
            latitude: 39.7392 + 0.001, // Fixed offset for Denver area
            longitude: -104.9903 + 0.001,
            accuracy: 15,
            altitude: 1609,
            heading: 0,
            speed: 0
          },
          timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(), // Within last 5 minutes
          battery_level: 78
        },
        {
          user_id: 'mock_kaitlyn',
          username: 'Kaitlyn O\'Brien',
          first_name: 'Kaitlyn',
          last_name: 'O\'Brien',
          coordinates: {
            latitude: 39.7392 + 0.002, // Fixed offset
            longitude: -104.9903 + 0.002,
            accuracy: 12,
            altitude: 1609,
            heading: 0,
            speed: 0
          },
          timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
          battery_level: 92
        },
        {
          user_id: 'mock_joesel',
          username: 'Joesel Varner',
          first_name: 'Joesel',
          last_name: 'Varner',
          coordinates: {
            latitude: 39.7392 - 0.001, // Fixed offset
            longitude: -104.9903 - 0.001,
            accuracy: 18,
            altitude: 1609,
            heading: 0,
            speed: 0
          },
          timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
          battery_level: 65
        },
        {
          user_id: 'mock_lee',
          username: 'Lee Williams',
          first_name: 'Lee',
          last_name: 'Williams',
          coordinates: {
            latitude: 39.7392 - 0.002, // Fixed offset
            longitude: -104.9903 - 0.002,
            accuracy: 22,
            altitude: 1609,
            heading: 0,
            speed: 0
          },
          timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
          battery_level: 88
        },
        {
          user_id: 'mock_kalani',
          username: 'Kalani Weldon',
          first_name: 'Kalani',
          last_name: 'Weldon',
          coordinates: {
            latitude: 39.7392 + 0.003, // Fixed offset
            longitude: -104.9903 + 0.003,
            accuracy: 14,
            altitude: 1609,
            heading: 0,
            speed: 0
          },
          timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
          battery_level: 73
        }
      ];

      // Add mock users to enriched locations for testing
      enrichedLocations = [...enrichedLocations, ...mockUsers];

      // Return the normalized/enriched locations array
      return enrichedLocations;
    } catch (error) {
      console.error('Error fetching member locations:', error);
      return [];
    }
  };  // Fetch member locations and update markers (including current user if available)
  const fetchMemberLocationsAndUpdateMarkers = async () => {
    // Don't fetch if we don't have member data yet
    if (!members || members.length === 0) {
      console.log('Skipping manual location fetch - member data not loaded yet');
      return;
    }
    
    const memberLocations = await fetchMemberLocations();
    setLocations(memberLocations);
    
    // Include places if they should be shown
    const allLocations = showPlaces ? [...memberLocations, ...places] : memberLocations;
    
    // The fetchMemberLocations function now handles including current user location
    // No need to duplicate the logic here
  };

  // WebSocket connection for real-time location updates
  useEffect(() => {
    if (!groupId) return;

    // Determine socket URL based on environment
    const isDevelopment = import.meta.env.MODE === 'development';
    const socketUrl = isDevelopment 
      ? window.location.origin  // Dev: use Vite proxy
      : (import.meta.env.VITE_BACKEND_URL || window.location.origin);

    console.log('🌐 Connecting to Socket.IO for location tracking...', socketUrl);

    const socket = io(socketUrl, {
      transports: ['polling', 'websocket'], // Try polling first (more reliable on Render free tier)
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      path: '/socket.io',
      forceNew: false,
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected for location tracking');
      console.log('✅ Transport used:', socket.io.engine.transport.name);
      socket.emit('join-group', { groupId });
      // Removed: showNotification - just work silently
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      console.log('Will retry connection...');
      // Don't show error notification on every retry, it's normal
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
      socket.emit('join-group', { groupId });
      // Removed: showNotification - just work silently
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnection failed');
      // Removed: showNotification - polling will handle it silently
    });

    // Listen for location updates from other members
    socket.on('member-location', (data) => {
      console.log('📍 Received location update from member:', data.userId);
      
      // Skip if this is our own location update (we handle it separately)
      if (data.userId === currentUser?.id) {
        console.log('⏭️ Skipping own location update from WebSocket');
        return;
      }
      
      // Update locations state with the new member location
      setLocations(prev => {
        const updated = prev.filter(loc => loc.user_id !== data.userId);
        const member = members.find(m => m.user_id === data.userId);
        
        const newLocation = {
          user_id: data.userId,
          username: member?.username || 'Unknown',
          first_name: member?.first_name || null,
          coordinates: data.location,
          timestamp: data.timestamp,
          battery_level: data.location.battery_level || null
        };
        
        return [...updated, newLocation];
      });
    });

    socketRef.current = socket;

    return () => {
      console.log('🔌 Disconnecting Socket.IO for location tracking');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [groupId, members]);

  // Continuous location tracking with watchPosition
  useEffect(() => {
    if (!sharingLocation || !groupId) {
      // Stop watching if location sharing is disabled
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('⏹️ Stopped continuous location tracking');
      }
      return;
    }

    console.log('🎯 Starting continuous location tracking with watchPosition...');

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
        
        const locationData = {
          latitude,
          longitude,
          accuracy,
          altitude: altitude || 0,
          heading: heading || 0,
          speed: speed || 0
        };

        console.log('📍 Location update:', locationData);

        // Update local user location state
        setUserLocation(locationData);
        
        // Store in localStorage
        try {
          localStorage.setItem('lastUserLocation', JSON.stringify(locationData));
        } catch (e) {}

        // Broadcast via WebSocket
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('location-update', {
            groupId,
            userId: currentUser?.id,
            location: locationData
          });
          console.log('📡 Broadcasted location update via WebSocket');
        }

        // Also save to backend via API
        api.post('/location/update', {
          coordinates: locationData,
          device_id: navigator.userAgent,
          battery_level: 85 // TODO: Get actual battery level if available
        }).catch(err => {
          console.warn('Failed to save location to API:', err);
        });
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        showNotification(`Location error: ${error.message}`, 'error');
      },
      {
        enableHighAccuracy: highAccuracyMode,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log('⏹️ Stopped watchPosition on cleanup');
      }
    };
  }, [sharingLocation, groupId, user, highAccuracyMode]);

  // Initialize map when component mounts
  useEffect(() => {
    // console.log('LocationTracking component mounted, initializing map');
    initializeMap();
  }, []);

  // Safety: ensure place selection/create-place UI is not active by default on initial load
  useEffect(() => {
    // Prevent accidental create-place overlay/dialog appearing on initial load
    try {
      if (placeSelectionMode) setPlaceSelectionMode(false);
    } catch (e) {}
    try {
      if (openCreatePlaceDialog) setOpenCreatePlaceDialog(false);
    } catch (e) {}
  }, []);

  // Fetch group details on component mount
  useEffect(() => {
    fetchGroupDetails();
  }, []);

  // Initialize rename input when dialog opens for a place
  useEffect(() => {
    if (openLocationDialog && selectedLocation && selectedLocation.place) {
      setRenameText(selectedLocation.username || '');
    } else {
      setRenameText('');
    }
  }, [openLocationDialog, selectedLocation]);

  useEffect(() => {
    if (locationInfo) {
      showNotification(locationInfo, 'info');
    }
  }, [locationInfo]);

  useEffect(() => {
    if (isRateLimited) {
      showNotification(`Rate limit detected. Retrying in ${retryDelay} seconds.`, 'warning');
    }
  }, [isRateLimited, retryDelay]);

  useEffect(() => {
    if (locationError) {
      showNotification(locationError, 'error');
    }
  }, [locationError]);

  useEffect(() => {
    if (error) {
      showNotification(error, 'error');
    }
  }, [error]);

  // Handle places toggle
  useEffect(() => {
    const updatePlacesOnMap = async () => {
      if (showPlaces && mapRef.current) {
        try {
          // Fetch places for the group
          const fetchedPlaces = await fetchPlacesForGroup();
          console.log('Fetched places:', fetchedPlaces);
          setPlaces(fetchedPlaces);
          
          // Get current member locations
          const memberLocations = await fetchMemberLocations();
          
          // Include current user location if available
          const currentUserLoc = userLocation ? [{
            user_id: currentUser?.id || 'current-user',
            username: currentUser?.username || 'CurrentUser',
            first_name: currentUser?.first_name || null,
            coordinates: userLocation,
            timestamp: new Date().toISOString(),
            battery_level: 85
          }] : [];
          
          // Combine member locations, user location, and places
          const allLocations = [...currentUserLoc, ...memberLocations, ...fetchedPlaces];
          
          // Update markers to include places (but hide member locations during place selection mode)
          if (!placeSelectionMode) {
            console.log('📍 [updatePlacesOnMap-L1230] Updating map with allLocations (members + user + places):', allLocations.length);
            updateMapMarkers(allLocations);
          } else {
            // During place selection mode, only show places
            console.log('⚠️ [updatePlacesOnMap-L1234] PLACE SELECTION MODE - showing only places:', fetchedPlaces.length);
            updateMapMarkers(fetchedPlaces);
          }
        } catch (error) {
          console.error('Error fetching places:', error);
        }
      } else if (!showPlaces && mapRef.current) {
        // When not showing places, just show member locations (but hide during place selection mode)
        if (!placeSelectionMode) {
          // Include current user location
          const currentUserLoc = userLocation ? [{
            user_id: currentUser?.id || 'current-user',
            username: currentUser?.username || 'CurrentUser',
            first_name: currentUser?.first_name || null,
            coordinates: userLocation,
            timestamp: new Date().toISOString(),
            battery_level: 85
          }] : [];
          const allLocations = [...currentUserLoc, ...locations];
          console.log('📍 [updatePlacesOnMap-L1253] Updating map without places (members + user):', allLocations.length);
          updateMapMarkers(allLocations);
        }
      }
    };
    
    updatePlacesOnMap();
  }, [showPlaces, groupId, members, userLocation]);
  
  // Handle place selection mode changes
  useEffect(() => {
    // Only show the center HUD marker when both selection mode and overlay mode are active
    if (placeSelectionMode && overlayCreateMode && mapRef.current) {
      createCenterMarker();
    } else {
      // Always try to remove center marker when overlay is off or not in selection mode
      removeCenterMarker();
    }

    // Cleanup on unmount
    return () => {
      removeCenterMarker();
    };
  }, [placeSelectionMode, overlayCreateMode]);

  // Fetch nearby places using Mapbox Geocoding API (POI & address)
  const fetchPlacesAround = async (lng, lat, limit = 6) => {
    if (!mapboxgl || !mapboxgl.accessToken) return [];
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=poi,address&limit=${limit}&access_token=${mapboxgl.accessToken}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data || !data.features) return [];
      return data.features.map((f, i) => ({
        user_id: `place_${f.id || i}`,
        username: f.text + (f.properties && f.properties.address ? ` (${f.properties.address})` : ''),
        coordinates: { latitude: f.center[1], longitude: f.center[0] },
        timestamp: new Date().toISOString(),
        battery_level: null,
        place: true
      }));
    } catch (e) {
      console.error('Error fetching places from Mapbox:', e);
      return [];
    }
  };

  // Fetch places from backend for the current group
  const fetchPlacesForGroup = async () => {
    if (!groupId) return [];
    try {
      const resp = await api.get(`/groups/${groupId}/places`);
      const places = resp.data.places || [];
      // Normalize places into a 'location-like' shape so updateMapMarkers can render them
      return places.map(p => ({
        user_id: `place_${p._id}`,
        username: p.name,
        coordinates: { latitude: p.coordinates.latitude, longitude: p.coordinates.longitude },
        timestamp: p.createdAt,
        battery_level: null,
        place: true,
        raw: p
      }));
    } catch (e) {
      console.warn('Failed to fetch places for group', e);
      return [];
    }
  };

  // Format name as "First Name Last Initial" for privacy
  const formatDisplayName = (username, firstName, lastName) => {
    // If we have first and last name, use full name
    if (firstName && lastName) {
      return `${firstName.trim()} ${lastName.trim()}`;
    }
    
    // If we have first name only, use it
    if (firstName) {
      return firstName.trim();
    }
    
    // If we have username, try to parse it
    if (username) {
      // Check if username contains a space (first last format)
      const parts = username.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
      }
      // Check if username contains underscore or dot (common separators)
      const underscoreParts = username.split('_');
      if (underscoreParts.length >= 2) {
        return `${underscoreParts[0]} ${underscoreParts[1].charAt(0).toUpperCase()}.`;
      }
      const dotParts = username.split('.');
      if (dotParts.length >= 2) {
        return `${dotParts[0]} ${dotParts[1].charAt(0).toUpperCase()}.`;
      }
      // For "Member X" format, just return the first name part
      if (username.startsWith('Member ')) {
        return username;
      }
      // Just use the username as-is if it doesn't have separators
      return username;
    }
    
    return username || 'Unknown';
  };

  // Promise wrapper for getCurrentPosition with timeout
  const getCurrentPositionAsync = (timeout = 8000) => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not available'));
    let timedOut = false;
    const to = setTimeout(() => {
      timedOut = true;
      reject(new Error('Geolocation timeout'));
    }, timeout);
    navigator.geolocation.getCurrentPosition((pos) => {
      if (timedOut) return;
      clearTimeout(to);
      
      // Check accuracy before resolving
      if (pos.coords.accuracy > accuracyThreshold) {
        reject(new Error(`Position too inaccurate: ${pos.coords.accuracy} meters`));
        return;
      }
      
      resolve(pos);
    }, (err) => {
      if (timedOut) return;
      clearTimeout(to);
      reject(err);
    }, { enableHighAccuracy: true, maximumAge: 30000, timeout });
  });

  // Generate runtime data (members + places + user position) for a given map center
  const generateRuntimeData = async (center) => {
    // Don't fetch if we don't have member data yet
    if (!members || members.length === 0) {
      console.log('Skipping runtime data generation - member data not loaded yet');
      return;
    }
    
    try {
      // Ensure member locations are fresh
      const enrichedMembersData = await fetchMemberLocations();

      // Fetch nearby places around the given center
      // const placeResults = await fetchPlacesAround(center.lng, center.lat, 6);

      // Merge member locations and places (user location handled separately by location tracking)
      const merged = [];
      const seen = new Set();
      (enrichedMembersData || []).forEach(m => { seen.add(String(m.user_id)); merged.push(m); });
      
      // Don't add current user to locations state - it's handled separately
      // in updateMapMarkersWithUserLocation to avoid duplicates

      // (placeResults || []).forEach(p => { if (!seen.has(p.user_id)) merged.push(p); });

      // Also fetch backend places and include them (places may be separate from Mapbox POI results)
      // try {
      //   const backendPlaces = await fetchPlacesForGroup();
      //   backendPlaces.forEach(bp => { if (!seen.has(bp.user_id)) { merged.push(bp); seen.add(bp.user_id); } });
      // } catch (e) {
      //   // ignore
      // }

      setLocations(merged);
      if (!placeSelectionMode) {
        // Include places if they should be shown
        const allLocations = showPlaces ? [...merged, ...places] : merged;
        updateMapMarkers(allLocations);
      }
    } catch (e) {
      console.error('Error generating runtime data:', e);
    }
  };
  
  // Initialize the map
  const initializeMap = () => {
    // console.log('Initializing map, mapboxgl available:', !!mapboxgl);
    if (!mapboxgl) {
      console.error('Mapbox GL JS is not available');
      setMapLoaded(true); // Show UI anyway
      return;
    }
    
    // Check if map is already initialized
    if (mapRef.current) {
      console.log('Map already initialized, skipping');
      return;
    }
    
    // Ensure any leftover center marker is removed
    removeCenterMarker();
    
    try {
      // Check if the map container ref is available
      if (!mapContainerRef.current) {
        // console.error('Map container ref is not available yet - retrying in 100ms');
        // Retry after a short delay to allow DOM to be ready
        setTimeout(() => {
          initializeMap();
        }, 100);
        return;
      }
      // console.log('Map container ref is available, proceeding with map creation');
      
      mapboxgl.accessToken = MAPBOX_TOKEN;
      // console.log('Mapbox token set:', MAPBOX_TOKEN ? 'YES' : 'NO');
      
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12', // Try a different style
        center: defaultCenter, // Use last known location or neutral fallback
        zoom: 15
      });
      
      // console.log('Map object created:', !!map);
      
      map.on('load', () => {
        // console.log('Map loaded successfully!');
        setMapLoaded(true);
        mapRef.current = map;
        // expose map globally for PlaceControls to read center and for external triggers
        try { window.__TJ_MAP__ = map; } catch (e) { /* ignore */ }
        
        // Add error event listener
        map.on('error', (e) => {
          console.error('Map error:', e);
        });
        
        // Add user location marker if available
        if (userLocation) {
          centerMapOnLocation(userLocation);
        }
        
        // Add markers for all members (or flush any pending queued locations)
            if (pendingLocationsRef.current) {
          // console.debug('Flushing pending locations to map', pendingLocationsRef.current);
          if (!placeSelectionMode) {
            const allLocations = showPlaces ? [...pendingLocationsRef.current, ...places] : pendingLocationsRef.current;
            updateMapMarkers(allLocations, true);
          }
          pendingLocationsRef.current = null;
        } else if (locations.length > 0) {
          if (!placeSelectionMode) {
            const allLocations = showPlaces ? [...locations, ...places] : locations;
            updateMapMarkers(allLocations);
          }
        }

        // No automatic DEV fallback markers here; map will render actual member locations and places from backend
        
        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

        // When the map stops moving, regenerate runtime data (members + places + user pos)
        const onMoveEnd = () => {
          try {
            if (devSimulationActiveRef.current) return; // don't override simulated dataset
            const center = map.getCenter();
            generateRuntimeData({ lng: center.lng, lat: center.lat });
          } catch (e) {
            console.error('Error during map moveend runtime data generation', e);
          }
        };

        // Map click: allow creating a place from a POI feature even when not in selection mode
        map.on('click', (e) => {
          try {
            const { lngLat, point } = e;

            // Try to pick a rendered feature (POI) at the click point and use it to prefill the place name/address
            let poi = null;
            try {
              const features = map.queryRenderedFeatures(point);
              if (features && features.length > 0) {
                // Prefer features that are clearly POI/place labels by checking layer id
                const candidate = features.find(f => {
                  const lid = (f.layer && (f.layer.id || f.layer['source-layer'])) || '';
                  if (typeof lid === 'string' && /poi|place|poi-label|place_label/i.test(lid)) return true;
                  // Fallback: require strong properties for POI (maki, category, wikidata)
                  const p = f.properties || {};
                  if (p.maki || p.wikidata || p.category) return true;
                  return false;
                });
                if (candidate) {
                  const props = candidate.properties || {};
                  const name = props.name || props['name_en'] || props.text || props.place_name || null;
                  const address = props.address || props['addr'] || null;
                  poi = { name, address, raw: candidate };
                }
              }
            } catch (featErr) {
              // ignore feature query errors
            }

            // If we clicked a POI/feature or we're explicitly in selection mode, open the create dialog
            if (poi) {
              createPlaceAtLocation(lngLat.lat, lngLat.lng, poi);
              // If we were in selection mode, exit it so the UI resets
              if (placeSelectionModeRef.current) setPlaceSelectionMode(false);
              return;
            }

            // Otherwise only create places when explicitly selecting
            if (!placeSelectionModeRef.current) return;

            createPlaceAtLocation(lngLat.lat, lngLat.lng, null);
            // After creating, exit selection mode so UI resets (hover ring/cursor)
            setPlaceSelectionMode(false);
          } catch (err) {
            console.error('Failed to create place at clicked location', err);
          }
        });

        // CRITICAL PIN BEHAVIOR CONFIGURATION:
        // allowRecalibrationOnMapChange controls pin behavior during map changes
        // When true: pins are geographic anchors that move with map viewport
        // When false: pins stay fixed on screen like HUD overlays
        // Enable moveend/zoomend events for geographic anchor behavior

        if (!PIN_CONFIG.allowRecalibrationOnMapChange) {
          // HUD overlay mode - disable events so pins stay fixed on screen
          // map.on('moveend', onMoveEnd);

          // Disable zoomend event to prevent pin recalibration on zoom
          // map.on('zoomend', () => {
          //   fetchMemberLocationsAndUpdateMarkers();
          // });
        } else {
          // Geographic anchor mode - enable events so pins move with map viewport
          map.on('moveend', onMoveEnd);
          // When zoom changes, re-render markers using current data so aggregation adapts to zoom
          map.on('zoomend', () => {
            try {
              if (devSimulationActiveRef.current) return; // don't override simulated dataset
              
              // Add current user to locations - use ref to get current value
              const currentUserLoc = userLocationRef.current ? [{
                user_id: currentUser?.id || 'current-user',
                username: currentUser?.username || 'CurrentUser',
                first_name: currentUser?.first_name || null,
                coordinates: userLocationRef.current,
                timestamp: new Date().toISOString(),
                battery_level: 85
              }] : [];
              
              const currentLocations = locationsRef.current || [];
              const currentPlaces = placesRef.current || [];
              const allLocations = showPlaces 
                ? [...currentUserLoc, ...currentLocations, ...currentPlaces] 
                : [...currentUserLoc, ...currentLocations];
              console.log('🔍 [zoomend-L1594] Updating markers after zoom:', allLocations.length);
              // Force immediate re-render so clusters/aggregation update with zoom
              updateMapMarkers(allLocations, true);
            } catch (e) {
              console.warn('Error updating markers on zoomend', e);
            }
          });
        }

        // Initial runtime data generation at map center
        try {
          const c = map.getCenter();
          generateRuntimeData({ lng: c.lng, lat: c.lat });
        } catch (e) {
          console.error('Initial runtime data generation failed', e);
        }

        // Load places if they should be shown
        if (showPlaces) {
          fetchPlacesForGroup().then(fetchedPlaces => {
            if (fetchedPlaces.length > 0) {
              setPlaces(fetchedPlaces);
              // Add places to current markers
              const currentUserLoc = userLocation ? [{
                user_id: currentUser?.id || 'current-user',
                username: currentUser?.username || 'CurrentUser',
                first_name: currentUser?.first_name || null,
                coordinates: userLocation,
                timestamp: new Date().toISOString(),
                battery_level: 85
              }] : [];
              const allLocations = [...currentUserLoc, ...locations, ...fetchedPlaces];
              console.log('🏛️ [mapInit-L1624] Loading places on map init:', allLocations.length);
                  updateMapMarkers(allLocations, true);
            }
          }).catch(error => {
            console.warn('Failed to load places on map load:', error);
          });
        }
      });
      
      // Re-add markers when map style changes (e.g., satellite toggle)
      map.on('styledata', () => {
        // Only re-add markers after initial load is complete
        if (mapRef.current && mapLoaded) {
          console.log('Map style changed, re-adding markers');
          
          // Include current user location - use refs to get current values
          const currentUserLoc = userLocationRef.current ? [{
            user_id: currentUser?.id || 'current-user',
            username: currentUser?.username || 'CurrentUser',
            first_name: currentUser?.first_name || null,
            coordinates: userLocationRef.current,
            timestamp: new Date().toISOString(),
            battery_level: 85
          }] : [];
          
          const currentLocations = locationsRef.current || [];
          const currentPlaces = placesRef.current || [];
          const allLocations = showPlaces 
            ? [...currentUserLoc, ...currentLocations, ...currentPlaces] 
            : [...currentUserLoc, ...currentLocations];
            
          if (allLocations.length > 0 && !placeSelectionMode) {
            // Small delay to ensure style is fully loaded
            setTimeout(() => {
              updateMapMarkers(allLocations, true);
            }, 100);
          }
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapLoaded(true); // Set to true anyway to show the UI
    }
  };

  // Start tracking the user's location
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsGettingLocation(false); // Ensure loading state is cleared
      return;
    }
    
    // Prevent multiple simultaneous geolocation requests
    if (isGettingLocation) {
      return;
    }
    
    // Clear any previous location errors when starting fresh
    setLocationError(null);
    setLocationInfo(null);
    
    setIsGettingLocation(true);
    
    // Safety timeout: use last known location after 5 seconds if GPS doesn't respond
    const safetyTimeout = setTimeout(() => {
      if (isGettingLocation) {
        console.warn('Geolocation request timed out after 5 seconds - using last known location');
        setIsGettingLocation(false);
        
        // Try to use last known location from localStorage
        try {
          const lastLocation = localStorage.getItem('lastUserLocation');
          if (lastLocation) {
            const parsedLocation = JSON.parse(lastLocation);
            console.log('Using last known location:', parsedLocation);
            
            // Set the last known location as current location
            setUserLocation(parsedLocation);
            setLocationError(null);
            setGeolocationRetries(0);
            
            // Update the server with the cached location
            updateLocationOnServer(parsedLocation);
            
            // Center map on the cached location
            centerMapOnLocation(parsedLocation);
            
            // Update map markers
            updateMapMarkersWithUserLocation(parsedLocation);
            
            // Continue with location watching in background
            startWatchingPosition();
            
            // Show a subtle notification that we're using cached location
            setLocationInfo('Using last known location. GPS may be slow to respond.');
            setTimeout(() => setLocationInfo(null), 3000); // Clear after 3 seconds
          } else {
            // No cached location available
            setLocationError('Location request timed out and no cached location available. Please try again.');
          }
        } catch (e) {
          console.error('Error using cached location:', e);
          setLocationError('Location request timed out. Please try again.');
        }
      }
    }, 5000); // 5 seconds
    
    const options = {
      enableHighAccuracy: highAccuracyMode,
      timeout: 30000 // Increased to 30 seconds for better GPS acquisition
    };
    
    try {
      // Use getCurrentPosition first to get an immediate position if available
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(safetyTimeout); // Clear safety timeout on success
          handlePositionSuccess(position);
          
          // After getting initial position, start watching for updates
          startWatchingPosition();
        },
        (error) => {
          clearTimeout(safetyTimeout); // Clear safety timeout on error
          console.log('Error getting initial position:', error);
          setLocationError('Failed to get initial location. ' + getGeolocationErrorMessage(error));
          setIsGettingLocation(false);
          // Don't start watching if initial position failed - user can try again
        },
        options
      );
    } catch (error) {
      clearTimeout(safetyTimeout); // Clear safety timeout on exception
      console.error('Error starting location tracking:', error);
      setLocationError('Failed to start location tracking. Please try again.');
      setIsGettingLocation(false);
    }
  };
  
  // Start watching position for continuous updates
  const startWatchingPosition = () => {
    const options = {
      enableHighAccuracy: highAccuracyMode,
      timeout: 25000, // Increased to 25 seconds for better GPS acquisition
      maximumAge: 15000 // Allow cached positions up to 15 seconds old
    };
    
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        handlePositionError,
        options
      );
    } catch (error) {
      console.error('Error setting up position watching:', error);
      setLocationError('Failed to set up continuous location tracking.');
      setIsGettingLocation(false);
    }
  };
  
  // Handle successful position acquisition
  const handlePositionSuccess = (position) => {
    const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
    
    // Filter out obviously inaccurate positions (> accuracy threshold)
    if (accuracy > accuracyThreshold) {
      console.log('Position too inaccurate, skipping:', accuracy, 'meters (threshold:', accuracyThreshold, 'meters)');
      return;
    }
    
    const newReading = {
      latitude,
      longitude,
      accuracy,
      altitude: altitude || 0,
      heading: heading || 0,
      speed: speed || 0,
      timestamp: Date.now()
    };
    
    if (useBestReading) {
      // Add to buffer
      setGpsReadingsBuffer(prev => {
        const updated = [...prev, newReading];
        
        // Keep only readings from the last 10 seconds
        const recentReadings = updated.filter(reading => 
          Date.now() - reading.timestamp < 10000
        );
        
        // If we have multiple readings, use the most accurate one
        if (recentReadings.length >= 3) {
          const bestReading = recentReadings.reduce((best, current) => 
            current.accuracy < best.accuracy ? current : best
          );
          
          // console.log('Using best reading from buffer:', bestReading, 'from', recentReadings.length, 'readings');
          setUserLocation(bestReading);
          setLocationError(null);
          setIsGettingLocation(false);
          setGeolocationRetries(0);
          
          // Save to localStorage for future map centering
          try {
            localStorage.setItem('lastUserLocation', JSON.stringify(bestReading));
          } catch (e) {
            // Ignore localStorage errors
          }
          
          // Update the server with the best location
          updateLocationOnServer(bestReading);
          
          // Center map on user's location if this is the first location update
          if (!userLocation && mapRef.current) {
            centerMapOnLocation(bestReading);
          }
          
          // Update map markers to include current user location
          updateMapMarkersWithUserLocation(bestReading);
          
          // Clear buffer after using
          return [];
        }
        
        return recentReadings;
      });
    } else {
      // Use immediate reading
      setUserLocation(newReading);
      setLocationError(null);
      setIsGettingLocation(false);
      setGeolocationRetries(0);
      
      // Save to localStorage for future map centering
      try {
        localStorage.setItem('lastUserLocation', JSON.stringify(newReading));
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // Update the server with the new location
      updateLocationOnServer(newReading);
      
      // Center map on user's location if this is the first location update
      if (!userLocation && mapRef.current) {
        centerMapOnLocation(newReading);
      }
      
      // Update map markers to include current user location
      updateMapMarkersWithUserLocation(newReading);
    }
  };
  
  // Handle position acquisition errors
  const handlePositionError = (error) => {
    console.error('Error getting location:', error);
    
    // Increment retry counter
    const newRetryCount = geolocationRetries + 1;
    setGeolocationRetries(newRetryCount);
    
    // Get appropriate error message
    const errorMessage = getGeolocationErrorMessage(error);
    
    // If we've tried too many times, stop retrying
    if (newRetryCount >= 3) {
      setLocationError(`${errorMessage} Please check your location permissions and try again.`);
      setIsGettingLocation(false);
      return;
    } else {
      // Retry with high accuracy maintained and longer timeout
      setTimeout(() => {
        navigator.geolocation.getCurrentPosition(
          handlePositionSuccess,
          handlePositionError,
          {
            enableHighAccuracy: true, // Keep high accuracy for retries
            timeout: 45000, // Longer timeout for retry
            maximumAge: 20000 // Accept slightly older cached positions
          }
        );
      }, 2000); // Wait 2 seconds before retrying
    }
  };
  
  // Get user-friendly error message for geolocation errors
  const getGeolocationErrorMessage = (error) => {
    let errorMessage = 'Error getting your location.';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location services for this site.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information is unavailable. Please try again later.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out. Please try again.';
        break;
      default:
        errorMessage = `Location error: ${error.message}`;
    }
    
    return errorMessage;
  };
  
  // Stop tracking the user's location
  const stopLocationTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGettingLocation(false);
    setGpsReadingsBuffer([]); // Clear any buffered readings
  };
  
  // Toggle location sharing on/off
  const toggleLocationSharing = () => {
    const newState = !sharingLocation;
    setSharingLocation(newState);
    
    if (newState) {
      startLocationTracking();
    } else {
      stopLocationTracking();
      // Note: No need to notify server about stopping location sharing
      // The server will naturally stop receiving updates
    }
  };
  
  // Update user's location on the server
  const updateLocationOnServer = async (location) => {
    try {
      const locationData = {
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: location.altitude || 0,
          accuracy: location.accuracy || 0,
          heading: location.heading || 0,
          speed: location.speed || 0
        },
        battery_level: 85, // In a real app, get actual battery level
        connection_type: navigator.connection ? navigator.connection.type : 'unknown'
      };
      
      await api.post('/location/update', locationData);
      // console.log('Location updated successfully on server');
    } catch (error) {
      console.error('Error updating location on server:', error);
    }
  };
  
  // Center the map on a specific location
  const centerMapOnLocation = (location) => {
    console.log('Centering map on location:', location);
    console.log('Map ref exists:', !!mapRef.current);

    if (!mapRef.current) {
      console.error('Map not initialized yet');
      return;
    }

    if (!location || !location.latitude || !location.longitude) {
      console.error('Invalid location data:', location);
      return;
    }

    try {
      console.log('Flying to:', [location.longitude, location.latitude]);
      setIsCentering(true);
      mapRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 16,
        essential: true
      });
      // Light up for 2 seconds then turn off
      setTimeout(() => {
        setIsCentering(false);
      }, 2000);
    } catch (error) {
      console.error('Error centering map:', error);
      setIsCentering(false);
    }
  };
  
  // Toggle satellite mode
  const toggleSatelliteMode = (enabled) => {
    if (mapRef.current) {
      const newStyle = enabled ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/streets-v12';
      mapRef.current.setStyle(newStyle);
      setSatelliteMode(enabled);
    }
  };
  
  // Handle marker click to open location dialog
  // Handle marker click to open location dialog or aggregated member list
  const handleMarkerClick = (location) => {
    console.log('🖱️ PIN CLICKED - Location data:', location);
    console.log('🔍 PIN - user_id:', location?.user_id);
    console.log('🔍 PIN - username:', location?.username);
    console.log('🔍 PIN - first_name:', location?.first_name);
    console.log('🔍 PIN - last_name:', location?.last_name);
    console.log('🔍 PIN - profile_image_url:', location?.profile_image_url);
    console.log('🔍 PIN - currentUser.id:', currentUser?.id);
    
    if (location && location.aggregated) {
      // Build member list for this bucket using user_ids (fallback to locations/members data)
      const ids = location.user_ids || [];
      const bucketMembers = ids.map(id => {
        const member = members.find(m => String(m.user_id) === String(id));
        const loc = locations.find(l => String(l.user_id) === String(id));
        return {
          user_id: id,
          username: member ? member.username : (loc ? loc.username : id),
          first_name: member ? member.first_name : (loc ? loc.first_name : null),
          profile_image_url: member ? member.profile_image_url : null,
          coordinates: loc ? loc.coordinates : null,
          timestamp: loc ? loc.timestamp : null
        };
      });
      setAggregatedBucketMembers(bucketMembers);
      setOpenAggregatedDialog(true);
      return;
    }

    setSelectedLocation(location);
    setOpenLocationDialog(true);
  };
  
  // Handle member click in the members list
  const handleMemberClick = useCallback((member) => {
    // Find the member's location data
    const memberLocation = locations.find(loc => loc.user_id === member.user_id);
    if (memberLocation) {
      setSelectedLocation(memberLocation);
      setOpenLocationDialog(true);
    }
  }, [locations]);
  
  // Create center marker for place selection
  const createCenterMarker = () => {
    if (!mapRef.current || centerMarkerRef.current) return;
    
    // Create the center marker element
    const centerElement = document.createElement('div');
    centerElement.style.width = '24px';
    centerElement.style.height = '24px';
    centerElement.style.borderRadius = '50%';
  centerElement.style.backgroundColor = PLACE_PIN_COLOR;
    centerElement.style.border = '3px solid white';
    centerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    centerElement.style.position = 'relative';
    
    // Add a crosshair or target symbol
    centerElement.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 12px; font-weight: bold;">+</div>';
    
    // Create marker positioned at map center
    const center = mapRef.current.getCenter();
    centerMarkerRef.current = new mapboxgl.Marker(centerElement, {
      anchor: 'bottom' // Match the place marker anchor
    })
      .setLngLat([center.lng, center.lat])
      .addTo(mapRef.current);
    
    // Update marker position when map moves
    const updateCenterMarker = () => {
      if (centerMarkerRef.current && mapRef.current) {
        const newCenter = mapRef.current.getCenter();
        centerMarkerRef.current.setLngLat([newCenter.lng, newCenter.lat]);
      }
    };
    
    mapRef.current.on('move', updateCenterMarker);
    
    // Store the update function for cleanup
    centerMarkerRef.current.updateFunction = updateCenterMarker;
  };
  
  // Remove center marker
  const removeCenterMarker = () => {
    if (centerMarkerRef.current) {
      if (centerMarkerRef.current.updateFunction && mapRef.current) {
        mapRef.current.off('move', centerMarkerRef.current.updateFunction);
      }
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }
  };

  // Create a faint hover ring that follows the cursor for place selection (non-overlay mode)
  const createHoverRing = () => {
    if (hoverRingRef.current || !mapRef.current) return;
    const ring = document.createElement('div');
    ring.style.position = 'absolute';
    ring.style.width = '28px';
    ring.style.height = '28px';
    ring.style.borderRadius = '50%';
  ring.style.border = `2px solid ${PLACE_PIN_COLOR}99`;
  ring.style.background = `${PLACE_PIN_COLOR}16`;
    ring.style.pointerEvents = 'none';
    ring.style.transform = 'translate(-50%, -50%)';
    ring.style.zIndex = 2000;
    // attach to map container
    try {
      const canvasContainer = mapRef.current.getContainer();
      canvasContainer.appendChild(ring);
      hoverRingRef.current = ring;
    } catch (err) {
      console.warn('Could not create hover ring:', err);
    }
  };

  const removeHoverRing = () => {
    try {
      if (hoverRingRef.current && mapRef.current) {
        const canvasContainer = mapRef.current.getContainer();
        if (canvasContainer.contains(hoverRingRef.current)) canvasContainer.removeChild(hoverRingRef.current);
      }
      // Reset cursor on the map canvas if we've changed it
      try {
        if (mapRef.current && mapRef.current.getCanvas) {
          const canvas = mapRef.current.getCanvas();
          if (canvas) canvas.style.cursor = '';
        }
      } catch (err) {
        // ignore
      }
      // Remove any mousemove handler we attached
      try { window.removeEventListener('mousemove', selectionMouseMoveRef.current); } catch (e) {}
    } catch (err) {
      // ignore
    }
    hoverRingRef.current = null;
    selectionMouseMoveRef.current = null;
  };
  
  // Toggle place selection mode
  const togglePlaceSelectionMode = () => {
    const newMode = !placeSelectionMode;
    setPlaceSelectionMode(newMode);

    // Toggle map cursor and HUD overlay behavior
    try {
      if (mapRef.current) {
        const canvas = mapRef.current.getCanvas();
        if (newMode) {
          // Entering selection mode
          if (overlayCreateMode) {
            // Show the centered HUD dot
            createCenterMarker();
            // Default cursor while HUD is shown
            canvas.style.cursor = '';
          } else {
            // No HUD: let user click any map point — show pointer to indicate actionable click
            createHoverRing();
            canvas.style.cursor = 'pointer';

            // Add mousemove handler to update ring position
            selectionMouseMoveRef.current = (e) => {
              try {
                const rect = mapRef.current.getContainer().getBoundingClientRect();
                if (hoverRingRef.current) {
                  hoverRingRef.current.style.left = `${e.clientX - rect.left}px`;
                  hoverRingRef.current.style.top = `${e.clientY - rect.top}px`;
                }
              } catch (err) {
                // ignore
              }
            };
            window.addEventListener('mousemove', selectionMouseMoveRef.current);
          }
        } else {
          // Exiting selection mode
          if (overlayCreateMode && mapRef.current && centerMarkerRef.current) {
            const center = mapRef.current.getCenter();
            createPlaceAtLocation(center.lat, center.lng);
          }

          // Remove any hud marker and hover ring and restore cursor
          removeCenterMarker();
          removeHoverRing();
          try { window.removeEventListener('mousemove', selectionMouseMoveRef.current); } catch (e) {}
          canvas.style.cursor = '';
        }
      }
    } catch (err) {
      console.warn('Error toggling place selection mode UI:', err);
    }
  };
  
  // Create a place at the specified location
  const createPlaceAtLocation = async (lat, lng, poi = null) => {
    // Open the create-place dialog with given coordinates
    setCreatePlaceCoords({ latitude: lat, longitude: lng });
    setCreatePlaceFeature(poi ? poi.raw : null);
    const suggestedName = poi && (poi.name || poi.address) ? (poi.name || poi.address) : 'New Place';
    setCreatePlaceName(suggestedName);
    setCreatePlaceAddress(poi && poi.address ? poi.address : '');
    setOpenCreatePlaceDialog(true);
  };

  const createPlaceConfirmed = async () => {
    if (!createPlaceCoords) return;
    setIsCreatingPlace(true);
    try {
      const placeData = {
        name: (createPlaceName || 'New Place').trim(),
        latitude: createPlaceCoords.latitude,
        longitude: createPlaceCoords.longitude
      };

      const response = await api.post(`/groups/${groupId}/places`, placeData);
      if (response.data && response.data.success) {
        const newPlace = {
          user_id: `place_${response.data.place._id}`,
          username: response.data.place.name,
          coordinates: {
            latitude: response.data.place.coordinates.latitude,
            longitude: response.data.place.coordinates.longitude
          },
          timestamp: response.data.place.createdAt,
          battery_level: null,
          place: true,
          raw: response.data.place
        };

        setPlaces(prevPlaces => [...prevPlaces, newPlace]);
  updateMapMarkers([...locations, newPlace], true);
        setShowPlaces(true);
        setOpenCreatePlaceDialog(false);
        showNotification(`Place "${placeData.name}" created successfully!`, 'success');
      } else {
        throw new Error(response.data && response.data.message ? response.data.message : 'Failed to create place');
      }
    } catch (error) {
      console.error('Error creating place:', error);
      showNotification('Failed to create place. Please try again.', 'error');
    } finally {
      setIsCreatingPlace(false);
      setCreatePlaceCoords(null);
    }
  };
  
  // Initiate delete flow (show confirmation)
  const confirmDeletePlace = (placeId) => {
    setDeleteTargetId(placeId);
    setOpenDeleteConfirm(true);
  };

  const cancelDeletePlace = () => {
    setOpenDeleteConfirm(false);
    setDeleteTargetId(null);
  };

  const deletePlace = async (placeId) => {
    setIsDeleting(true);
    try {
      // backend route expects /places/:placeId (no group prefix)
      const response = await api.delete(`/places/${placeId}`);

      // handle a few possible success shapes (data.success, 200/204, or message)
      const success = (response && (
        (response.data && response.data.success === true) ||
        response.status === 200 ||
        response.status === 204 ||
        (response.data && typeof response.data.message === 'string' && response.data.message.toLowerCase().includes('success'))
      ));

      if (success) {
        console.log('Place deleted successfully:', placeId);

        // Remove the place from local state
        setPlaces(prevPlaces => 
          prevPlaces.filter(place => !(place.raw && place.raw._id === placeId))
        );

        // Close dialogs
        setOpenLocationDialog(false);
        setOpenDeleteConfirm(false);

        // Show success message
        showNotification('Place deleted successfully!', 'success');
      } else {
        throw new Error(response.data && response.data.message ? response.data.message : 'Failed to delete place');
      }
    } catch (error) {
      console.error('Error deleting place:', error);
      showNotification('Failed to delete place. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  // Rename a place
  const renamePlace = async (placeId, newName) => {
    if (!newName || newName.trim() === '') return;
    setIsRenaming(true);
    try {
      const response = await api.put(`/places/${placeId}`, { name: newName.trim() });

      // Accept common success shapes
      const success = response && (response.data && response.data.success === true || response.status === 200);
      if (success) {
        // Update local places and selectedLocation
        setPlaces(prevPlaces => prevPlaces.map(place =>
          place.raw && place.raw._id === placeId ? { ...place, username: newName.trim(), raw: { ...place.raw, name: newName.trim() } } : place
        ));

        if (selectedLocation && selectedLocation.place && selectedLocation.raw && selectedLocation.raw._id === placeId) {
          setSelectedLocation(prev => ({ ...prev, username: newName.trim(), raw: { ...prev.raw, name: newName.trim() } }));
        }

        showNotification('Place renamed', 'success');
        setIsRenaming(false);
        setIsRenaming(false);
        setRenameText('');
      } else {
        throw new Error(response.data && response.data.message ? response.data.message : 'Failed to rename place');
      }
    } catch (error) {
      console.error('Error renaming place:', error);
      showNotification('Failed to rename place. Please try again.', 'error');
      setIsRenaming(false);
    }
  };
  
  // Enter dragging mode for a place
  const enterPlaceDraggingMode = (placeId) => {
    setDraggingPlaceId(placeId);
    setOpenLocationDialog(false);
    // Disable map interactions
    if (mapRef.current) {
      mapRef.current.dragPan.disable();
      mapRef.current.scrollZoom.disable();
      mapRef.current.doubleClickZoom.disable();
    }
  };

  // Exit dragging mode
  const exitPlaceDraggingMode = () => {
    setDraggingPlaceId(null);
    // Re-enable map interactions
    if (mapRef.current) {
      mapRef.current.dragPan.enable();
      mapRef.current.scrollZoom.enable();
      mapRef.current.doubleClickZoom.enable();
    }
  };

  // Reset dragging mode on unmount
  useEffect(() => {
    return () => {
      if (draggingPlaceId) {
        exitPlaceDraggingMode();
      }
    };
  }, [draggingPlaceId]);

  // Listen for Escape key to cancel place selection mode
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && placeSelectionMode) {
        setPlaceSelectionMode(false);
        try {
          if (mapRef.current) {
            const canvas = mapRef.current.getCanvas();
            canvas.style.cursor = '';
          }
        } catch (err) {}
        removeCenterMarker();
        removeHoverRing();
        try { window.removeEventListener('mousemove', selectionMouseMoveRef.current); } catch (err) {}
        showNotification('Place selection canceled', 'info');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placeSelectionMode]);

  // Update markers when dragging mode changes
  useEffect(() => {
    if (mapRef.current && (locations.length > 0 || (showPlaces && places.length > 0) || userLocation)) {
      // Include current user location
      const currentUserLoc = userLocation ? [{
        user_id: user?.user_id || user?.id || currentUser?.id || 'current-user',
        username: user?.username || currentUser?.username || 'CurrentUser',
        first_name: user?.first_name || currentUser?.first_name || null,
        last_name: user?.last_name || currentUser?.last_name || null,
        profile_image_url: user?.profile_image_url || currentUser?.profile_image_url || null,
        social_accounts: user?.social_accounts || currentUser?.social_accounts || null,
        gender: user?.gender || currentUser?.gender || null,
        coordinates: userLocation,
        timestamp: new Date().toISOString(),
        battery_level: 85
      }] : [];
      console.log('🖼️ [draggingPlaceId-useEffect] currentUserLoc[0]?.profile_image_url:', currentUserLoc[0]?.profile_image_url);
      
      const allLocations = showPlaces 
        ? [...currentUserLoc, ...locations, ...places] 
        : [...currentUserLoc, ...locations];
      console.log('📍 [draggingPlaceId-useEffect-L2382] Updating markers on drag change:', allLocations.length);
      updateMapMarkers(allLocations);
    }
  }, [draggingPlaceId, locations, places, showPlaces, userLocation, currentUser]);

  // Internal (immediate) marker update implementation
  const doUpdateMapMarkers = (locationData) => {
    // If the map isn't initialized yet, queue the locations for later
    if (!mapRef.current || !mapboxgl) {
      pendingLocationsRef.current = locationData;
      return;
    }

    // If we have too many locations, enable cluster-layer rendering to improve perf
    if (process.env.NODE_ENV !== 'production') console.debug('[doUpdateMapMarkers] incoming locationData length:', Array.isArray(locationData) ? locationData.length : 0);
    try {
      const shouldCluster = Array.isArray(locationData) && locationData.length >= clusterThreshold;
      if (shouldCluster && !clusterModeRef.current) {
        // Switch to cluster mode: remove existing DOM markers and use GeoJSON source + layers
        if (process.env.NODE_ENV !== 'production') console.debug('[doUpdateMapMarkers] switching to cluster mode - clearing', Object.keys(markersRef.current).length, 'markers');
        Object.keys(markersRef.current).forEach(k => {
          try { markersRef.current[k]?.remove(); } catch (e) {}
          delete markersRef.current[k];
        });
        createClusterLayers(locationData);
        clusterModeRef.current = true;
        return;
      } else if (!shouldCluster && clusterModeRef.current) {
        // Turn off cluster mode and remove the layers so we can use DOM markers again
        removeClusterLayers();
        clusterModeRef.current = false;
        // continue to fall through and render markers normally
      }
      if (clusterModeRef.current) {
        // Update the cluster source data
        try {
          const src = mapRef.current.getSource(clusterSourceIdRef.current);
          if (src) {
            const features = locationData.map(loc => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [loc.coordinates.longitude, loc.coordinates.latitude] },
              properties: { user_id: loc.user_id, username: loc.username, place: !!loc.place }
            }));
            if (process.env.NODE_ENV !== 'production') console.debug('[doUpdateMapMarkers] updating cluster source with', features.length, 'features');
            src.setData({ type: 'FeatureCollection', features });
          }
        } catch (e) {
          console.warn('Failed to update cluster source data', e);
        }
        return;
      }
    } catch (e) {
      // ignore cluster errors and continue with marker rendering
      console.warn('Cluster switching error', e);
    }

    const newMarkerKeys = new Set();

    // Prefer grouping markers by screen-space overlap so aggregation triggers when markers visually touch
    const buckets = {};
    const tryScreenGrouping = () => {
      if (!mapRef.current || !mapRef.current.project) return false;
      try {
  const threshold = screenThreshold; // use persisted/tunable value
        const projected = [];
        for (let i = 0; i < locationData.length; i++) {
          const loc = locationData[i];
          if (!loc || !loc.coordinates) continue;
          const p = mapRef.current.project([loc.coordinates.longitude, loc.coordinates.latitude]);
          projected.push({ loc, x: p.x, y: p.y });
        }

        const clusters = [];
        projected.forEach(item => {
          let assigned = false;
          for (let c of clusters) {
            const dx = item.x - c.cx;
            const dy = item.y - c.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= threshold) {
              c.items.push(item.loc);
              const n = c.items.length;
              c.cx = (c.cx * (n - 1) + item.x) / n;
              c.cy = (c.cy * (n - 1) + item.y) / n;
              assigned = true;
              break;
            }
          }
          if (!assigned) {
            clusters.push({ cx: item.x, cy: item.y, items: [item.loc] });
          }
        });

        clusters.forEach(c => {
          if (!c.items || c.items.length === 0) return;
          if (c.items.length === 1) {
            const single = c.items[0];
            const key = `${single.coordinates.latitude}_${single.coordinates.longitude}_${single.user_id}`;
            buckets[key] = { coords: single.coordinates, items: [single] };
          } else {
            let sumLat = 0, sumLng = 0;
            c.items.forEach(it => { sumLat += it.coordinates.latitude; sumLng += it.coordinates.longitude; });
            const avg = { latitude: sumLat / c.items.length, longitude: sumLng / c.items.length };
            const key = `agg_${Math.round(avg.latitude * 1e6)}_${Math.round(avg.longitude * 1e6)}_${c.items.length}`;
            buckets[key] = { coords: avg, items: c.items.slice() };
          }
        });
        return true;
      } catch (e) {
        return false;
      }
    };

    const usedScreen = tryScreenGrouping();
    if (!usedScreen) {
      // Fallback to geographic bucket precision when projection not available
      const bucketCoords = (lat, lng, precision = bucketPrecision) => {
        const factor = Math.pow(10, precision);
        const rLat = Math.round(lat * factor) / factor;
        const rLng = Math.round(lng * factor) / factor;
        return `${rLat}_${rLng}`;
      };

      const computePrecisionFromZoom = (zoom) => {
        if (typeof zoom !== 'number' || isNaN(zoom)) return bucketPrecision;
        if (zoom < 8) return Math.max(2, bucketPrecision - 2);
        if (zoom < 11) return Math.max(3, bucketPrecision - 1);
        if (zoom < 13) return bucketPrecision;
        if (zoom < 15) return Math.min(6, bucketPrecision + 1);
        return Math.min(7, bucketPrecision + 2);
      };

      let adaptivePrecision = bucketPrecision;
      try {
        if (mapRef.current && mapRef.current.getZoom) {
          const z = mapRef.current.getZoom();
          adaptivePrecision = computePrecisionFromZoom(z);
        }
      } catch (e) {}

      locationData.forEach(loc => {
        if (!loc || !loc.coordinates) return;
        const key = bucketCoords(loc.coordinates.latitude, loc.coordinates.longitude, adaptivePrecision);
        buckets[key] = buckets[key] || { coords: loc.coordinates, items: [] };
        buckets[key].items.push(loc);
      });
    }

    // Convert buckets back to a list of renderable items (either single loc or aggregate)
    const renderList = Object.keys(buckets).map(k => {
      const b = buckets[k];
      if (b.items.length === 1) return b.items[0];
      return {
        aggregated: true,
        count: b.items.length,
        user_ids: b.items.map(i => i.user_id),
        username: `${b.items.length} people`,
        coordinates: b.coords,
        timestamp: new Date().toISOString()
      };
    });

  // Update existing markers or create new ones
  renderList.forEach((location, idx) => {
      if (!location.coordinates) {
        return;
      }
      
  const { latitude, longitude } = location.coordinates;
  const markerKey = location.aggregated ? `agg-${Math.round(latitude*1e6)}-${Math.round(longitude*1e6)}-${location.count}` : (location.place ? `place-${location.raw._id}` : location.user_id);

      newMarkerKeys.add(markerKey);

  let marker = markersRef.current[markerKey];

  const shouldBeDraggable = location.place && location.raw && location.raw._id === draggingPlaceId;

      // For places, always recreate markers to ensure proper positioning
      if (marker && location.place) {
        marker.remove();
        marker = null;
      }

      if (marker) {
        // If it should be draggable but existing marker isn't, recreate
        const existingIsDraggable = marker.getElement && marker.getElement().draggable;
        if (shouldBeDraggable && !existingIsDraggable) {
          marker.remove();
          marker = null;
        }
      }

      if (marker && !shouldBeDraggable) {
        // Reuse the existing marker element: update position and visual state instead of recreating
        try {
          marker.setLngLat([longitude, latitude]);
          const el = marker.getElement && marker.getElement();
          if (el) {
            // Store the latest location data on the element for the click handler
            el._locationData = location;
            
            const circle = el.querySelector('div');
            if (circle) {
              const desiredColor = location.place ? PLACE_PIN_COLOR : MEMBER_PIN_COLOR;
              if (circle.style.backgroundColor !== desiredColor) circle.style.backgroundColor = desiredColor;
              // If this is a placeholder for a missing live location, render subtly
              if (location.location_missing) {
                const firstInitial = location.username ? location.username.charAt(0).toUpperCase() : '?';
                circle.style.opacity = '0.6';
                circle.style.borderStyle = 'dashed';
                // Remove any existing avatar image
                const existingImg = circle.querySelector('img');
                if (existingImg) existingImg.remove();
                if (circle.textContent !== firstInitial) circle.textContent = firstInitial;
              } else if (location.aggregated) {
                // For aggregated markers, show the count
                const count = String(location.count);
                // Remove any existing avatar image
                const existingImg = circle.querySelector('img');
                if (existingImg) existingImg.remove();
                if (circle.textContent !== count) circle.textContent = count;
                // Auto-size the circle based on count length
                const len = count.length;
                const size = len <= 2 ? 40 : (len === 3 ? 46 : 52);
                circle.style.width = `${size}px`;
                circle.style.height = `${size}px`;
                circle.style.fontSize = len <= 2 ? '16px' : (len === 3 ? '14px' : '12px');
              } else if (!location.place) {
                // For member markers, try to use avatar image
                const avatarSrc = getAvatarContent(location);
                console.log('🔄 PIN Avatar Update Debug:', {
                  username: location.username,
                  has_profile_image_url: !!location.profile_image_url,
                  profile_image_url: location.profile_image_url,
                  avatarSrc: avatarSrc
                });
                const existingImg = circle.querySelector('img');
                if (avatarSrc) {
                  if (existingImg && existingImg.src !== avatarSrc) {
                    console.log('🔄 Updating existing img src to:', avatarSrc);
                    existingImg.src = avatarSrc;
                  } else if (!existingImg) {
                    console.log('➕ Creating new avatar img:', avatarSrc);
                    circle.textContent = '';
                    const avatarImg = document.createElement('img');
                    avatarImg.src = avatarSrc;
                    avatarImg.style.width = '100%';
                    avatarImg.style.height = '100%';
                    avatarImg.style.objectFit = 'cover';
                    avatarImg.style.borderRadius = '50%';
                    avatarImg.onerror = (err) => {
                      console.error('❌ PIN Avatar update failed:', avatarSrc, err);
                      avatarImg.remove();
                      circle.textContent = getAvatarFallback(location);
                    };
                    avatarImg.onload = () => {
                      console.log('✅ PIN Avatar update loaded:', avatarSrc);
                    };
                    circle.appendChild(avatarImg);
                  }
                } else if (!existingImg) {
                  // Only show initials if there's no existing image AND no avatarSrc
                  // This prevents replacing images with initials during re-renders
                  console.log('⚠️ No avatarSrc and no existing image, using initials');
                  const fallbackText = getAvatarFallback(location);
                  if (circle.textContent !== fallbackText) circle.textContent = fallbackText;
                }
                // If existingImg exists but no avatarSrc, preserve the existing image
              } else {
                // For place markers
                const firstInitial = location.place ? '📍' : (location.username ? location.username.charAt(0).toUpperCase() : '?');
                const existingImg = circle.querySelector('img');
                if (existingImg) existingImg.remove();
                if (circle.textContent !== firstInitial) circle.textContent = firstInitial;
              }
            }
            // update title
            const displayName = location.place ? location.username : formatDisplayName(location.username, location.first_name, location.last_name);
            const lastUpdate = location.timestamp ? new Date(location.timestamp).toLocaleString() : null;
            if (location.location_missing) {
              el.title = lastUpdate ? `${displayName}\nLast known: ${lastUpdate}` : `${displayName}\nLocation not shared`;
            } else {
              el.title = `${displayName}\nLast updated: ${lastUpdate}`;
            }
          }
        } catch (e) {
          // fallback to recreating marker if reuse fails
          try { marker.remove(); } catch (err) {}
          marker = null;
        }
      }

      if (!marker) {
        // Create new marker - simple anchored pin or aggregated badge
        const markerEl = document.createElement('div');
        markerEl.style.display = 'flex';
        markerEl.style.flexDirection = 'column';
        markerEl.style.alignItems = 'center';
        markerEl.style.cursor = 'pointer';

        // Circle part - use avatar image for members, or circle for places/aggregated
        const circleEl = document.createElement('div');
        circleEl.style.width = '36px';
        circleEl.style.height = '36px';
        circleEl.style.borderRadius = '50%';
        circleEl.style.backgroundColor = location.place ? PLACE_PIN_COLOR : MEMBER_PIN_COLOR;
        circleEl.style.border = '2px solid white';
        circleEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        circleEl.style.display = 'flex';
        circleEl.style.alignItems = 'center';
        circleEl.style.justifyContent = 'center';
        circleEl.style.color = 'white';
        circleEl.style.fontSize = '14px';
        circleEl.style.fontWeight = 'bold';
        circleEl.style.overflow = 'hidden';
        if (location.location_missing) {
          circleEl.style.opacity = '0.6';
          circleEl.style.borderStyle = 'dashed';
        }

        // Add content: either avatar image, first initial, or aggregated count
        if (location.aggregated) {
          circleEl.textContent = String(location.count);
          // auto-size the circle based on count length
          const len = String(location.count).length;
          const size = len <= 2 ? 40 : (len === 3 ? 46 : 52);
          circleEl.style.width = `${size}px`;
          circleEl.style.height = `${size}px`;
          circleEl.style.borderRadius = '50%';
          circleEl.style.fontSize = len <= 2 ? '16px' : (len === 3 ? '14px' : '12px');
        } else if (!location.place) {
          // For member markers, try to use avatar image
          const avatarSrc = getAvatarContent(location);
          console.log('🖼️ PIN Avatar Debug:', {
            username: location.username,
            has_profile_image_url: !!location.profile_image_url,
            profile_image_url: location.profile_image_url,
            has_social_accounts: !!location.social_accounts,
            avatarSrc: avatarSrc,
            fallback: getAvatarFallback(location)
          });
          if (avatarSrc) {
            const avatarImg = document.createElement('img');
            avatarImg.src = avatarSrc;
            avatarImg.style.width = '100%';
            avatarImg.style.height = '100%';
            avatarImg.style.objectFit = 'cover';
            avatarImg.style.borderRadius = '50%';
            // Fallback to initials if image fails to load
            avatarImg.onerror = (err) => {
              console.error('❌ PIN Avatar image failed to load:', avatarSrc, err);
              avatarImg.remove();
              circleEl.textContent = getAvatarFallback(location);
            };
            avatarImg.onload = () => {
              console.log('✅ PIN Avatar image loaded successfully:', avatarSrc);
            };
            circleEl.appendChild(avatarImg);
          } else {
            // No avatar available, use fallback initials
            console.log('⚠️ No avatarSrc, using fallback initials');
            circleEl.textContent = getAvatarFallback(location);
          }
        } else {
          // For placeholders where member hasn't shared location, make them visually subtle
          if (location.location_missing) {
            const firstInitial = location.username ? location.username.charAt(0).toUpperCase() : '?';
            circleEl.textContent = firstInitial;
          } else {
            const firstInitial = location.place ? '📍' : (location.username ? location.username.charAt(0).toUpperCase() : '?');
            circleEl.textContent = firstInitial;
          }
        }

        // Speaking indicator ring (for audio participants)
        if (!location.place && !location.aggregated) {
          const isSpeakingInAudio = audioParticipants.some(p => 
            String(p.userId) === String(location.user_id) && p.isSpeaking
          );
          
          if (isSpeakingInAudio) {
            const speakingRing = document.createElement('div');
            speakingRing.style.position = 'absolute';
            speakingRing.style.top = '-6px';
            speakingRing.style.left = '-6px';
            speakingRing.style.width = '48px';
            speakingRing.style.height = '48px';
            speakingRing.style.borderRadius = '50%';
            speakingRing.style.border = '3px solid #4caf50';
            speakingRing.style.animation = 'speakingPulse 1s infinite';
            speakingRing.style.pointerEvents = 'none';
            circleEl.style.position = 'relative';
            circleEl.appendChild(speakingRing);
            
            // Add animation keyframes
            if (!document.getElementById('speaking-pulse-animation')) {
              const style = document.createElement('style');
              style.id = 'speaking-pulse-animation';
              style.textContent = `
                @keyframes speakingPulse {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.1); opacity: 0.7; }
                }
              `;
              document.head.appendChild(style);
            }
          }
        }

        // Spike part
        const spikeEl = document.createElement('div');
  spikeEl.style.width = '16px';
  spikeEl.style.height = '12px';
  spikeEl.style.backgroundColor = location.place ? PLACE_PIN_COLOR : MEMBER_PIN_COLOR;
  spikeEl.style.clipPath = 'polygon(50% 100%, 0% 0%, 100% 0%)';
  if (location.location_missing) spikeEl.style.opacity = '0.6';

        markerEl.appendChild(circleEl);
        markerEl.appendChild(spikeEl);

        // Add hover details
        const displayName = location.place ? location.username : formatDisplayName(location.username, location.first_name, location.last_name);
        const lastUpdate = location.timestamp ? new Date(location.timestamp).toLocaleString() : null;
        if (location.location_missing && !lastUpdate) {
          markerEl.title = `${displayName}\nLocation not shared`;
        } else if (location.location_missing && lastUpdate) {
          markerEl.title = `${displayName}\nLast known: ${lastUpdate}`;
        } else {
          markerEl.title = `${displayName}\nLast updated: ${lastUpdate}`;
        }

        // Create and add the marker
        marker = new mapboxgl.Marker(markerEl, {
          anchor: 'bottom',
          draggable: shouldBeDraggable
        })
          .setLngLat([longitude, latitude])
          .addTo(mapRef.current);

        // Add dragend handler for all place markers (will check if dragging inside)
        if (location.place && location.raw) {
          marker.on('dragend', async () => {
            // Only process if this place is currently being dragged
            if (draggingPlaceId === location.raw._id) {
              const lngLat = marker.getLngLat();
              try {
                const response = await api.put(`/places/${location.raw._id}`, {
                  latitude: lngLat.lat,
                  longitude: lngLat.lng
                });
                
                if (response.data.success) {
                  // Update local places state
                  setPlaces(prevPlaces => 
                    prevPlaces.map(place => 
                      place.raw && place.raw._id === location.raw._id 
                        ? { 
                            ...place, 
                            coordinates: { latitude: lngLat.lat, longitude: lngLat.lng },
                            raw: { ...place.raw, coordinates: { latitude: lngLat.lat, longitude: lngLat.lng } }
                          }
                        : place
                    )
                  );
                  exitPlaceDraggingMode();
                } else {
                  throw new Error(response.data.message || 'Failed to update place');
                }
              } catch (error) {
                console.error('Error updating place coordinates:', error);
                        showNotification('Failed to update place location. Please try again.', 'error');
                exitPlaceDraggingMode();
              }
            }
          });
        }

        // Add click handler only for non-draggable markers
        if (!shouldBeDraggable) {
          // Store location data on the element
          markerEl._locationData = location;
          markerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            // Use stored location data to ensure we have the latest
            const locationData = e.currentTarget._locationData || location;
            handleMarkerClick(locationData);
          });
        }
        
        // Store the marker
        markersRef.current[markerKey] = marker;
      }
    });

    // Remove markers that are no longer in the data
    if (process.env.NODE_ENV !== 'production') console.debug('[doUpdateMapMarkers] existing markers before cleanup:', Object.keys(markersRef.current).length, 'newMarkerKeys:', newMarkerKeys.size);
    Object.keys(markersRef.current).forEach(markerKey => {
      if (!newMarkerKeys.has(markerKey)) {
        const marker = markersRef.current[markerKey];
        if (marker && typeof marker.remove === 'function') {
          marker.remove();
        }
        delete markersRef.current[markerKey];
      }
    });
    if (process.env.NODE_ENV !== 'production') console.debug('[doUpdateMapMarkers] markers after cleanup:', Object.keys(markersRef.current).length);
  };

  // Public wrapper: debounced update to reduce DOM thrash. Call with immediate=true to force instant update.
  const updateMapMarkers = (locationData, immediate = false) => {
    console.log('🎯 updateMapMarkers called with', locationData?.length || 0, 'locations, immediate:', immediate);
    
    try {
      if (updateMarkerDebounceRef.current) {
        clearTimeout(updateMarkerDebounceRef.current);
        updateMarkerDebounceRef.current = null;
      }
    } catch (e) {}

    if (immediate) {
      doUpdateMapMarkers(locationData);
      return;
    }

    // Debounce rapid calls (150ms)
    updateMarkerDebounceRef.current = setTimeout(() => {
      doUpdateMapMarkers(locationData);
      updateMarkerDebounceRef.current = null;
    }, 150);
  };
  
  // Update map markers including current user location
  const updateMapMarkersWithUserLocation = (userLocationData) => {
    // Create current user location object
    const currentUserLocation = {
      user_id: user?.user_id || user?.id || currentUser?.id || 'current-user',
      username: user?.username || currentUser?.username || 'CurrentUser',
      first_name: user?.first_name || currentUser?.first_name || null,
      last_name: user?.last_name || currentUser?.last_name || null,
      profile_image_url: user?.profile_image_url || currentUser?.profile_image_url || null,
      social_accounts: user?.social_accounts || currentUser?.social_accounts || null,
      gender: user?.gender || currentUser?.gender || null,
      coordinates: userLocationData,
      timestamp: new Date().toISOString(),
      battery_level: 85 // Default battery level
    };
    console.log('🖼️ [updateMapMarkersWithUserLocation] currentUserLocation.profile_image_url:', currentUserLocation.profile_image_url);
    
    // Filter out any existing current user location from API data to avoid duplicates
    // Check both user_id AND username to catch duplicates from WebSocket broadcasts
    const filteredLocations = locations.filter(loc => 
      loc.user_id !== (currentUser?.id || 'current-user') && 
      loc.username !== currentUser?.username
    );
    
    // Combine current user location with existing member locations and places if shown
    const allLocations = showPlaces 
      ? [currentUserLocation, ...filteredLocations, ...places]
      : [currentUserLocation, ...filteredLocations];
    
    // Update markers with combined locations (but hide during place selection mode)
    if (!placeSelectionMode) {
      updateMapMarkers(allLocations, true);
    }
  };
  
  // Check for proximity alerts
  const checkProximityAlerts = (locationData) => {
    if (!userLocation) return;
    
    locationData.forEach(location => {
      // Skip current user by multiple checks to prevent false alerts:
      // 1. By user_id if available
      // 2. By username if available  
      // 3. By exact coordinate match (same location as userLocation)
      const isSameLocation = 
        location.coordinates?.latitude === userLocation.latitude &&
        location.coordinates?.longitude === userLocation.longitude;
      
      if (location.user_id === (currentUser?.id || 'current-user') || 
          location.username === currentUser?.username ||
          isSameLocation ||
          !location.coordinates) return;
      
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        location.coordinates.latitude,
        location.coordinates.longitude
      );
      
      if (distance <= proximityDistance) {
        // In a real app, show a notification
        console.log(`${location.username} is within ${Math.round(distance)}m of you!`);
      }
    });
  };
  
  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  };
  
  // Format distance for display
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  };
  
  // Toggle UI controls visibility
  const toggleControls = () => {
    setShowControls(!showControls);
  };
  
  // Toggle members list visibility
  const toggleMembersList = () => {
    setShowMembersList(!showMembersList);
  };
  
  // Toggle location info visibility
  const toggleLocationInfo = () => {
    setShowLocationInfo(!showLocationInfo);
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6">
          Loading location tracking...
        </Typography>
      </Box>
    );
  }
  
  // Render component with fullscreen map and overlay UI
  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100vw', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Fullscreen Map Wrapper: keep the actual map container empty and render the loading overlay as a sibling
          Mapbox requires the target container to be empty when creating a map instance. Rendering the spinner
          as a child caused the warning and interactivity problems. */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}
      >
        {/* Empty div for Mapbox to mount into - must have no child nodes */}
        <Box
          ref={mapContainerRef}
          id="mapbox-container"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        />

        {/* Loading overlay is rendered as a sibling, absolutely positioned over the map container */}
        {!mapLoaded && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            zIndex: 1
          }}>
            <CircularProgress size={60} />
            <Typography sx={{ position: 'absolute', top: '60%', color: 'text.secondary', fontSize: '12px' }}>
              Loading map...
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Dragging Mode Indicator */}
      {draggingPlaceId && (
        <Box
          sx={{
            position: 'absolute',
            top: 80,
            left: 16,
            right: 16,
            zIndex: 15,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            p: 2,
            borderRadius: 2,
            boxShadow: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="body1">
            🏁 Drag the pin to reposition the place
          </Typography>
          <Button 
            variant="contained" 
            color="secondary" 
            size="small"
            onClick={exitPlaceDraggingMode}
          >
            Cancel (ESC)
          </Button>
        </Box>
      )}
      
      {/* Top App Bar */}
      <AppBar 
        position="absolute" 
        color="default" 
        elevation={sharingLocation ? 3 : 0}
        sx={{ 
          opacity: controlsOpacity,
          backdropFilter: 'blur(2px)',
          bgcolor: sharingLocation ? 'secondary.main' : 'rgba(0,0,0,0.7)', // Pink/magenta when active
          color: sharingLocation ? '#fff' : 'text.primary',
          transition: 'all 0.3s ease',
          // When the members list is open, hide the top AppBar so it doesn't overlap the drawer
          top: showMembersList ? -64 : (showControls ? 0 : -64),
          zIndex: 10,
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        <Toolbar>
          <IconButton 
            edge="start" 
            sx={{ 
              mr: 2,
              color: sharingLocation ? '#fff' : 'inherit'
            }}
            onClick={() => {
              console.log('🔙 Back button clicked, navigating to /groups/' + groupId);
              navigate(`/groups/${groupId}`);
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Tooltip title={sharingLocation ? "Stop Sharing Location" : "Start Sharing Location"}>
            <IconButton 
              onClick={toggleLocationSharing}
              sx={{
                color: sharingLocation ? '#fff' : 'inherit',
                bgcolor: sharingLocation ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                '&:hover': {
                  bgcolor: sharingLocation ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              {sharingLocation ? <LocationIcon /> : <LocationOffIcon />}
            </IconButton>
          </Tooltip>
          

          <Tooltip title="Settings">
            <IconButton 
              sx={{
                color: sharingLocation ? '#fff' : 'inherit'
              }}
              onClick={() => setOpenSettingsDialog(true)}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={satelliteMode ? "Switch to Streets View" : "Switch to Satellite View"}>
            <IconButton 
              sx={{
                color: sharingLocation ? '#fff' : (satelliteMode ? 'primary.main' : 'inherit')
              }}
              onClick={() => toggleSatelliteMode(!satelliteMode)}
            >
              <SatelliteIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={showPlaces ? "Hide Places" : "Show Places"}>
            <IconButton 
              sx={{
                color: sharingLocation ? '#fff' : (showPlaces ? 'secondary.main' : 'inherit')
              }}
              onClick={() => setShowPlaces(!showPlaces)}
            >
              {showPlaces ? <PlaceOffIcon /> : <PlaceIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      {/* Vertical Group Name Panel */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: showMembersList ? -400 : (showControls ? 64 : 0),
          bottom: 0,
          zIndex: 10,
          opacity: controlsOpacity,
          bgcolor: sharingLocation ? '#e91e63' : 'rgba(0,0,0,0.7)', // Pink/magenta for Location
          backdropFilter: 'blur(2px)',
          padding: '16px 4px',
          display: showMembersList ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
          transition: 'all 0.3s ease',
          boxShadow: sharingLocation ? 2 : 0,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            color: sharingLocation ? '#fff' : 'text.primary',
            fontWeight: 'bold',
            fontStyle: 'italic',
            letterSpacing: '0.1em',
          }}
        >
          {group?.name || 'Location Tracking'}
        </Typography>
      </Box>
      
      {/* Toggle Controls Button */}
      <Tooltip title={showControls ? "Hide Controls" : "Show Controls"}>
        <IconButton
          sx={{
            position: 'absolute',
            top: showControls ? 72 : 16,
            right: 16,
            zIndex: 10,
            display: showMembersList ? 'none' : undefined,
            bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)',
            color: 'purple',
            boxShadow: 2,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
            }
          }}
          onClick={toggleControls}
        >
          {showControls ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Tooltip>
      
      {/* Toggle Members List Button */}
      <Tooltip title={showMembersList ? "Hide Members" : "Show Members"}>
        <IconButton
          sx={{
            position: 'absolute',
            top: showControls ? 72 : 16,
            right: 76,
            zIndex: 10,
            display: showMembersList ? 'none' : undefined,
            bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)',
            color: 'purple',
            boxShadow: 2,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
            }
          }}
          onClick={toggleMembersList}
        >
          <PeopleIcon />
        </IconButton>
      </Tooltip>
      
      {/* Center on My Location Button */}
      <Tooltip title="Center on My Location">
        <IconButton
          sx={{
            position: 'absolute',
            top: showControls ? 72 : 16,
            right: 136,
            zIndex: 10,
            display: showMembersList ? 'none' : undefined,
            bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)',
            color: !userLocation ? 'rgba(128, 128, 128, 0.5)' : 
                   isCentering ? 'success.main' : 
                   isGettingLocation ? 'secondary.main' : 'purple',
            boxShadow: 2,
            cursor: 'pointer',
            animation: (isGettingLocation || (!userLocation && sharingLocation)) ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0.7)' },
              '70%': { boxShadow: '0 0 0 10px rgba(156, 39, 176, 0)' },
              '100%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0)' }
            },
            '&:hover': {
              bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
            }
          }}
          onClick={() => {
            // Always try to center on user's location
            if (userLocation) {
              // If we already have location, center immediately
              centerMapOnLocation(userLocation);
            } else {
              // No location available - start location tracking to get it
              if (!sharingLocation) {
                toggleLocationSharing();
              } else {
                // Already sharing but no location yet - force acquisition
                startLocationTracking();
              }
            }
          }}
        >
          <MyLocationIcon />
        </IconButton>
      </Tooltip>
      
      {/* Place Selection Button */}
          <Tooltip title="Select Location for Place">
        <IconButton
          sx={{
            position: 'absolute',
            top: showControls ? 72 : 16,
            right: 196,
            zIndex: 10,
            display: showMembersList ? 'none' : undefined,
            bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)',
            color: placeSelectionMode ? 'secondary.main' : 'purple',
            boxShadow: 2,
            cursor: 'pointer',
            animation: placeSelectionMode ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0.7)' },
              '70%': { boxShadow: '0 0 0 10px rgba(156, 39, 176, 0)' },
              '100%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0)' }
            },
            '&:hover': {
              bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
            }
          }}
          onClick={() => {
            try {
              if (overlayCreateMode && mapRef.current) {
                const c = mapRef.current.getCenter();
                createPlaceAtLocation(c.lat, c.lng, null);
                // ensure selection mode is off
                setPlaceSelectionMode(false);
              } else {
                togglePlaceSelectionMode();
              }
            } catch (err) {
              console.warn('Could not create place at center:', err);
              togglePlaceSelectionMode();
            }
          }}
        >
          <PlaceIcon />
        </IconButton>
      </Tooltip>
      
      {/* Audio Call Button */}
      <Tooltip title={isInSession ? `Leave Audio Call (${audioParticipants.length + 1} in call)` : "Join Audio Call"}>
        <Badge 
          badgeContent={isInSession ? audioParticipants.length + 1 : 0} 
          color="success"
          sx={{
            position: 'absolute',
            top: showControls ? 72 : 16,
            right: 256,
            zIndex: 10,
            display: showMembersList ? 'none' : undefined,
          }}
        >
          <IconButton
            sx={{
              bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)',
              color: isInSession ? 'error.main' : 'purple',
              boxShadow: 2,
              cursor: 'pointer',
              animation: isInSession ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0.7)' },
                '70%': { boxShadow: '0 0 0 10px rgba(156, 39, 176, 0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0)' }
              },
              '&:hover': {
                bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
              }
            }}
            onClick={isInSession ? leaveSession : joinSession}
          >
            {isInSession ? <PhoneDisabledIcon /> : <PhoneIcon />}
          </IconButton>
        </Badge>
      </Tooltip>

      {/* Mute/Unmute Button (only show when in session) */}
      {isInSession && (
        <Tooltip title={isMuted ? "Unmute Microphone" : "Mute Microphone"}>
          <IconButton
            sx={{
              position: 'absolute',
              top: showControls ? 72 : 16,
              right: isSharingDesktopAudio ? 376 : 316,
              zIndex: 10,
              display: showMembersList ? 'none' : undefined,
              bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)',
              color: isMuted ? 'grey.500' : isSpeaking ? 'success.main' : 'purple',
              boxShadow: 2,
              cursor: 'pointer',
              animation: isSpeaking ? 'speaking 1s infinite' : 'none',
              '@keyframes speaking': {
                '0%, 100%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)' },
                '50%': { boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)' }
              },
              '&:hover': {
                bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
              }
            }}
            onClick={toggleMute}
          >
            {isMuted ? <MicOffIcon /> : <MicIcon />}
          </IconButton>
        </Tooltip>
      )}

      {/* Desktop Audio Share Button (only show when in session) */}
      {isInSession && (
        <Tooltip title={isSharingDesktopAudio ? "Stop Sharing Desktop Audio" : "Share Desktop Audio (Music/Games)"}>
          <IconButton
            sx={{
              position: 'absolute',
              top: showControls ? 72 : 16,
              right: 316,
              zIndex: 10,
              display: showMembersList ? 'none' : undefined,
              bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)',
              color: isSharingDesktopAudio ? 'error.main' : 'purple',
              boxShadow: 2,
              cursor: 'pointer',
              animation: isSharingDesktopAudio ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0.7)' },
                '70%': { boxShadow: '0 0 0 10px rgba(156, 39, 176, 0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0)' }
              },
              '&:hover': {
                bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
              }
            }}
            onClick={async () => {
              if (isSharingDesktopAudio) {
                await stopDesktopAudio();
                setIsSharingDesktopAudio(false);
              } else {
                const success = await shareDesktopAudio();
                if (success) {
                  setIsSharingDesktopAudio(true);
                }
              }
            }}
          >
            {isSharingDesktopAudio ? <StopScreenShareIcon /> : <ScreenShareIcon />}
          </IconButton>
        </Tooltip>
      )}

      {/* Music Player Button */}
      <Tooltip title={showMusicPlayer ? "Hide Music Player" : "Show Music Player"}>
        <Badge 
          badgeContent={isPlaying ? '♪' : null} 
          color="success"
          sx={{
            position: 'absolute',
            top: showControls ? 72 : 16,
            right: isInSession ? (isSharingDesktopAudio ? 436 : 376) : 316,
            zIndex: 10,
            display: showMembersList ? 'none' : undefined,
          }}
        >
          <IconButton
            sx={{
              bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)',
              color: showMusicPlayer ? 'primary.main' : isPlaying ? 'success.main' : 'purple',
              boxShadow: 2,
              cursor: 'pointer',
              animation: isPlaying ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0.7)' },
                '70%': { boxShadow: '0 0 0 10px rgba(156, 39, 176, 0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0)' }
              },
              '&:hover': {
                bgcolor: satelliteMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
              }
            }}
            onClick={() => setShowMusicPlayer(!showMusicPlayer)}
          >
            <MusicNoteIcon />
          </IconButton>
        </Badge>
      </Tooltip>

      {/* Speaking Indicator (only show when speaking) */}
      {isSpeaking && !isMuted && (
        <Box
          sx={{
            position: 'absolute',
            top: showControls ? 132 : 76,
            right: 16,
            zIndex: 10,
            display: showMembersList ? 'none' : 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'success.main',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 2,
            boxShadow: 3,
            animation: 'pulse 1s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.7 }
            }
          }}
        >
          <MicIcon fontSize="small" />
          <Typography variant="caption">Speaking</Typography>
          <Box
            sx={{
              width: 40,
              height: 3,
              bgcolor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                width: `${audioLevel}%`,
                height: '100%',
                bgcolor: 'white',
                transition: 'width 0.1s'
              }}
            />
          </Box>
        </Box>
      )}

      {/* Audio Error Alert */}
      {audioError && (
        <Alert
          severity="error"
          sx={{
            position: 'absolute',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            minWidth: 300
          }}
        >
          {audioError}
        </Alert>
      )}
      
      {/* Drop Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 10 }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {/* Current Location Info */}
      <Collapse in={showLocationInfo && showControls && sharingLocation}>
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            zIndex: 10,
            p: 2,
            opacity: controlsOpacity,
            backdropFilter: 'blur(2px)',
            bgcolor: 'rgba(0,0,0,0.8)',
            color: 'text.primary',
            borderRadius: 2,
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1">Current Location</Typography>
            <IconButton size="small" onClick={toggleLocationInfo}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocationIcon color="primary" />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2">
                {userLocation ? 
                  `Latitude: ${userLocation.latitude.toFixed(6)}, Longitude: ${userLocation.longitude.toFixed(6)}` : 
                  'Acquiring location...'
                }
              </Typography>
              {userLocation && (
                <Typography variant="caption" color="text.secondary">
                  Accuracy: ±{userLocation.accuracy.toFixed(1)} meters
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Collapse>
      
      {/* Members List Drawer */}
      <Drawer
        anchor="right"
        open={showMembersList}
        onClose={toggleMembersList}
        variant="persistent"
        sx={{
          width: 320,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 320,
            boxSizing: 'border-box',
            opacity: controlsOpacity,
            backdropFilter: 'blur(2px)',
            bgcolor: 'rgba(0,0,0,0.8)',
            color: 'text.primary',
            border: 'none',
            boxShadow: 3,
            height: '100%',
            top: 0,
            // Raise the drawer above map controls and app bar so it clearly overlays the map
            zIndex: 1400
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Group Members</Typography>
          <IconButton onClick={toggleMembersList}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider />
        
        <List sx={{ overflow: 'auto' }}>
          {members.map((member, index) => {
            const memberLocation = locations.find(loc => loc.user_id === member.user_id);
            const isOnline = !!memberLocation;
            const distance = userLocation && memberLocation && memberLocation.coordinates ? 
              calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                memberLocation.coordinates.latitude,
                memberLocation.coordinates.longitude
              ) : null;
            
            // Format display name: try first_name + last_name, fallback to first_name, then username/email
            const displayName = member.first_name && member.last_name 
              ? `${member.first_name} ${member.last_name}`
              : member.first_name || member.username || member.email;
            
            return (
              <React.Fragment key={member.user_id}>
                {index > 0 && <Divider component="li" />}
                <ListItem 
                  component="li"
                >
                  <ListItemButton onClick={() => handleMemberClick(member)}>
                    <ListItemAvatar>
                      <Avatar 
                        src={getAvatarContent(member)}
                        alt={displayName}
                        sx={{
                          opacity: isOnline ? 1 : 0.6,
                          filter: isOnline ? 'none' : 'grayscale(50%)',
                        }}
                      >
                        {getAvatarFallback(member)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={displayName}
                      secondary={
                        memberLocation ? 
                          `Last updated: ${new Date(memberLocation.timestamp).toLocaleTimeString()}` : 
                          'Location not shared'
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </Drawer>
      
      {/* Settings Dialog */}
      <Dialog 
        open={openSettingsDialog} 
        onClose={() => setOpenSettingsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Location Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={satelliteMode} 
                  onChange={(e) => toggleSatelliteMode(e.target.checked)}
                  color="primary"
                />
              }
              label="Satellite View"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3 }}>
              Show satellite imagery with street overlays
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={false} // TODO: Connect to actual theme state
                  onChange={(e) => {/* TODO: Implement theme toggle */}}
                />
              }
              label="Dark Mode"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3 }}>
              Toggle between light and dark theme
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={highAccuracyMode} 
                  onChange={(e) => setHighAccuracyMode(e.target.checked)}
                  color="primary"
                />
              }
              label="High Accuracy Mode"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3 }}>
              Uses GPS for more precise location but consumes more battery
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={useBestReading} 
                  onChange={(e) => setUseBestReading(e.target.checked)}
                  color="primary"
                />
              }
              label="Use Best GPS Reading"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3 }}>
              Collect multiple GPS readings and use the most accurate one. Improves accuracy but adds slight delay.
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Minimum Accuracy Threshold (meters)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Slider
                value={accuracyThreshold}
                min={50}
                max={1000}
                step={25}
                onChange={(e, newValue) => setAccuracyThreshold(newValue)}
                valueLabelDisplay="auto"
                valueLabelFormat={value => `${value}m`}
                sx={{ mr: 2, flexGrow: 1 }}
              />
              <Typography>{accuracyThreshold}m</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Positions worse than this accuracy will be rejected. Lower values = better accuracy but fewer location updates.
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Update Interval (seconds)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Slider
                value={updateInterval}
                min={15} // Increased minimum to 15 seconds
                max={120} // Increased maximum to 2 minutes
                step={15}
                onChange={(e, newValue) => setUpdateInterval(newValue)}
                valueLabelDisplay="auto"
                valueLabelFormat={value => `${value}s`}
                sx={{ mr: 2, flexGrow: 1 }}
              />
              <Typography>{updateInterval}s</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Higher values reduce API calls and help prevent rate limiting
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Proximity Alert Distance</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Slider
                value={proximityDistance}
                min={50}
                max={1000}
                step={50}
                onChange={(e, newValue) => setProximityDistance(newValue)}
                valueLabelDisplay="auto"
                valueLabelFormat={value => `${value}m`}
                sx={{ mr: 2, flexGrow: 1 }}
              />
              <Typography>{proximityDistance}m</Typography>
            </Box>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={showProximityAlerts} 
                  onChange={(e) => setShowProximityAlerts(e.target.checked)}
                  color="primary"
                />
              }
              label="Show Proximity Alerts"
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={overlayCreateMode} 
                  onChange={(e) => {
                    const val = e.target.checked;
                    setOverlayCreateMode(val);
                    try { localStorage.setItem('overlayCreateMode', val ? 'true' : 'false'); } catch (err) {}
                  }}
                  color="primary"
                />
              }
              label="Use HUD Overlay for Place Create"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3 }}>
              When enabled, entering Place Selection will show a centered HUD marker. When disabled, click any map point to create a place.
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>UI Overlay Opacity</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Slider
                value={controlsOpacity}
                min={0.5}
                max={1}
                step={0.05}
                onChange={(e, newValue) => setControlsOpacity(newValue)}
                valueLabelDisplay="auto"
                valueLabelFormat={value => `${Math.round(value * 100)}%`}
                sx={{ mr: 2, flexGrow: 1 }}
              />
              <Typography>{Math.round(controlsOpacity * 100)}%</Typography>
            </Box>
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Aggregation Bucket Precision</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Number of decimal digits to round coordinates for aggregation. Higher = tighter grouping.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Slider
                value={bucketPrecision}
                min={2}
                max={6}
                step={1}
                onChange={(e, newValue) => setBucketPrecision(newValue)}
                valueLabelDisplay="auto"
                sx={{ mr: 2, flexGrow: 1 }}
              />
              <Typography>{bucketPrecision} digits</Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Cluster Threshold</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              When the number of rendered points exceeds this value, the map switches to clustered rendering.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Slider
                value={clusterThreshold}
                min={50}
                max={1000}
                step={10}
                onChange={(e, newValue) => setClusterThreshold(newValue)}
                valueLabelDisplay="auto"
                valueLabelFormat={value => `${value} pts`}
                sx={{ mr: 2, flexGrow: 1 }}
              />
              <Typography>{clusterThreshold} pts</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettingsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Aggregated Members Dialog (for buckets with multiple members) */}
      <Dialog
        open={openAggregatedDialog}
        onClose={() => setOpenAggregatedDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Group at this location</DialogTitle>
        <DialogContent>
          <List>
            {aggregatedBucketMembers.map(m => (
              <ListItem key={m.user_id} disablePadding>
                <ListItemButton onClick={() => {
                  // Close aggregated dialog and open individual location dialog if coordinates exist
                  setOpenAggregatedDialog(false);
                  if (m.coordinates) {
                    setSelectedLocation(m);
                    setOpenLocationDialog(true);
                  } else {
                    showNotification(`${m.username} has no shared location`, 'info');
                  }
                }}>
                  <ListItemAvatar>
                    <Avatar src={m.profile_image_url}>{m.username ? m.username.charAt(0).toUpperCase() : '?'}</Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={formatDisplayName(m.username, m.first_name, m.last_name)} 
                    secondary={m.coordinates ? 'Location shared' : 'No location'} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAggregatedDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Location Details Dialog */}
      <Dialog 
        open={openLocationDialog} 
        onClose={(event, reason) => {
          // Allow closing when clicking the backdrop or pressing Escape
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            setOpenLocationDialog(false);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        {selectedLocation && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">
                  {selectedLocation.place ? `📍 ${selectedLocation.username || 'Place'}` : 
                   (selectedLocation.first_name && selectedLocation.last_name ? 
                    `${selectedLocation.first_name} ${selectedLocation.last_name}` : 
                    selectedLocation.first_name || selectedLocation.username || 'Unknown')}
                </Typography>
              </Box>
              <IconButton
                aria-label="close"
                onClick={() => setOpenLocationDialog(false)}
                size="small"
                sx={{
                  bgcolor: 'action.hover',
                  width: 36,
                  height: 36,
                  borderRadius: '50%'
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  src={selectedLocation.place ? undefined : getAvatarContent(selectedLocation)}
                  sx={{ 
                    width: 80, 
                    height: 80,
                    mb: 1,
                    bgcolor: selectedLocation.place ? 'success.main' : 
                             (selectedLocation.user_id === currentUser?.id ? 'primary.main' : 'secondary.main')
                  }}
                >
                  {selectedLocation.place ? '📍' : getAvatarFallback(selectedLocation)}
                </Avatar>
                {selectedLocation.place ? (
                  <>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                      <TextField
                        autoFocus
                        variant="standard"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (selectedLocation && selectedLocation.raw && selectedLocation.raw._id) {
                              renamePlace(selectedLocation.raw._id, renameText);
                            }
                          }
                        }}
                        InputProps={{
                          disableUnderline: true,
                          sx: {
                            fontSize: '1.25rem',
                            fontWeight: 500,
                            fontFamily: 'inherit'
                          },
                          inputProps: {
                            style: { textAlign: 'center' }
                          }
                        }}
                        onFocus={(e) => {
                          // Auto-select the input contents for quick rename
                          try { e.target.select(); } catch (err) { /* ignore */ }
                        }}
                        sx={{ width: '80%', maxWidth: 420 }}
                        disabled={isRenaming}
                        aria-label="Edit place name"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {selectedLocation.place ? 'Saved Location' : 
                       (selectedLocation.user_id === currentUser?.id ? 'Your Location' : 'Group Member')}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="h6">
                      {selectedLocation.first_name && selectedLocation.last_name ? 
                        `${selectedLocation.first_name} ${selectedLocation.last_name}` : 
                        selectedLocation.first_name || selectedLocation.username || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedLocation.place ? 'Saved Location' : 
                       (selectedLocation.user_id === currentUser?.id ? 'Your Location' : 'Group Member')}
                    </Typography>
                  </>
                )}
              </Box>
              
              {/* Location details */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Location Details
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Last Updated" 
                      secondary={new Date(selectedLocation.timestamp).toLocaleString()} 
                    />
                  </ListItem>
                  
                  {selectedLocation.coordinates && (
                    <>
                      <ListItem>
                        <ListItemText 
                          primary="Coordinates" 
                          secondary={`${selectedLocation.coordinates.latitude.toFixed(6)}, ${selectedLocation.coordinates.longitude.toFixed(6)}`} 
                        />
                      </ListItem>
                      
                      {!selectedLocation.place && selectedLocation.coordinates.accuracy && (
                        <ListItem>
                          <ListItemText 
                            primary="Accuracy" 
                            secondary={`±${Math.round(selectedLocation.coordinates.accuracy)} meters`} 
                          />
                        </ListItem>
                      )}
                      
                      {!selectedLocation.place && selectedLocation.coordinates.altitude && (
                        <ListItem>
                          <ListItemText 
                            primary="Altitude" 
                            secondary={`${Math.round(selectedLocation.coordinates.altitude)} meters`} 
                          />
                        </ListItem>
                      )}
                      
                      {!selectedLocation.place && selectedLocation.coordinates.speed > 0 && (
                        <ListItem>
                          <ListItemText 
                            primary="Speed" 
                            secondary={`${Math.round(selectedLocation.coordinates.speed * 3.6)} km/h`} 
                          />
                        </ListItem>
                      )}
                      
                      {!selectedLocation.place && userLocation && (
                        <ListItem>
                          <ListItemText 
                            primary="Distance from you" 
                            secondary={formatDistance(calculateDistance(
                              userLocation.latitude,
                              userLocation.longitude,
                              selectedLocation.coordinates.latitude,
                              selectedLocation.coordinates.longitude
                            ))} 
                          />
                        </ListItem>
                      )}
                    </>
                  )}
                  
                  {selectedLocation.place && selectedLocation.raw && selectedLocation.raw.address && (
                    <ListItem>
                      <ListItemText 
                        primary="Address" 
                        secondary={selectedLocation.raw.address} 
                      />
                    </ListItem>
                  )}
                  
                  {!selectedLocation.place && (
                    <ListItem>
                      <ListItemText 
                        primary="Battery Level" 
                        secondary={`${selectedLocation.battery_level || 'N/A'}%`} 
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            </DialogContent>
            <DialogActions>
              {!selectedLocation.place && (
                <Button onClick={() => setOpenLocationDialog(false)}>Close</Button>
              )}
              {selectedLocation.place && selectedLocation.raw && (
                <Button 
                  color="error"
                  onClick={() => confirmDeletePlace(selectedLocation.raw._id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'DELETING...' : 'DELETE'}
                </Button>
              )}

              {selectedLocation.place && selectedLocation.raw && (
                <Button
                  color="primary"
                  onClick={() => {
                    if (selectedLocation && selectedLocation.raw && selectedLocation.raw._id) {
                      renamePlace(selectedLocation.raw._id, renameText);
                    }
                  }}
                  disabled={isRenaming || !renameText || renameText.trim() === ''}
                >
                  {isRenaming ? 'RENAMING...' : 'RENAME'}
                </Button>
              )}
              {selectedLocation.coordinates && (
                <Button 
                  color="primary"
                  onClick={() => {
                    if (selectedLocation.place && selectedLocation.raw) {
                      // For places, enter dragging mode
                      enterPlaceDraggingMode(selectedLocation.raw._id);
                    } else {
                      // For other locations, just center the map
                      centerMapOnLocation(selectedLocation.coordinates);
                      setOpenLocationDialog(false);
                    }
                  }}
                >
                  {selectedLocation.place ? 'REPOSITION' : 'CENTER'}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteConfirm}
        onClose={cancelDeletePlace}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this place? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeletePlace} disabled={isDeleting}>Cancel</Button>
          <Button color="error" onClick={() => deletePlace(deleteTargetId)} disabled={isDeleting}>{isDeleting ? 'DELETING...' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>

      {/* Create Place Dialog */}
      <Dialog
        open={openCreatePlaceDialog}
        onClose={() => {
          setOpenCreatePlaceDialog(false);
          setCreatePlaceCoords(null);
          setCreatePlaceFeature(null);
          setCreatePlaceAddress('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Place</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Place name"
              value={createPlaceName}
              onChange={(e) => setCreatePlaceName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Address / Notes"
              value={createPlaceAddress}
              onChange={(e) => setCreatePlaceAddress(e.target.value)}
              fullWidth
            />
            {createPlaceCoords && (
              <Typography variant="caption" color="text.secondary">{`Lat: ${createPlaceCoords.latitude.toFixed(6)}, Lng: ${createPlaceCoords.longitude.toFixed(6)}`}</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenCreatePlaceDialog(false);
            setCreatePlaceCoords(null);
            setCreatePlaceFeature(null);
            setCreatePlaceAddress('');
          }}>Cancel</Button>
          <Button
            onClick={createPlaceConfirmed}
            disabled={isCreatingPlace || !createPlaceName || createPlaceName.trim() === ''}
            variant="contained"
          >
            {isCreatingPlace ? 'CREATING...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Music Player */}
      {showMusicPlayer && (
        <MusicPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          playlist={playlist}
          isController={isController}
          onPlay={() => musicPlay()}
          onPause={() => musicPause()}
          onNext={() => playNext()}
          onPrevious={() => playPrevious()}
          onSeek={(position) => musicSeek(position)}
          onVolumeChange={(vol) => setVolume(vol)}
          onClose={() => setShowMusicPlayer(false)}
          onTakeControl={takeControl}
          onReleaseControl={releaseControl}
          onSelectTrack={(track) => loadAndPlay(track)}
        />
      )}

      {/* Dev-only quick test panel */}
      {process.env.NODE_ENV !== 'production' && (
        <Box sx={{ position: 'absolute', left: 16, bottom: 16, zIndex: 12 }}>
          <Paper elevation={6} sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button size="small" onClick={() => { try { window.simulateLocationLoad && window.simulateLocationLoad(200); } catch (e) {} }}>
              Sim: 200
            </Button>
            <Button size="small" onClick={() => { try { window.simulateWarriorsOverlap && window.simulateWarriorsOverlap(); } catch (e) {} }}>
              Sim: Warriors
            </Button>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default LocationTracking;
