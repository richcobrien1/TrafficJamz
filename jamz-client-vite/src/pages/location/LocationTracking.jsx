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
import PlaceControls from '../../components/PlaceControls';
import {
  ArrowBack as ArrowBackIcon,
  MyLocation as MyLocationIcon,
  LocationOn as LocationIcon,
  LocationOff as LocationOffIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  Navigation as NavigationIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  People as PeopleIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const LocationTracking = () => {

  // Default coordinates provided by user (used when no location available)
  const DEFAULT_LAT = 39.573640;
  const DEFAULT_LNG = -104.882029;
    
          
      
  // Periodic fetch for member locations with basic rate-limit/backoff handling
  useEffect(() => {
    const fetchWithRateLimitProtection = async () => {
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
      // Return data for callers that want to compose additional runtime data
      return locationData;
    } catch (error) {
      console.error('Error fetching member locations:', error);
      return [];
    }
  };

  // If navigated here with state requesting openCreatePlace, auto-open the add-place dialog
  useEffect(() => {
    try {
      const navState = window.history.state && window.history.state.state ? window.history.state.state : null;
      if (navState && navState.openCreatePlace) {
        const openAt = userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : (mapRef.current ? (() => { const c = mapRef.current.getCenter(); return { lat: c.lat, lng: c.lng }; })() : null);
        if (openAt) {
          window.dispatchEvent(new CustomEvent('tj:open-place-dialog', { detail: openAt }));
        }
      }
    } catch (e) {
      // ignore
    }
  }, [userLocation]);

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
      resolve(pos);
    }, (err) => {
      if (timedOut) return;
      clearTimeout(to);
      reject(err);
    }, { enableHighAccuracy: true, maximumAge: 30000, timeout });
  });

  // Compose runtime data: member locations, user's GPS location, and nearby places
  const generateRuntimeData = async (center) => {
    try {
      // Ensure member locations are fresh
      const membersData = await fetchMemberLocations();

      // Attempt to get the user's current GPS position (non-blocking)
      let userPos = null;
      try {
        const p = await getCurrentPositionAsync(6000);
        userPos = {
          user_id: user?.id || 'current-user',
          username: user?.username || 'You',
          coordinates: {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy || 0,
            altitude: p.coords.altitude || 0,
            heading: p.coords.heading || 0,
            speed: p.coords.speed || 0
          },
          timestamp: new Date().toISOString(),
          battery_level: null
        };
        setUserLocation(userPos.coordinates);
      } catch (e) {
        // ignore geolocation failures; there's already a fallback elsewhere
      }

      // Fetch nearby places around the given center
      const placeResults = await fetchPlacesAround(center.lng, center.lat, 6);

      // Merge member locations, user position (de-dup by user_id), and places
      const merged = [];
      const seen = new Set();
      (membersData || []).forEach(m => { seen.add(String(m.user_id)); merged.push(m); });
      if (userPos && !seen.has(String(userPos.user_id))) { merged.push(userPos); seen.add(String(userPos.user_id)); }
      (placeResults || []).forEach(p => { if (!seen.has(p.user_id)) merged.push(p); });

      // Also fetch backend places and include them (places may be separate from Mapbox POI results)
      try {
        const backendPlaces = await fetchPlacesForGroup();
        backendPlaces.forEach(bp => { if (!seen.has(bp.user_id)) { merged.push(bp); seen.add(bp.user_id); } });
      } catch (e) {
        // ignore
      }

      setLocations(merged);
      updateMapMarkers(merged);
    } catch (e) {
      console.error('Error generating runtime data:', e);
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
        center: [DEFAULT_LNG, DEFAULT_LAT], // Default to user-provided location
        zoom: 13
      });
      
      map.on('load', () => {
        setMapLoaded(true);
        mapRef.current = map;
        // expose map globally for PlaceControls to read center and for external triggers
        try { window.__TJ_MAP__ = map; } catch (e) { /* ignore */ }
        
        // Add user location marker if available
        if (userLocation) {
          centerMapOnLocation(userLocation);
        }
        
        // Add markers for all members (or flush any pending queued locations)
        if (pendingLocationsRef.current) {
          console.debug('Flushing pending locations to map', pendingLocationsRef.current);
          updateMapMarkers(pendingLocationsRef.current);
          pendingLocationsRef.current = null;
        } else if (locations.length > 0) {
          updateMapMarkers(locations);
        }

        // No automatic DEV fallback markers here; map will render actual member locations and places from backend
        
        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        map.addControl(new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }), 'bottom-right');

        // When the map stops moving, regenerate runtime data (members + places + user pos)
        const onMoveEnd = () => {
          try {
            const center = map.getCenter();
            generateRuntimeData({ lng: center.lng, lat: center.lat });
          } catch (e) {
            console.error('Error during map moveend runtime data generation', e);
          }
        };

        // Map click to open Add Place dialog with clicked coordinates
        map.on('click', (e) => {
          try {
            const { lngLat } = e;
            window.dispatchEvent(new CustomEvent('tj:open-place-dialog', { detail: { lat: lngLat.lat, lng: lngLat.lng } }));
          } catch (err) {
            console.error('Failed to dispatch open-place-dialog', err);
          }
        });

        map.on('moveend', onMoveEnd);

        // Initial runtime data generation at map center
        try {
          const c = map.getCenter();
          generateRuntimeData({ lng: c.lng, lat: c.lat });
        } catch (e) {
          console.error('Initial runtime data generation failed', e);
        }
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapLoaded(true); // Set to true anyway to show the UI
    }
  };

  // Re-fetch places when signaled (from PlaceControls or other parts)
  useEffect(() => {
    const handler = () => {
      console.debug('tj:places:changed - refetching places');
      // regenerate data to include backend places
      if (mapRef.current) {
        const c = mapRef.current.getCenter();
        generateRuntimeData({ lng: c.lng, lat: c.lat });
      } else {
        // fallback to member fetch + places
        fetchMemberLocations().then(async (md) => {
          const backendPlaces = await fetchPlacesForGroup();
          const merged = [...(md || []), ...backendPlaces];
          setLocations(merged);
          updateMapMarkers(merged);
        });
      }
    };

    window.addEventListener('tj:places:changed', handler);
    return () => window.removeEventListener('tj:places:changed', handler);
  }, [groupId]);
  
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
    console.debug('updateMapMarkers called with', locationData);

    // If the map isn't initialized yet, queue the locations for later
    if (!mapRef.current || !mapboxgl) {
      console.debug('Map not ready - queuing locations', locationData);
      pendingLocationsRef.current = locationData;
      return;
    }

    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
  const labelCollisionItems = [];
    
    // Add new markers
    locationData.forEach((location, idx) => {
      if (!location.coordinates) return;
      
      const { latitude, longitude } = location.coordinates;
      
  console.debug('Creating marker for', location.user_id, location.username, latitude, longitude);

      // Build a compound marker element: label above pin with a small spike for visual anchoring
      const wrapper = document.createElement('div');
      wrapper.className = 'location-marker-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';
      wrapper.style.pointerEvents = 'auto';

  // Label element (above pin)
    const labelEl = document.createElement('div');
      labelEl.className = location.place ? 'location-label place-label' : 'location-label';
      // Prefer first_name when available, otherwise username or user_id
      const labelText = (location.first_name && location.first_name.trim()) ? location.first_name.trim() : (location.username || location.user_id || 'Unknown');
      labelEl.textContent = labelText;
  labelEl.style.background = 'white';
  labelEl.style.padding = '4px 10px';
  labelEl.style.borderRadius = '14px';
  labelEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
  labelEl.style.fontSize = '13px';
  labelEl.style.color = '#111';
  labelEl.style.whiteSpace = 'nowrap';
  labelEl.style.pointerEvents = 'none'; // allow clicks to reach the pin
  labelEl.style.transition = 'transform 140ms ease, box-shadow 140ms ease';
      // Small stagger to reduce label collision
      const stagger = Math.min(idx, 4) * -6; // up to -24px
      labelEl.style.transform = `translateY(${stagger}px)`;

  // Pin element (circle with initial)
      const pinEl = document.createElement('div');
      pinEl.className = 'location-marker';
  // Slightly larger pins for places
  pinEl.style.width = location.place ? '36px' : '32px';
  pinEl.style.height = location.place ? '36px' : '32px';
  pinEl.style.borderRadius = '50%';
  // Use distinct color for places vs users
  pinEl.style.backgroundColor = location.place ? '#388e3c' : (location.user_id === (user?.id || 'current-user') ? '#1976d2' : '#ff9800');
  pinEl.style.border = '2px solid white';
  pinEl.style.boxShadow = '0 4px 10px rgba(0,0,0,0.18)';
  pinEl.style.cursor = 'pointer';
  pinEl.style.display = 'flex';
  pinEl.style.justifyContent = 'center';
  pinEl.style.alignItems = 'center';
  pinEl.style.transition = 'transform 160ms ease, box-shadow 160ms ease';

  const initial = document.createElement('span');
  const nameForInitial = (location.first_name && location.first_name.trim()) ? location.first_name.trim() : ((location.username || String(location.user_id || '')).trim());
  // Use a map-pin emoji for places instead of initial
  initial.textContent = location.place ? '📍' : (nameForInitial ? nameForInitial.charAt(0).toUpperCase() : '?');
      initial.style.color = 'white';
      initial.style.fontWeight = 'bold';
  initial.style.fontSize = '14px';
      pinEl.appendChild(initial);

      // Spike (triangle) to visually indicate the map anchor point
      const spike = document.createElement('div');
      spike.className = 'location-pin-spike';
      spike.style.width = '0';
      spike.style.height = '0';
      spike.style.borderLeft = '6px solid transparent';
      spike.style.borderRight = '6px solid transparent';
      spike.style.borderTop = `8px solid ${location.place ? '#2e7d32' : (location.user_id === (user?.id || 'current-user') ? '#2196f3' : '#ff9800')}`;
  spike.style.marginTop = '2px';

  // Compose wrapper: label on top, then pin, then spike
      wrapper.appendChild(labelEl);
      wrapper.appendChild(pinEl);
      wrapper.appendChild(spike);

      // Hover interactions: enlarge pin and lift label
      pinEl.addEventListener('mouseenter', () => {
        pinEl.style.transform = 'scale(1.08)';
        labelEl.style.transform = `translateY(${stagger - 6}px) scale(1.03)`;
        labelEl.style.boxShadow = '0 4px 10px rgba(0,0,0,0.18)';
      });
      pinEl.addEventListener('mouseleave', () => {
        pinEl.style.transform = 'scale(1)';
        labelEl.style.transform = `translateY(${stagger}px)`;
        labelEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)';
      });

      // Create and add the marker - anchor at the bottom so spike points to coordinate
      // Use a slight negative Y offset so the spike visually points to the coordinate
      const popupHtml = location.place ?
        `<strong>Place: ${location.username || 'Unknown'}</strong><br>
         ${location.raw && location.raw.address ? `${location.raw.address}<br>` : ''}
         Last updated: ${location.timestamp ? new Date(location.timestamp).toLocaleTimeString() : 'Unknown'}`
        :
        `<strong>${location.username || 'Unknown'}</strong><br>
         Last updated: ${location.timestamp ? new Date(location.timestamp).toLocaleTimeString() : 'Unknown'}<br>
         ${location.coordinates && location.coordinates.speed > 0 ? `Speed: ${Math.round(location.coordinates.speed * 3.6)} km/h<br>` : ''}
         Battery: ${location.battery_level || 'N/A'}%`;

      const marker = new mapboxgl.Marker(wrapper, { anchor: 'bottom', offset: [0, -8] })
        .setLngLat([longitude, latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
        .addTo(mapRef.current);

      // Keep a reference to the marker so it can be removed/updated later
      const markerKey = `${location.user_id}__${idx}`;
      markersRef.current[markerKey] = marker;

      // If this is the current user, open the popup briefly
      if (location.user_id === (user?.id || 'current-user')) {
        try {
          marker.togglePopup();
        } catch (e) {
          // ignore popup toggle errors
        }
      }
      // Collect label info for collision avoidance
      try {
        const point = mapRef.current.project([longitude, latitude]);
        labelCollisionItems.push({
          labelEl,
          x: point.x,
          y: point.y,
          width: labelEl.offsetWidth || 80,
          height: labelEl.offsetHeight || 20,
          idx
        });
      } catch (e) {
        // fail silently if projection not available
      }
    });

    // Simple collision avoidance: horizontal stacking around marker screen x
    if (labelCollisionItems.length > 1 && mapRef.current) {
      // Sort by x so we handle left-to-right
      labelCollisionItems.sort((a, b) => a.x - b.x);
      const spacing = 8; // px between labels
      for (let i = 0; i < labelCollisionItems.length; i++) {
        const base = labelCollisionItems[i];
        // try to place label centered at its x; if overlap with previous, shift to the right
        let offsetX = 0;
        if (i > 0) {
          const prev = labelCollisionItems[i - 1];
          const prevRight = prev.x + prev.width / 2 + prev._offsetX || prev.x + prev.width / 2;
          const curLeftDesired = base.x - base.width / 2;
          if (curLeftDesired < prevRight + spacing) {
            offsetX = (prevRight + spacing) - (base.x - base.width / 2);
          }
        }
        // Apply alternating small vertical nudge to reduce exact stacking
        const verticalNudge = (base.idx % 2 === 0) ? -6 : -12;
        base._offsetX = offsetX;
        // Apply transform (keep existing translateY stagger)
        const existingTranslateY = base.labelEl.style.transform || '';
        // Remove any translateX portion from existing transform
        const newTransform = `${existingTranslateY.replace(/translateX\([^)]*\)/, '').trim()} translateX(${offsetX}px)`;
        base.labelEl.style.transform = newTransform + ` translateY(${verticalNudge}px)`;
      }
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
            zIndex: 1,
            pointerEvents: 'none'
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

          {/* Debug Locations button removed - use real backend data and PlaceControls to add places */}

                    {/* Show Test Markers immediately (runtime helper) */}
                    <Tooltip title="Show Test Markers">
                      <IconButton
                        color="inherit"
                        onClick={() => {
                          const now = new Date().toISOString();
                          const testMarkers = [
                            { user_id: user?.id || 't1', username: user?.username || 'You', coordinates: { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG }, timestamp: now, battery_level: 90 },
                            { user_id: 't2', username: 'Test B', coordinates: { latitude: DEFAULT_LAT + 0.0015, longitude: DEFAULT_LNG + 0.0015 }, timestamp: now, battery_level: 65 },
                            { user_id: 't3', username: 'Test C', coordinates: { latitude: DEFAULT_LAT - 0.0015, longitude: DEFAULT_LNG - 0.0015 }, timestamp: now, battery_level: 40 }
                          ];
                          setLocations(testMarkers);
                          updateMapMarkers(testMarkers);
                          // Center map on the first test marker for quick visibility
                          if (mapRef.current) {
                            mapRef.current.flyTo({ center: [DEFAULT_LNG, DEFAULT_LAT], zoom: 15, essential: true });
                          }
                          console.log('Test markers injected at default location');
                        }}
                      >
                        <LocationIcon />
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

          {/* Debug: project DEFAULT coords to screen and draw overlay */}
          <Tooltip title="Show Projection Debug Dot">
            <IconButton
              color="inherit"
              onClick={() => {
                if (!mapRef.current) {
                  console.log('Map not ready for projection test');
                  return;
                }
                // Convert lngLat to container pixels
                const point = mapRef.current.project([DEFAULT_LNG, DEFAULT_LAT]);

                // Remove existing debug dot
                const existing = document.getElementById('projection-debug-dot');
                if (existing) existing.remove();

                const dot = document.createElement('div');
                dot.id = 'projection-debug-dot';
                dot.style.position = 'absolute';
                dot.style.width = '16px';
                dot.style.height = '16px';
                dot.style.borderRadius = '50%';
                dot.style.background = 'red';
                dot.style.boxShadow = '0 0 6px rgba(255,0,0,0.9)';
                dot.style.zIndex = 99999;
                dot.style.left = `${point.x - 8}px`;
                dot.style.top = `${point.y - 8}px`;
                dot.style.pointerEvents = 'none';

                // Attach to the map container's parent so it overlays the map
                const container = document.getElementById('mapbox-container');
                if (container && container.parentElement) {
                  container.parentElement.appendChild(dot);
                  console.log('Projection debug dot placed at', point);
                } else {
                  console.log('Could not find map container to attach debug dot');
                }
              }}
            >
              <NavigationIcon />
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
  {/* Place controls for adding simple Lat/Lng POIs */}
  <PlaceControls groupId={groupId} />
      
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
