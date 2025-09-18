// jamz-client-vite/src/pages/location/LocationTracking.jsx
// LocationTracking.jsx - A component for tracking and displaying group member locations in real-time

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ListItem,
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
  Collapse
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  MyLocation as MyLocationIcon,
  LocationOn as LocationIcon,
  LocationOff as LocationOffIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Navigation as NavigationIcon,
  Speed as SpeedIcon,
  BatteryFull as BatteryIcon,
  Menu as MenuIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import mapboxgl from 'mapbox-gl';
import '../../styles/map/MapboxMap.css'; // Mapbox Map CSS styling

const LocationTracking = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State variables
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sharingLocation, setSharingLocation] = useState(true);
  const [showProximityAlerts, setShowProximityAlerts] = useState(true);
  const [proximityDistance, setProximityDistance] = useState(100);
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);
  const [openMemberDialog, setOpenMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [highAccuracyMode, setHighAccuracyMode] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(15);
  const [locationError, setLocationError] = useState(null);
  
  // New state variables for UI controls
  const [showControls, setShowControls] = useState(true);
  const [showMembersList, setShowMembersList] = useState(false);
  const [showLocationInfo, setShowLocationInfo] = useState(true);
  const [controlsOpacity, setControlsOpacity] = useState(0.85);
  
  // Rate limiting state variables
  const [retryDelay, setRetryDelay] = useState(15); // Default retry delay in seconds
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  
  // Geolocation state
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [geolocationRetries, setGeolocationRetries] = useState(0);
  
  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const markersRef = useRef({});
  const timerRef = useRef(null);
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 
  'pk.eyJ1IjoicmljaGNvYnJpZW4iLCJhIjoiY21mb2o0eXMyMDZndDJxcHN6aThpemF2ZyJ9.P0sztHmrR8vgJw6uEjfUoA';
  if (!MAPBOX_TOKEN) {
    console.error('Missing Mapbox token');
    return;
  };
    
  // ✅ Map Initialization
  useEffect(() => {
    if (mapContainerRef.current) {
      initializeMap();
    }
  }, [mapContainerRef.current]);

  // ✅ Component Initialization
  useEffect(() => {
    fetchGroupDetails();

    if (sharingLocation) {
      startLocationTracking();
    }

    timerRef.current = setTimeout(() => {
      // Your deferred logic here (e.g. retry, telemetry ping)
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [groupId]);
  
  // Periodically fetch locations of other members with rate limiting protection
  useEffect(() => {
    // Function to fetch member locations with rate limiting protection
    const fetchWithRateLimitProtection = async () => {
      // Skip if we're rate limited
      if (isRateLimited) {
        console.log(`Rate limited. Waiting ${retryDelay} seconds before next attempt.`);
        return;
      }
      
      // Enforce minimum time between requests (at least 5 seconds)
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime;
      const minTimeBetweenFetches = 5000; // 5 seconds minimum
      
      if (timeSinceLastFetch < minTimeBetweenFetches) {
        console.log(`Too soon since last fetch (${Math.round(timeSinceLastFetch/1000)}s). Minimum wait time is ${minTimeBetweenFetches/1000}s.`);
        return;
      }
      
      // Update last fetch time
      setLastFetchTime(now);
      
      try {
        // In a real implementation, fetch actual location data
        let locationData;
        try {
          const response = await api.get(`/location/group/${groupId}`);
          locationData = response.data.locations;
          
          // Reset consecutive errors and retry delay on success
          if (consecutiveErrors > 0) {
            setConsecutiveErrors(0);
            setRetryDelay(15); // Reset to default
          }
        } catch (error) {
          console.log('Error fetching location data:', error);
          
          // Handle rate limiting (429 Too Many Requests)
          if (error.response && error.response.status === 429) {
            console.log('Rate limited by server. Implementing backoff strategy.');
            setIsRateLimited(true);
            
            // Increase consecutive errors
            const newErrorCount = consecutiveErrors + 1;
            setConsecutiveErrors(newErrorCount);
            
            // Implement exponential backoff (15s, 30s, 60s, 120s, etc.)
            const newDelay = Math.min(15 * Math.pow(2, newErrorCount - 1), 900); // Max 15 minutes
            setRetryDelay(newDelay);
            
            // Set a timer to clear the rate limit after the delay
            setTimeout(() => {
              console.log(`Rate limit timeout expired. Resuming fetches.`);
              setIsRateLimited(false);
            }, newDelay * 1000);
          }
          
          console.log('Using mock location data due to API error:', error);
          // Fallback to mock data
          locationData = [
            {
              user_id: user?.id || 'current-user',
              username: user?.username || 'CurrentUser',
              coordinates: userLocation || {
                latitude: 39.40307408791466,
                longitude: -104.88774754460103,
                accuracy: 10,
                altitude: 100,
                heading: 90,
                speed: 0
              },
              timestamp: new Date().toISOString(),
              battery_level: 85,
              connection_type: 'wifi'
            },
            {
              user_id: 'user2',
              username: 'JaneDoe',
              coordinates: {
                latitude: 40.7138,
                longitude: -74.0070,
                accuracy: 15,
                altitude: 105,
                heading: 180,
                speed: 5
              },
              timestamp: new Date().toISOString(),
              battery_level: 65,
              connection_type: 'cellular'
            },
            {
              user_id: 'user3',
              username: 'BobSmith',
              coordinates: {
                latitude: 40.7118,
                longitude: -74.0050,
                accuracy: 20,
                altitude: 95,
                heading: 270,
                speed: 2
              },
              timestamp: new Date().toISOString(),
              battery_level: 45,
              connection_type: 'cellular'
            }
          ];
        }
        
        setLocations(locationData);
        
        // Update map markers
        updateMapMarkers(locationData);
        
        // Check for proximity alerts
        if (showProximityAlerts && userLocation) {
          checkProximityAlerts(locationData);
        }
      } catch (error) {
        console.error('Error in fetchMemberLocations:', error);
      }
    };

    // Initial fetch when component mounts
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
      
      // In a real implementation, fetch actual group data
      let groupData;
  try {
  const response = await api.get(`/groups/${groupId}`);
        groupData = response.data.group;
      } catch (error) {
        console.log('Using mock group data due to API error:', error);
        // Fallback to mock data
        groupData = {
          id: groupId,
          name: 'Mountain Explorers',
          description: 'A group for mountain skiing enthusiasts',
          members: [
            {
              user_id: user?.id || 'current-user',
              username: user?.username || 'CurrentUser',
              profile_image_url: user?.profile_image_url,
              status: 'active'
            },
            {
              user_id: 'user2',
              username: 'JaneDoe',
              profile_image_url: null,
              status: 'active'
            },
            {
              user_id: 'user3',
              username: 'BobSmith',
              profile_image_url: null,
              status: 'active'
            }
          ]
        };
      }
      
      setGroup(groupData);
      setMembers(groupData.members);
      
      // Fetch initial member locations
      fetchMemberLocations();
      
      setError('');
    } catch (error) {
      console.error('Error fetching group details:', error);
      setError('Failed to load group details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch locations of all group members
  const fetchMemberLocations = async () => {
    try {
      // In a real implementation, fetch actual location data
      let locationData;
      try {
        const response = await api.get(`/location/group/${groupId}`);
        locationData = response.data.locations;
      } catch (error) {
        console.log('Using mock location data due to API error:', error);
        // Fallback to mock data
        locationData = [
          {
            user_id: user?.id || 'current-user', // Add null check with default value
            username: user?.username || 'CurrentUser',
            coordinates: userLocation || {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 10,
              altitude: 100,
              heading: 90,
              speed: 0
            },
            timestamp: new Date().toISOString(),
            battery_level: 85,
            connection_type: 'wifi'
          },
          {
            user_id: 'user2',
            username: 'JaneDoe',
            coordinates: {
              latitude: 40.7138,
              longitude: -74.0070,
              accuracy: 15,
              altitude: 105,
              heading: 180,
              speed: 5
            },
            timestamp: new Date().toISOString(),
            battery_level: 65,
            connection_type: 'cellular'
          },
          {
            user_id: 'user3',
            username: 'BobSmith',
            coordinates: {
              latitude: 40.7118,
              longitude: -74.0050,
              accuracy: 20,
              altitude: 95,
              heading: 270,
              speed: 2
            },
            timestamp: new Date().toISOString(),
            battery_level: 45,
            connection_type: 'cellular'
          }
        ];
      }
      
      setLocations(locationData);
      
      // Update map markers
      updateMapMarkers(locationData);
      
      // Check for proximity alerts
      if (showProximityAlerts && userLocation) {
        checkProximityAlerts(locationData);
      }
    } catch (error) {
      console.error('Error fetching member locations:', error);
    }
  };
  
  // Initialize the map
  const initializeMap = () => {
    if (!mapboxgl) {
      console.error('Mapbox GL JS is not available');
      return;
    }
    
    try {
      // Check if the map container ref is available
      if (!mapContainerRef.current) {
        console.error('Map container ref is not available yet');
        // Set a timeout to try again
        setTimeout(initializeMap, 100);
        return;
      }
      
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/outdoors-v11',
        center: [-74.0060, 40.7128], // Default to NYC
        zoom: 13
      });
      
      map.on('load', () => {
        setMapLoaded(true);
        mapRef.current = map;
        
        // Add user location marker if available
        if (userLocation) {
          centerMapOnLocation(userLocation);
        }
        
        // Add markers for all members
        if (locations.length > 0) {
          updateMapMarkers(locations);
        }
        
        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        map.addControl(new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }), 'bottom-right');
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
      return;
    }
    
    // Prevent multiple simultaneous geolocation requests
    if (isGettingLocation) {
      return;
    }
    
    setIsGettingLocation(true);
    
    const options = {
      enableHighAccuracy: highAccuracyMode,
      timeout: 20000, // Increased timeout to 20 seconds
      maximumAge: 30000 // Allow cached positions up to 30 seconds old
    };
    
    try {
      // Use getCurrentPosition first to get an immediate position if available
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handlePositionSuccess(position);
          
          // After getting initial position, start watching for updates
          startWatchingPosition();
        },
        (error) => {
          console.log('Error getting initial position, falling back to default location:', error);
          
          // If we can't get the initial position, use a default and start watching anyway
          const defaultLocation = {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 1000,
            altitude: 0,
            heading: 0,
            speed: 0
          };
          
          setUserLocation(defaultLocation);
          setLocationError('Using default location. ' + getGeolocationErrorMessage(error));
          
          // Start watching position even if initial position failed
          startWatchingPosition();
        },
        options
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setLocationError('Failed to start location tracking. Please try again.');
      setIsGettingLocation(false);
    }
  };
  
  // Start watching position for continuous updates
  const startWatchingPosition = () => {
    const options = {
      enableHighAccuracy: highAccuracyMode,
      timeout: 20000, // Increased timeout to 20 seconds
      maximumAge: 30000 // Allow cached positions up to 30 seconds old
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
    
    const newLocation = {
      latitude,
      longitude,
      accuracy,
      altitude: altitude || 0,
      heading: heading || 0,
      speed: speed || 0
    };
    
    setUserLocation(newLocation);
    setLocationError(null);
    setIsGettingLocation(false);
    setGeolocationRetries(0); // Reset retry counter on success
    
    // Update the server with the new location
    updateLocationOnServer(newLocation);
    
    // Center map on user's location if this is the first location update
    if (!userLocation && mapRef.current) {
      centerMapOnLocation(newLocation);
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
      setLocationError(`${errorMessage} Using default or last known location.`);
      setIsGettingLocation(false);
      
      // Use default location if we don't have one yet
      if (!userLocation) {
        const defaultLocation = {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 1000,
          altitude: 0,
          heading: 0,
          speed: 0
        };
        
        setUserLocation(defaultLocation);
        
        // Center map on default location
        if (mapRef.current) {
          centerMapOnLocation(defaultLocation);
        }
      }
    } else {
      // Try again with less strict options
      setLocationError(`${errorMessage} Retrying... (${newRetryCount}/3)`);
      
      // Retry with less strict options
      setTimeout(() => {
        navigator.geolocation.getCurrentPosition(
          handlePositionSuccess,
          handlePositionError,
          {
            enableHighAccuracy: false, // Try without high accuracy
            timeout: 30000, // Longer timeout
            maximumAge: 60000 // Accept older cached positions
          }
        );
      }, 1000); // Wait 1 second before retrying
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
  };
  
  // Toggle location sharing on/off
  const toggleLocationSharing = () => {
    const newState = !sharingLocation;
    setSharingLocation(newState);
    
    if (newState) {
      startLocationTracking();
    } else {
      stopLocationTracking();
      
      // Notify server that user stopped sharing
      api.post(`/location/stop-sharing`, {
        group_id: groupId,
        user_id: user?.id || 'current-user'
      }).catch(error => {
        console.error('Error notifying server about stopping location sharing:', error);
      });
    }
  };
  
  // Update user's location on the server
  const updateLocationOnServer = async (location) => {
    try {
      const locationData = {
        group_id: groupId,
        user_id: user?.id || 'current-user', // Add null check with default value
        coordinates: location,
        timestamp: new Date().toISOString(),
        battery_level: 85, // In a real app, get actual battery level
        connection_type: navigator.connection ? navigator.connection.type : 'unknown'
      };
      
  await api.post('/location/update', locationData).catch(error => {
        console.log('Mock location update - would send:', locationData);
      });
    } catch (error) {
      console.error('Error updating location on server:', error);
    }
  };
  
  // Center the map on a specific location
  const centerMapOnLocation = (location) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 15,
        essential: true
      });
    }
  };
  
  // Update map markers for all members
  const updateMapMarkers = (locationData) => {
    if (!mapRef.current || !mapboxgl) return;
    
    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    // Add new markers
    locationData.forEach(location => {
      if (!location.coordinates) return;
      
      const { latitude, longitude } = location.coordinates;
      
      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'location-marker';
      markerEl.style.width = '30px';
      markerEl.style.height = '30px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.backgroundColor = location.user_id === (user?.id || 'current-user') ? '#2196f3' : '#ff9800';
      markerEl.style.border = '2px solid white';
      markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      markerEl.style.cursor = 'pointer';
      markerEl.style.display = 'flex';
      markerEl.style.justifyContent = 'center';
      markerEl.style.alignItems = 'center';
      
      // Add user initial or icon
      const initial = document.createElement('span');
      initial.textContent = location.username.charAt(0).toUpperCase();
      initial.style.color = 'white';
      initial.style.fontWeight = 'bold';
      markerEl.appendChild(initial);
      
      // Create and add the marker
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([longitude, latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<strong>${location.username}</strong><br>
           Last updated: ${new Date(location.timestamp).toLocaleTimeString()}<br>
           ${location.coordinates.speed > 0 ? `Speed: ${Math.round(location.coordinates.speed * 3.6)} km/h<br>` : ''}
           Battery: ${location.battery_level}%`
        ))
        .addTo(mapRef.current);
      
      markersRef.current[location.user_id] = marker;
      
      // Show popup for user's own location
      if (location.user_id === (user?.id || 'current-user')) {
        marker.togglePopup();
      }
    });
  };
  
  // Check for proximity alerts
  const checkProximityAlerts = (locationData) => {
    if (!userLocation) return;
    
    locationData.forEach(location => {
      if (location.user_id === (user?.id || 'current-user') || !location.coordinates) return;
      
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
  
  // Handle member selection
  const handleMemberClick = (member) => {
    setSelectedMember(member);
    setOpenMemberDialog(true);
    
    // Find member's location
    const memberLocation = locations.find(loc => loc.user_id === member.user_id);
    if (memberLocation && memberLocation.coordinates) {
      centerMapOnLocation(memberLocation.coordinates);
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
      {/* Fullscreen Map Container */}
      <Box 
        ref={mapContainerRef}
        sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}
      >
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
          </Box>
        )}
      </Box>
      
      {/* Top App Bar */}
      <AppBar 
        position="absolute" 
        color="transparent" 
        elevation={0}
        sx={{ 
          opacity: controlsOpacity,
          backdropFilter: 'blur(2px)',
          bgcolor: 'rgba(255,255,255,0.8)',
          transition: 'all 0.3s ease',
          top: showControls ? 0 : -64,
          zIndex: 10
        }}
      >
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={() => navigate(`/groups/${groupId}`)}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {group?.name || 'Location Tracking'}
          </Typography>
          
          <Tooltip title={sharingLocation ? "Stop Sharing Location" : "Start Sharing Location"}>
            <IconButton 
              color={sharingLocation ? "primary" : "default"}
              onClick={toggleLocationSharing}
            >
              {sharingLocation ? <LocationIcon /> : <LocationOffIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh Locations">
            <IconButton 
              color="inherit"
              onClick={fetchMemberLocations}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Settings">
            <IconButton 
              color="inherit"
              onClick={() => setOpenSettingsDialog(true)}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      {/* Toggle Controls Button */}
      <Tooltip title={showControls ? "Hide Controls" : "Show Controls"}>
        <IconButton
          sx={{
            position: 'absolute',
            top: showControls ? 72 : 16,
            right: 16,
            zIndex: 10,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              bgcolor: 'background.paper',
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
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              bgcolor: 'background.paper',
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
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              bgcolor: 'background.paper',
            }
          }}
          onClick={() => userLocation && centerMapOnLocation(userLocation)}
          disabled={!userLocation}
        >
          <MyLocationIcon />
        </IconButton>
      </Tooltip>
      
      {/* Alerts and Errors */}
      <Box
        sx={{
          position: 'absolute',
          top: showControls ? 72 : 16,
          left: 16,
          right: 196,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {isGettingLocation && (
          <Alert severity="info" sx={{ opacity: controlsOpacity }}>
            <AlertTitle>Getting Your Location</AlertTitle>
            Please wait while we determine your position...
          </Alert>
        )}
        
        {isRateLimited && (
          <Alert severity="warning" sx={{ opacity: controlsOpacity }}>
            <AlertTitle>Rate Limit Detected</AlertTitle>
            Too many location requests. Retrying in {retryDelay} seconds.
          </Alert>
        )}
        
        {locationError && (
          <Alert severity="error" sx={{ opacity: controlsOpacity }}>
            {locationError}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ opacity: controlsOpacity }}>
            {error}
          </Alert>
        )}
      </Box>
      
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
            bgcolor: 'rgba(255,255,255,0.8)',
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
            bgcolor: 'rgba(255,255,255,0.8)',
            border: 'none',
            boxShadow: 3,
            height: 'calc(100% - 64px)',
            top: 64,
            zIndex: 5
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
            
            return (
              <React.Fragment key={member.user_id}>
                {index > 0 && <Divider component="li" />}
                <ListItem 
                  button 
                  component="li"
                  onClick={() => handleMemberClick(member)}
                  secondaryAction={
                    <Chip 
                      label={distance ? formatDistance(distance) : 'Unknown'}
                      color={distance && distance <= proximityDistance ? "success" : "default"}
                      size="small"
                    />
                  }
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      color={isOnline ? "success" : "error"}
                    >
                      <Avatar 
                        src={member.profile_image_url} 
                        alt={member.username}
                      >
                        {member.username.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={member.username}
                    secondary={
                      memberLocation ? 
                        `Last updated: ${new Date(memberLocation.timestamp).toLocaleTimeString()}` : 
                        'Location not shared'
                    }
                  />
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettingsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Member Details Dialog */}
      <Dialog 
        open={openMemberDialog} 
        onClose={() => setOpenMemberDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedMember && (
          <>
            <DialogTitle>{selectedMember.username}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  src={selectedMember.profile_image_url}
                  sx={{ 
                    width: 80, 
                    height: 80,
                    mb: 1,
                    bgcolor: selectedMember.user_id === (user?.id || 'current-user') ? 'primary.main' : 'secondary.main'
                  }}
                >
                  {selectedMember.username.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="h6">{selectedMember.username}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedMember.status === 'active' ? 'Active Member' : 'Inactive'}
                </Typography>
              </Box>
              
              {/* Location details */}
              {(() => {
                const memberLocation = locations.find(loc => loc.user_id === selectedMember.user_id);
                if (!memberLocation) {
                  return (
                    <Alert severity="info">
                      No location data available for this member.
                    </Alert>
                  );
                }
                
                return (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Location Details
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Last Updated" 
                          secondary={new Date(memberLocation.timestamp).toLocaleString()} 
                        />
                      </ListItem>
                      
                      {memberLocation.coordinates && (
                        <>
                          <ListItem>
                            <ListItemText 
                              primary="Coordinates" 
                              secondary={`${memberLocation.coordinates.latitude.toFixed(6)}, ${memberLocation.coordinates.longitude.toFixed(6)}`} 
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemText 
                              primary="Accuracy" 
                              secondary={`±${Math.round(memberLocation.coordinates.accuracy)} meters`} 
                            />
                          </ListItem>
                          
                          {memberLocation.coordinates.altitude && (
                            <ListItem>
                              <ListItemText 
                                primary="Altitude" 
                                secondary={`${Math.round(memberLocation.coordinates.altitude)} meters`} 
                              />
                            </ListItem>
                          )}
                          
                          {memberLocation.coordinates.speed > 0 && (
                            <ListItem>
                              <ListItemText 
                                primary="Speed" 
                                secondary={`${Math.round(memberLocation.coordinates.speed * 3.6)} km/h`} 
                              />
                            </ListItem>
                          )}
                          
                          {userLocation && (
                            <ListItem>
                              <ListItemText 
                                primary="Distance from you" 
                                secondary={formatDistance(calculateDistance(
                                  userLocation.latitude,
                                  userLocation.longitude,
                                  memberLocation.coordinates.latitude,
                                  memberLocation.coordinates.longitude
                                ))} 
                              />
                            </ListItem>
                          )}
                        </>
                      )}
                      
                      <ListItem>
                        <ListItemText 
                          primary="Battery Level" 
                          secondary={`${memberLocation.battery_level}%`} 
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText 
                          primary="Connection" 
                          secondary={memberLocation.connection_type} 
                        />
                      </ListItem>
                    </List>
                  </Box>
                );
              })()}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenMemberDialog(false)}>Close</Button>
              <Button 
                color="primary"
                onClick={() => {
                  const memberLocation = locations.find(loc => loc.user_id === selectedMember.user_id);
                  if (memberLocation && memberLocation.coordinates) {
                    centerMapOnLocation(memberLocation.coordinates);
                    setOpenMemberDialog(false);
                  }
                }}
                disabled={!locations.find(loc => loc.user_id === selectedMember.user_id)?.coordinates}
              >
                Center on Map
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default LocationTracking;
