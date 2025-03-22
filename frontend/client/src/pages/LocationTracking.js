import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Badge,
  Box, 
  Typography, 
  Grid2, 
  Paper, 
  Button, 
  CircularProgress,
  AppBar,
  Toolbar,
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
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import api from '../services/api'; // Adjust the path as needed to point to your api.js file
import { useAuth } from '../contexts/AuthContext';
import 'mapbox-gl/dist/mapbox-gl.css';

// In a real implementation, we would use the actual Mapbox token
const MAPBOX_TOKEN = 'pk.dummy.token.for.prototype';

const LocationTracking = () => {
  const { groupId } = useParams();
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
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  
  useEffect(() => {
    fetchGroupDetails();
    initializeMap();
    startLocationTracking();
    
    // Cleanup function
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [groupId]);
  
  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, we would fetch the actual group and member locations
      // For the prototype, we'll simulate the data
      
      // Simulated API call for group details
      // const groupResponse = await api.get(`/api/groups/${groupId}`);
      // setGroup(groupResponse.data.group);
      
      // Simulated API call for member locations
      // const locationsResponse = await api.get(`/api/location/group/${groupId}`);
      // setLocations(locationsResponse.data.locations);
      
      // Simulate group data
      const mockGroup = {
        id: groupId,
        name: 'Mountain Explorers',
        description: 'A group for mountain skiing enthusiasts',
        members: [
          {
            user_id: user.user_id,
            username: user.username,
            profile_image_url: user.profile_image_url,
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
      
      // Simulate location data
      const mockLocations = [
        {
          user_id: user.user_id,
          username: user.username,
          coordinates: {
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
      
      setGroup(mockGroup);
      setMembers(mockGroup.members);
      setLocations(mockLocations);
      
      // Find user's location in the mock data
      const userLocationData = mockLocations.find(loc => loc.user_id === user.user_id);
      if (userLocationData) {
        setUserLocation(userLocationData.coordinates);
      }
      
      setError('');
    } catch (error) {
      console.error('Error fetching group details:', error);
      setError('Failed to load group details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const initializeMap = () => {
    // In a real implementation, we would initialize the Mapbox map
    // For the prototype, we'll simulate the map loading
    
    setTimeout(() => {
      setMapLoaded(true);
    }, 1500);
    
    // The real implementation would look something like this:
    /*
    if (!mapboxgl) return;
    
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
      
      // Add user markers, etc.
    });
    */
  };
  
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    
    // In a real implementation, we would actually track the user's location
    // For the prototype, we'll simulate location updates
    
    // The real implementation would look something like this:
    /*
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
        
        const newLocation = {
          coordinates: {
            latitude,
            longitude,
            accuracy,
            altitude,
            heading,
            speed
          },
          timestamp: new Date().toISOString()
        };
        
        setUserLocation(newLocation.coordinates);
        
        // Update the server with the new location
        api.post('/api/location/update', newLocation);
        
        // Update the map
        if (mapRef.current) {
          // Update user marker position
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setError('Failed to get your location. Please check your permissions.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );
    */
    
    // Simulate location updates
    const intervalId = setInterval(() => {
      if (userLocation && sharingLocation) {
        // Simulate small movement
        const newLocation = {
          latitude: userLocation.latitude + (Math.random() - 0.5) * 0.001,
          longitude: userLocation.longitude + (Math.random() - 0.5) * 0.001,
          accuracy: userLocation.accuracy,
          altitude: userLocation.altitude,
          heading: userLocation.heading,
          speed: Math.random() * 5
        };
        
        setUserLocation(newLocation);
        
        // Update locations array
        setLocations(prev => 
          prev.map(loc => 
            loc.user_id === user.user_id 
              ? { ...loc, coordinates: newLocation, timestamp: new Date().toISOString() } 
              : loc
          )
        );
      }
    }, 5000);
    
    // Cleanup
    return () => clearInterval(intervalId);
  };
  
  const handleLocationSharingToggle = async () => {
    const newSharingState = !sharingLocation;
    setSharingLocation(newSharingState);
    
    // In a real implementation, we would update the server
    try {
      // await api.put('/api/location/privacy', {
      //   privacy_level: newSharingState ? 'precise' : 'hidden',
      //   shared_with_group_ids: newSharingState ? [groupId] : []
      // });
    } catch (error) {
      console.error('Error updating location privacy:', error);
      // Revert the UI state if the API call fails
      setSharingLocation(!newSharingState);
    }
  };
  
  const handleProximityDistanceChange = (event, newValue) => {
    setProximityDistance(newValue);
  };
  
  const handleProximityAlertToggle = () => {
    setShowProximityAlerts(!showProximityAlerts);
  };
  
  const handleMemberClick = (member) => {
    setSelectedMember(member);
    setOpenMemberDialog(true);
  };
  
  const handleCenterMap = () => {
    // In a real implementation, we would center the map on the user's location
    // For the prototype, we'll just show a message
    alert('Map centered on your location');
  };
  
  const handleRefreshLocations = () => {
    fetchGroupDetails();
  };
  
  const getMemberLocation = (user_id) => {
    return locations.find(loc => loc.user_id === user_id);
  };
  
  const calculateDistance = (loc1, loc2) => {
    if (!loc1 || !loc2) return null;
    
    // Simple Haversine formula to calculate distance between two points
    const R = 6371e3; // Earth radius in meters
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    const distance = R * c; // in meters
    return distance;
  };
  
  const formatDistance = (distance) => {
    if (distance === null) return 'Unknown';
    
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(2)}km`;
    }
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            sx={{ mr: 2 }}
            onClick={() => navigate(`/groups/${groupId}`)}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {loading ? 'Loading...' : `Location Tracking - ${group?.name}`}
          </Typography>
          <IconButton
            color="inherit"
            onClick={handleRefreshLocations}
          >
            <RefreshIcon />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={() => setOpenSettingsDialog(true)}
          >
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Container sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      ) : (
        <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
          <Grid2 container spacing={3}>
            <Grid2 item xs={12} md={8}>
              <Paper 
                sx={{ 
                  p: 2, 
                  height: 500, 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Map
                  </Typography>
                  <Box>
                    <Tooltip title="Center map on your location">
                      <IconButton onClick={handleCenterMap}>
                        <MyLocationIcon />
                      </IconButton>
                    </Tooltip>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={sharingLocation}
                          onChange={handleLocationSharingToggle}
                          color="primary"
                        />
                      }
                      label={sharingLocation ? "Sharing Location" : "Not Sharing"}
                    />
                  </Box>
                </Box>
                
                <Box 
                  ref={mapContainerRef}
                  sx={{ 
                    flexGrow: 1, 
                    bgcolor: 'grey.200',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  {!mapLoaded ? (
                    <CircularProgress />
                  ) : (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, p: 2 }}>
                      <Typography variant="body1" align="center" sx={{ mb: 2 }}>
                        Map View (Prototype)
                      </Typography>
                      
                      {/* Simulated map with member positions */}
                      <Box 
                        sx={{ 
                          height: '100%', 
                          border: '1px solid #ccc',
                          borderRadius: 1,
                          position: 'relative',
                          bgcolor: '#e8f5e9'
                        }}
                      >
                        {locations.map((location) => {
                          const member = members.find(m => m.user_id === location.user_id);
                          const isCurrentUser = location.user_id === user.user_id;
                          
                          // Calculate relative position (this is just for the prototype)
                          const baseLatitude = 40.7128;
                          const baseLongitude = -74.0060;
                          const latDiff = location.coordinates.latitude - baseLatitude;
                          const lngDiff = location.coordinates.longitude - baseLongitude;
                          
                          const top = 50 - (latDiff * 5000);
                          const left = 50 + (lngDiff * 5000);
                          
                          return (
                            <Tooltip 
                              key={location.user_id}
                              title={`${member?.username || 'Unknown'} - ${formatTimestamp(location.timestamp)}`}
                            >
                              <Avatar
                                src={member?.profile_image_url}
                                sx={{
                                  position: 'absolute',
                                  top: `${top}%`,
                                  left: `${left}%`,
                                  width: isCurrentUser ? 40 : 32,
                                  height: isCurrentUser ? 40 : 32,
                                  border: isCurrentUser ? '3px solid blue' : '2px solid red',
                                  bgcolor: isCurrentUser ? 'primary.main' : 'secondary.main',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleMemberClick(member)}
                              >
                                {member?.username?.[0] || '?'}
                              </Avatar>
                            </Tooltip>
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid2>
            
            <Grid2 item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Group Members
                </Typography>
                <List>
                  {members.map((member) => {
                    const location = getMemberLocation(member.user_id);
                    const distance = location ? 
                      calculateDistance(
                        userLocation,
                        location.coordinates
                      ) : null;
                    
                    return (
                      <ListItem 
                        key={member.user_id}
                        button
                        onClick={() => handleMemberClick(member)}
                      >
                        <ListItemAvatar>
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={
                              location ? (
                                <Box
                                  component="span"
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: 'success.main',
                                    border: '1px solid white'
                                  }}
                                />
                              ) : (
                                <Box
                                  component="span"
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: 'grey.500',
                                    border: '1px solid white'
                                  }}
                                />
                              )
                            }
                          >
                            <Avatar src={member.profile_image_url}>
                              {member.username[0]}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={
                            <>
                              {member.username}
                              {member.user_id === user.user_id && ' (You)'}
                            </>
                          }
                          secondary={
                            <>
                              {location ? (
                                <>
                                  <Typography variant="body2" component="span">
                                    {formatTimestamp(location.timestamp)}
                                  </Typography>
                                  {member.user_id !== user.user_id && (
                                    <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                                      • {formatDistance(distance)} away
                                    </Typography>
                                  )}
                                </>
                              ) : (
                                'Location not available'
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
              
              {showProximityAlerts && (
                <Paper sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Proximity Alerts
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Get notified when group members are within {proximityDistance} meters of your location.
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography id="proximity-slider" gutterBottom>
                      Alert Distance: {proximityDistance}m
                    </Typography>
                    <Slider
                      aria-labelledby="proximity-slider"
                      value={proximityDistance}
                      onChange={handleProximityDistanceChange}
                      min={10}
                      max={1000}
                      step={10}
                    />
                  </Box>
                  
                  <Button 
                    variant="outlined" 
                    fullWidth
                    onClick={() => {
                      // In a real implementation, we would create proximity alerts
                      alert('Proximity alerts updated');
                    }}
                  >
                    Update Alerts
                  </Button>
                </Paper>
              )}
            </Grid2>
          </Grid2>
        </Container>
      )}
      
      {/* Settings Dialog */}
      <Dialog open={openSettingsDialog} onClose={() => setOpenSettingsDialog(false)}>
        <DialogTitle>Location Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={sharingLocation}
                  onChange={handleLocationSharingToggle}
                  color="primary"
                />
              }
              label={sharingLocation ? "Sharing your location" : "Not sharing your location"}
            />
            <Typography variant="body2" color="text.secondary">
              {sharingLocation 
                ? "Your location is visible to all group members" 
                : "Your location is hidden from all group members"}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showProximityAlerts}
                  onChange={handleProximityAlertToggle}
                  color="primary"
                />
              }
              label="Proximity Alerts"
            />
            <Typography variant="body2" color="text.secondary">
              {showProximityAlerts 
                ? "You will receive alerts when group members are nearby" 
                : "You will not receive proximity alerts"}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettingsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Member Details Dialog */}
      {selectedMember && (
        <Dialog open={openMemberDialog} onClose={() => setOpenMemberDialog(false)}>
          <DialogTitle>{selectedMember.username}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar 
                src={selectedMember.profile_image_url}
                sx={{ width: 64, height: 64, mr: 2 }}
              >
                {selectedMember.username[0]}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {selectedMember.username}
                  {selectedMember.user_id === user.user_id && ' (You)'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Member since {new Date().toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
            
            {selectedMember.user_id !== user.user_id && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Location Details
                </Typography>
                
                {(() => {
                  const location = getMemberLocation(selectedMember.user_id);
                  if (!location) {
                    return (
                      <Alert severity="info">
                        Location information not available
                      </Alert>
                    );
                  }
                  
                  const distance = calculateDistance(
                    userLocation,
                    location.coordinates
                  );
                  
                  return (
                    <Box>
                      <Typography variant="body1" gutterBottom>
                        Distance: {formatDistance(distance)}
                      </Typography>
                      <Typography variant="body2">
                        Last updated: {formatTimestamp(location.timestamp)}
                      </Typography>
                      <Typography variant="body2">
                        Battery: {location.battery_level}%
                      </Typography>
                      <Typography variant="body2">
                        Connection: {location.connection_type}
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Button 
                          variant="outlined" 
                          startIcon={<MicIcon />}
                          onClick={() => {
                            setOpenMemberDialog(false);
                            navigate(`/audio-session/${groupId}`);
                          }}
                          sx={{ mr: 1 }}
                        >
                          Call
                        </Button>
                        <Button 
                          variant="outlined"
                          onClick={() => {
                            // In a real implementation, we would center the map on this member
                            setOpenMemberDialog(false);
                            alert(`Map centered on ${selectedMember.username}`);
                          }}
                        >
                          Center on Map
                        </Button>
                      </Box>
                    </Box>
                  );
                })()}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenMemberDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default LocationTracking;
