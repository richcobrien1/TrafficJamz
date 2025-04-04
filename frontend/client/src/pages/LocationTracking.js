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
  Chip
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
  BatteryFull as BatteryIcon
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';

// Replace with your actual Mapbox token in production
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoicmljaGNvYnJpZW4iLCJhIjoiY205Mzdqb21lMGo0YjJpbjZrY3Y4b3VvNCJ9.Cc3LBCRqlxOnjurlOXqCVA';

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
  
  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const markersRef = useRef({});
  
  // Initialize component
  useEffect(() => {
    fetchGroupDetails();
    initializeMap();
    
    if (sharingLocation) {
      startLocationTracking();
    }
    
    // Cleanup function
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      
      // Clean up map markers
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [groupId]);
  
  // Periodically fetch locations of other members
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (sharingLocation) {
        fetchMemberLocations();
      }
    }, updateInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [sharingLocation, updateInterval]);
  
  // Fetch group details and member information
  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, fetch actual group data
      let groupData;
      try {
        const response = await api.get(`/api/groups/${groupId}`);
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
        const response = await api.get(`/api/location/group/${groupId}`);
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
    
    const options = {
      enableHighAccuracy: highAccuracyMode,
      timeout: 10000,
      maximumAge: 0
    };
    
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
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
          
          // Update the server with the new location
          updateLocationOnServer(newLocation);
          
          // Center map on user's location if this is the first location update
          if (!userLocation && mapRef.current) {
            centerMapOnLocation(newLocation);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
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
          
          setLocationError(errorMessage);
        },
        options
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setLocationError('Failed to start location tracking. Please try again.');
    }
  };
  
  // Stop tracking the user's location
  const stopLocationTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
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
      api.post(`/api/location/stop-sharing`, {
        group_id: groupId,
        user_id: user.id
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
        user_id: user.id,
        coordinates: location,
        timestamp: new Date().toISOString(),
        battery_level: 85, // In a real app, get actual battery level
        connection_type: navigator.connection ? navigator.connection.type : 'unknown'
      };
      
      await api.post('/api/location/update', locationData).catch(error => {
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
      markerEl.style.backgroundColor = location.user_id === user.id ? '#2196f3' : '#ff9800';
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
      if (location.user_id === user.id) {
        marker.togglePopup();
      }
    });
  };
  
  // Check for proximity alerts
  const checkProximityAlerts = (locationData) => {
    if (!userLocation) return;
    
    locationData.forEach(location => {
      if (location.user_id === user.id || !location.coordinates) return;
      
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
  
  // Render component
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Location Tracking
        </Typography>
        
        {locationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {locationError}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Controls for Location Tracking */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/groups/${groupId}`)}
          >
            Back to Group
          </Button>
          
          <Box>
            <Button 
              variant="outlined" 
              color={sharingLocation ? "secondary" : "primary"}
              onClick={toggleLocationSharing}
              startIcon={sharingLocation ? <LocationOffIcon /> : <LocationIcon />}
              sx={{ mr: 1 }}
            >
              {sharingLocation ? 'Stop Sharing' : 'Start Sharing'}
            </Button>
            
            <IconButton 
              color="primary" 
              onClick={() => setOpenSettingsDialog(true)}
              aria-label="Location Settings"
            >
              <SettingsIcon />
            </IconButton>
          </Box>
        </Box>
        
        {/* Location Status and Map */}
        {sharingLocation ? (
          <Box>
            {/* Location Information */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Current Location
              </Typography>
              
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
                <IconButton 
                  color="primary" 
                  onClick={() => userLocation && centerMapOnLocation(userLocation)}
                  disabled={!userLocation}
                  aria-label="Center on my location"
                >
                  <MyLocationIcon />
                </IconButton>
              </Box>
            </Paper>
            
            {/* Map Display */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Map View
              </Typography>
              
              <Box 
                ref={mapContainerRef}
                sx={{ 
                  height: 400, 
                  borderRadius: 1,
                  position: 'relative',
                  overflow: 'hidden'
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
                    <CircularProgress size={40} />
                  </Box>
                )}
              </Box>
            </Paper>
            
            {/* Group Members */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Group Members
              </Typography>
              
              <List>
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
            </Paper>
          </Box>
        ) : (
          <Box sx={{ 
            p: 3, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            borderRadius: 1
          }}>
            <LocationOffIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2">
              Location tracking is currently disabled.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Enable tracking to share your location with group members.
            </Typography>
          </Box>
        )}
      </Paper>
      
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
              Uses GPS for more precise location (higher battery usage)
            </Typography>
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
              label="Proximity Alerts"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3 }}>
              Notify when group members are nearby
            </Typography>
          </Box>
          
          {showProximityAlerts && (
            <Box sx={{ mb: 3, pl: 3, pr: 3 }}>
              <Typography id="proximity-distance-slider" gutterBottom>
                Alert Distance: {proximityDistance}m
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="caption">50m</Typography>
                <Box sx={{ flexGrow: 1 }}>
                  <Slider
                    value={proximityDistance}
                    onChange={(e, newValue) => setProximityDistance(newValue)}
                    aria-labelledby="proximity-distance-slider"
                    min={50}
                    max={500}
                    step={50}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}m`}
                    sx={{ 
                      width: '100%',
                      '& .MuiSlider-rail': { height: 4 },
                      '& .MuiSlider-track': { height: 4 }
                    }}
                  />
                </Box>
                <Typography variant="caption">500m</Typography>
              </Box>
            </Box>
          )}
          
          <Box sx={{ mb: 3 }}>
            <Typography id="update-interval-slider" gutterBottom>
              Update Interval: {updateInterval} seconds
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="caption">5s</Typography>
              <Box sx={{ flexGrow: 1 }}>
                <Slider
                  value={updateInterval}
                  onChange={(e, newValue) => setUpdateInterval(newValue)}
                  aria-labelledby="update-interval-slider"
                  min={5}
                  max={60}
                  step={5}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}s`}
                  sx={{ 
                    width: '100%',
                    '& .MuiSlider-rail': { height: 4 },
                    '& .MuiSlider-track': { height: 4 }
                  }}
                />
              </Box>
              <Typography variant="caption">60s</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              How often to update locations (shorter intervals use more battery)
            </Typography>
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
              {(() => {
                const memberLocation = locations.find(loc => loc.user_id === selectedMember.user_id);
                
                if (!memberLocation || !memberLocation.coordinates) {
                  return (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <LocationOffIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                      <Typography>
                        Location not shared by this member.
                      </Typography>
                    </Box>
                  );
                }
                
                const { coordinates, timestamp, battery_level, connection_type } = memberLocation;
                const distance = userLocation ? 
                  calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    coordinates.latitude,
                    coordinates.longitude
                  ) : null;
                
                return (
                  <Box>
                    <List>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <LocationIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary="Location" 
                          secondary={`Lat: ${coordinates.latitude.toFixed(6)}, Lng: ${coordinates.longitude.toFixed(6)}`} 
                        />
                      </ListItem>
                      
                      {distance && (
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'secondary.main' }}>
                              <NavigationIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary="Distance from you" 
                            secondary={formatDistance(distance)} 
                          />
                        </ListItem>
                      )}
                      
                      {coordinates.speed > 0 && (
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'success.main' }}>
                              <SpeedIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary="Speed" 
                            secondary={`${Math.round(coordinates.speed * 3.6)} km/h`} 
                          />
                        </ListItem>
                      )}
                      
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            <BatteryIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary="Battery" 
                          secondary={`${battery_level}%`} 
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <RefreshIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary="Last Updated" 
                          secondary={new Date(timestamp).toLocaleString()} 
                        />
                      </ListItem>
                    </List>
                  </Box>
                );
              })()}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenMemberDialog(false)}>Close</Button>
              {(() => {
                const memberLocation = locations.find(loc => loc.user_id === selectedMember.user_id);
                if (memberLocation && memberLocation.coordinates) {
                  return (
                    <Button 
                      color="primary"
                      onClick={() => {
                        centerMapOnLocation(memberLocation.coordinates);
                        setOpenMemberDialog(false);
                      }}
                    >
                      Show on Map
                    </Button>
                  );
                }
                return null;
              })()}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default LocationTracking;
