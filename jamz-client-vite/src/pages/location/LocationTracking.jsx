// jamz-client-vite/src/pages/location/LocationTracking.jsx
// LocationTracking.jsx - A component for tracking and displaying group member locations in real-time

import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api, { MAPBOX_TOKEN } from '../../services/api';
import mapboxgl from 'mapbox-gl';
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
  Collapse
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  MyLocation as MyLocationIcon,
  GpsFixed as GpsFixedIcon,
  Navigation as NavigationIcon,
  LocationOn as LocationIcon,
  LocationOff as LocationOffIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  People as PeopleIcon,
  Close as CloseIcon,
  Satellite as SatelliteIcon,
  Place as PlaceIcon
} from '@mui/icons-material';

const LocationTracking = () => {

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
  const [sharingLocation, setSharingLocation] = useState(false);
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
  const [draggingPlaceId, setDraggingPlaceId] = useState(null);
  const [useBestReading, setUseBestReading] = useState(false);
  const [gpsReadingsBuffer, setGpsReadingsBuffer] = useState([]);
  const [accuracyThreshold, setAccuracyThreshold] = useState(100);
  const [places, setPlaces] = useState([]);
  
  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const pendingLocationsRef = useRef(null);
  const watchIdRef = useRef(null);
  const locationDataRef = useRef(null);
  const centerMarkerRef = useRef(null);
  
  // Get parameters and context
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
      const enrichedLocations = locationData.map(location => {
        const member = members.find(m => m.user_id === location.user_id);
        
        // Special handling for current user - always use their real username
        if (location.user_id === user?.id) {
          return {
            ...location,
            username: user?.username || 'CurrentUser',
            first_name: user?.first_name || null
          };
        }

        // Only include users that have proper member data
        if (member) {
          return {
            ...location,
            username: member.username,
            first_name: member.first_name
          };
        }

        // Skip users without member data (return null to filter out later)
        return null;
      }).filter(location => location !== null); // Remove null entries

      setLocations(enrichedLocations);

      // Update map markers - include current user location if available
      let allLocations = enrichedLocations;
      if (userLocation) {
        const currentUserLocation = {
          user_id: user?.id || 'current-user',
          username: user?.username || 'CurrentUser',
          first_name: user?.first_name || null,
          coordinates: userLocation,
          timestamp: new Date().toISOString(),
          battery_level: 85
        };
        // Filter out any existing current user location from API data to avoid duplicates
        const filteredEnrichedLocations = enrichedLocations.filter(loc => loc.user_id !== (user?.id || 'current-user'));
        allLocations = [currentUserLocation, ...filteredEnrichedLocations];
      }

      // Add places if they should be shown
      if (showPlaces) {
        allLocations = [...allLocations, ...places];
      }

      updateMapMarkers(allLocations);

      // Check for proximity alerts
      if (showProximityAlerts && userLocation) {
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
      let enrichedLocations = locationData.map(location => {
        const member = (membersData || members).find(m => m.user_id === location.user_id);
        
        // Special handling for current user - always use their real username
        if (location.user_id === user?.id) {
          return {
            ...location,
            username: user?.username || 'CurrentUser',
            first_name: user?.first_name || null
          };
        }

        // Only include users that have proper member data
        if (member) {
          return {
            ...location,
            username: member.username,
            first_name: member.first_name
          };
        }

        // Skip users without member data (return null to filter out later)
        return null;
      }).filter(location => location !== null); // Remove null entries

      setLocations(enrichedLocations);

      // Update map markers - include current user location if available
      let allLocations = enrichedLocations;
      if (userLocation) {
        const currentUserLocation = {
          user_id: user?.id || 'current-user',
          username: user?.username || 'CurrentUser',
          first_name: user?.first_name || null,
          coordinates: userLocation,
          timestamp: new Date().toISOString(),
          battery_level: 85
        };
        // Filter out any existing current user location from API data to avoid duplicates
        const filteredEnrichedLocations = enrichedLocations.filter(loc => loc.user_id !== (user?.id || 'current-user'));
        allLocations = [currentUserLocation, ...filteredEnrichedLocations];
      }

      // Add places if they should be shown
      if (showPlaces) {
        allLocations = [...allLocations, ...places];
      }

      if (!placeSelectionMode) {
        updateMapMarkers(allLocations);
      }

      // Check for proximity alerts
      if (showProximityAlerts && userLocation) {
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
            latitude: 39.7392 + (Math.random() - 0.5) * 0.01, // Denver area with small random offset
            longitude: -104.9903 + (Math.random() - 0.5) * 0.01,
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
            latitude: 39.7392 + (Math.random() - 0.5) * 0.01,
            longitude: -104.9903 + (Math.random() - 0.5) * 0.01,
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
            latitude: 39.7392 + (Math.random() - 0.5) * 0.01,
            longitude: -104.9903 + (Math.random() - 0.5) * 0.01,
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
            latitude: 39.7392 + (Math.random() - 0.5) * 0.01,
            longitude: -104.9903 + (Math.random() - 0.5) * 0.01,
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
            latitude: 39.7392 + (Math.random() - 0.5) * 0.01,
            longitude: -104.9903 + (Math.random() - 0.5) * 0.01,
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

  // Initialize map when component mounts
  useEffect(() => {
    // console.log('LocationTracking component mounted, initializing map');
    initializeMap();
  }, []);

  // Fetch group details when component mounts
  useEffect(() => {
    // console.log('LocationTracking component mounted, fetching group details');
    fetchGroupDetails();
  }, []);

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
            user_id: user?.id || 'current-user',
            username: user?.username || 'CurrentUser',
            first_name: user?.first_name || null,
            coordinates: userLocation,
            timestamp: new Date().toISOString(),
            battery_level: 85
          }] : [];
          
          // Combine member locations, user location, and places
          const allLocations = [...currentUserLoc, ...memberLocations, ...fetchedPlaces];
          
          // Update markers to include places (but hide member locations during place selection mode)
          if (!placeSelectionMode) {
            updateMapMarkers(allLocations);
          } else {
            // During place selection mode, only show places
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
            user_id: user?.id || 'current-user',
            username: user?.username || 'CurrentUser',
            first_name: user?.first_name || null,
            coordinates: userLocation,
            timestamp: new Date().toISOString(),
            battery_level: 85
          }] : [];
          const allLocations = [...currentUserLoc, ...locations];
          updateMapMarkers(allLocations);
        }
      }
    };
    
    updatePlacesOnMap();
  }, [showPlaces, groupId, members, userLocation]);
  
  // Handle place selection mode changes
  useEffect(() => {
    if (placeSelectionMode && mapRef.current) {
      createCenterMarker();
    } else {
      // Always try to remove center marker when not in place selection mode
      removeCenterMarker();
    }
    
    // Cleanup on unmount
    return () => {
      removeCenterMarker();
    };
  }, [placeSelectionMode]);

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
    // If we have first and last name, use "First LastInitial."
    if (firstName && lastName) {
      return `${firstName.trim()} ${lastName.trim().charAt(0).toUpperCase()}.`;
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
      
      // Add current user if available
      if (userLocation) {
        const currentUserLoc = {
          user_id: user?.id || 'current-user',
          username: user?.username || 'CurrentUser',
          first_name: user?.first_name || null,
          coordinates: userLocation,
          timestamp: new Date().toISOString(),
          battery_level: 85
        };
        if (!seen.has(String(currentUserLoc.user_id))) {
          merged.push(currentUserLoc);
          seen.add(String(currentUserLoc.user_id));
        }
      }

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
        zoom: 13
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
            updateMapMarkers(allLocations);
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
            const center = map.getCenter();
            generateRuntimeData({ lng: center.lng, lat: center.lat });
          } catch (e) {
            console.error('Error during map moveend runtime data generation', e);
          }
        };

        // Map click to add place at clicked location
        map.on('click', (e) => {
          try {
            const { lngLat } = e;
            createPlaceAtLocation(lngLat.lat, lngLat.lng);
          } catch (err) {
            console.error('Failed to create place at clicked location', err);
          }
        });

        // Comment out moveend event to anchor pins at geographic coordinates
        // map.on('moveend', onMoveEnd);

        // Add zoomend event to update locations when zooming
        map.on('zoomend', () => {
          fetchMemberLocationsAndUpdateMarkers();
        });

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
                user_id: user?.id || 'current-user',
                username: user?.username || 'CurrentUser',
                first_name: user?.first_name || null,
                coordinates: userLocation,
                timestamp: new Date().toISOString(),
                battery_level: 85
              }] : [];
              const allLocations = [...currentUserLoc, ...locations, ...fetchedPlaces];
              updateMapMarkers(allLocations);
            }
          }).catch(error => {
            console.warn('Failed to load places on map load:', error);
          });
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
    
    if (mapRef.current && location && location.latitude && location.longitude) {
      console.log('Flying to:', [location.longitude, location.latitude]);
      mapRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 15,
        essential: true
      });
    } else {
      console.log('Cannot center map - missing map ref or location data');
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
  const handleMarkerClick = useCallback((location) => {
    setSelectedLocation(location);
    setOpenLocationDialog(true);
  }, []);
  
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
    centerElement.style.backgroundColor = '#2196f3';
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
  
  // Toggle place selection mode
  const togglePlaceSelectionMode = () => {
    const newMode = !placeSelectionMode;
    setPlaceSelectionMode(newMode);
    
    if (newMode) {
      // Enter place selection mode - create center marker at current map center
      createCenterMarker();
      // Don't force centering on user location - let user select any location on map
    } else {
      // Exit place selection mode - record the place
      if (mapRef.current && centerMarkerRef.current) {
        const center = mapRef.current.getCenter();
        createPlaceAtLocation(center.lat, center.lng);
      }
      removeCenterMarker();
    }
  };
  
  // Create a place at the specified location
  const createPlaceAtLocation = async (lat, lng) => {
    try {
      // Prompt for place name
      const placeName = prompt('Enter a name for this place:', 'New Place');
      if (!placeName || placeName.trim() === '') {
        return; // User cancelled or entered empty name
      }
      
      const placeData = {
        name: placeName.trim(),
        latitude: lat,
        longitude: lng
      };
      
      const response = await api.post(`/groups/${groupId}/places`, placeData);
      
      if (response.data.success) {
        console.log('Place created successfully:', response.data.place);
        
        // Immediately add the new place to the map
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
        
        // Add to places state and update markers
        setPlaces(prevPlaces => [...prevPlaces, newPlace]);
        updateMapMarkers([...locations, newPlace]);
        
        // Enable places display
        setShowPlaces(true);
        
        // Show success message
        alert(`Place "${placeName}" created successfully!`);
      } else {
        throw new Error(response.data.message || 'Failed to create place');
      }
      
    } catch (error) {
      console.error('Error creating place:', error);
      alert('Failed to create place. Please try again.');
    }
  };
  
  // Delete a place
  const deletePlace = async (placeId) => {
    try {
      if (!confirm('Are you sure you want to delete this place?')) {
        return;
      }
      
      const response = await api.delete(`/places/${placeId}`);
      
      if (response.data.success) {
        console.log('Place deleted successfully:', placeId);
        
        // Remove the place from local state
        setPlaces(prevPlaces => 
          prevPlaces.filter(place => !(place.raw && place.raw._id === placeId))
        );
        
        // Close the dialog
        setOpenLocationDialog(false);
        
        // Show success message
        alert('Place deleted successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to delete place');
      }
      
    } catch (error) {
      console.error('Error deleting place:', error);
      alert('Failed to delete place. Please try again.');
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

  // Update markers when dragging mode changes
  useEffect(() => {
    if (mapRef.current && (locations.length > 0 || (showPlaces && places.length > 0))) {
      const allLocations = showPlaces ? [...locations, ...places] : locations;
      updateMapMarkers(allLocations);
    }
  }, [draggingPlaceId, locations, places, showPlaces]);

  // Update map markers for all members
  const updateMapMarkers = (locationData) => {
    // If the map isn't initialized yet, queue the locations for later
    if (!mapRef.current || !mapboxgl) {
      pendingLocationsRef.current = locationData;
      return;
    }

    const newMarkerKeys = new Set();

    // Update existing markers or create new ones
    locationData.forEach((location, idx) => {
      if (!location.coordinates) {
        return;
      }
      
      const { latitude, longitude } = location.coordinates;
      const markerKey = location.place ? `place-${location.raw._id}` : location.user_id;

      newMarkerKeys.add(markerKey);

      let marker = markersRef.current[markerKey];

      const shouldBeDraggable = location.place && location.raw && location.raw._id === draggingPlaceId;

      // For places, always recreate markers to ensure proper positioning
      if (marker && location.place) {
        marker.remove();
        marker = null;
      }

      if (marker && (!shouldBeDraggable || marker.getLngLat().lng !== longitude || marker.getLngLat().lat !== latitude)) {
        // Update position for non-draggable markers, or re-create if it should be draggable
        if (!shouldBeDraggable) {
          marker.setLngLat([longitude, latitude]);
        } else {
          // Re-create draggable markers to ensure proper draggable state
          marker.remove();
          marker = null;
        }
      }

      if (!marker) {
        // Create new marker - simple anchored pin
        const markerEl = document.createElement('div');
        markerEl.style.display = 'flex';
        markerEl.style.flexDirection = 'column';
        markerEl.style.alignItems = 'center';
        markerEl.style.cursor = 'pointer';

        // Circle part
        const circleEl = document.createElement('div');
        circleEl.style.width = '24px';
        circleEl.style.height = '24px';
        circleEl.style.borderRadius = '50%';
        circleEl.style.backgroundColor = location.place ? 'green' : 'orange';
        circleEl.style.border = '2px solid white';
        circleEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        circleEl.style.display = 'flex';
        circleEl.style.alignItems = 'center';
        circleEl.style.justifyContent = 'center';
        circleEl.style.color = 'white';
        circleEl.style.fontSize = '12px';
        circleEl.style.fontWeight = 'bold';

        // Add initial
        const firstInitial = location.place ? '📍' : (location.username ? location.username.charAt(0).toUpperCase() : '?');
        circleEl.textContent = firstInitial;

        // Spike part
        const spikeEl = document.createElement('div');
        spikeEl.style.width = '12px';
        spikeEl.style.height = '8px';
        spikeEl.style.backgroundColor = location.place ? 'green' : 'orange';
        spikeEl.style.clipPath = 'polygon(50% 100%, 0% 0%, 100% 0%)';

        markerEl.appendChild(circleEl);
        markerEl.appendChild(spikeEl);

        // Add hover details
        const displayName = location.place ? location.username : formatDisplayName(location.username, location.first_name);
        const lastUpdate = new Date(location.timestamp).toLocaleString();
        markerEl.title = `${displayName}\nLast updated: ${lastUpdate}`;

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
                alert('Failed to update place location. Please try again.');
                exitPlaceDraggingMode();
              }
            }
          });
        }

        // Add click handler only for non-draggable markers
        if (!shouldBeDraggable) {
          markerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            handleMarkerClick(location);
          });
        }
        
        // Store the marker
        markersRef.current[markerKey] = marker;
      }
    });

    // Remove markers that are no longer in the data
    Object.keys(markersRef.current).forEach(markerKey => {
      if (!newMarkerKeys.has(markerKey)) {
        const marker = markersRef.current[markerKey];
        if (marker && typeof marker.remove === 'function') {
          marker.remove();
        }
        delete markersRef.current[markerKey];
      }
    });
  };
  
  // Update map markers including current user location
  const updateMapMarkersWithUserLocation = (userLocationData) => {
    // Create current user location object
    const currentUserLocation = {
      user_id: user?.id || 'current-user',
      username: user?.username || 'CurrentUser',
      first_name: user?.first_name || null,
      coordinates: userLocationData,
      timestamp: new Date().toISOString(),
      battery_level: 85 // Default battery level
    };
    
    // Filter out any existing current user location from API data to avoid duplicates
    const filteredLocations = locations.filter(loc => loc.user_id !== (user?.id || 'current-user'));
    
    // Combine current user location with existing member locations and places if shown
    const allLocations = showPlaces 
      ? [currentUserLocation, ...filteredLocations, ...places]
      : [currentUserLocation, ...filteredLocations];
    
    // Update markers with combined locations (but hide during place selection mode)
    if (!placeSelectionMode) {
      updateMapMarkers(allLocations);
    }
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
        elevation={0}
        sx={{ 
          opacity: controlsOpacity,
          backdropFilter: 'blur(2px)',
          bgcolor: 'rgba(0,0,0,0.7)',
          color: 'text.primary',
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
              onClick={fetchMemberLocationsAndUpdateMarkers}
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

          <Tooltip title={satelliteMode ? "Switch to Streets View" : "Switch to Satellite View"}>
            <IconButton 
              color={satelliteMode ? "primary" : "inherit"}
              onClick={() => toggleSatelliteMode(!satelliteMode)}
            >
              <SatelliteIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={showPlaces ? "Hide Places" : "Show Places"}>
            <IconButton 
              color={showPlaces ? "secondary" : "inherit"}
              onClick={() => setShowPlaces(!showPlaces)}
            >
              <PlaceIcon />
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
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            color: 'purple',
            boxShadow: 2,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.3)',
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
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            color: 'purple',
            boxShadow: 2,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.3)',
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
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            color: 'purple',
            boxShadow: 2,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.3)',
            }
          }}
          onClick={() => {
            if (userLocation) {
              // If we already have location, center immediately
              centerMapOnLocation(userLocation);
            } else if (!sharingLocation) {
              // If location sharing is not enabled, start it
              toggleLocationSharing();
              // The centering will happen automatically when location is acquired
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
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            color: 'purple',
            boxShadow: 2,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.3)',
            }
          }}
          onClick={togglePlaceSelectionMode}
        >
          <PlaceIcon />
        </IconButton>
      </Tooltip>
      
      {/* Alerts */}
      <Box sx={{ position: 'absolute', top: 140, left: 16, right: 16, zIndex: 10 }}>
        {isGettingLocation && (
          <Alert severity="info" sx={{ opacity: controlsOpacity, mb: 1 }}>
            <AlertTitle>Getting Your Location</AlertTitle>
            Please wait while we determine your position...
          </Alert>
        )}
        
        {locationInfo && (
          <Alert severity="info" sx={{ opacity: controlsOpacity, mb: 1 }}>
            {locationInfo}
          </Alert>
        )}
        
        {isRateLimited && (
          <Alert severity="warning" sx={{ opacity: controlsOpacity, mb: 1 }}>
            <AlertTitle>Rate Limit Detected</AlertTitle>
            Too many location requests. Retrying in {retryDelay} seconds.
          </Alert>
        )}
        
        {locationError && (
          <Alert severity="error" sx={{ opacity: controlsOpacity, mb: 1 }}>
            {locationError}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ opacity: controlsOpacity, mb: 1 }}>
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
                  component="li"
                  secondaryAction={
                    <Chip 
                      label={distance ? formatDistance(distance) : 'Unknown'}
                      color={distance && distance <= proximityDistance ? "success" : "default"}
                      size="small"
                    />
                  }
                >
                  <ListItemButton onClick={() => handleMemberClick(member)}>
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
                  color="primary"
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
      
      {/* Location Details Dialog */}
      <Dialog 
        open={openLocationDialog} 
        onClose={() => setOpenLocationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedLocation && (
          <>
            <DialogTitle>
              {selectedLocation.place ? `📍 ${selectedLocation.username || 'Place'}` : `${selectedLocation.username || 'Unknown'}`}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 80, 
                    height: 80,
                    mb: 1,
                    bgcolor: selectedLocation.place ? 'success.main' : 
                             (selectedLocation.user_id === (user?.id || 'current-user') ? 'primary.main' : 'secondary.main')
                  }}
                >
                  {selectedLocation.place ? '📍' : (selectedLocation.username ? selectedLocation.username.charAt(0).toUpperCase() : '?')}
                </Avatar>
                <Typography variant="h6">
                  {selectedLocation.place ? (selectedLocation.username || 'Unknown Place') : (selectedLocation.username || 'Unknown')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedLocation.place ? 'Saved Location' : 
                   (selectedLocation.user_id === (user?.id || 'current-user') ? 'Your Location' : 'Group Member')}
                </Typography>
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
              <Button onClick={() => setOpenLocationDialog(false)}>Close</Button>
              {selectedLocation.place && selectedLocation.raw && (
                <Button 
                  color="error"
                  onClick={() => deletePlace(selectedLocation.raw._id)}
                >
                  DELETE
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
    </Box>
  );
};

export default LocationTracking;
