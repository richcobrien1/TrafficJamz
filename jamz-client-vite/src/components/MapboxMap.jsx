import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import '../styles/map/MapboxMap.css';

const MapboxMap = () => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  
  // For dev route, use env token directly (don't wait for config)
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  console.log('🗺️ MapboxMap component rendering');
  console.log('Token available:', !!token);

  // Mock data for Breckenridge ski area with 5 friends and brewery
  const mockLocations = [
    {
      id: 'user1',
      name: 'Alice Johnson',
      type: 'user',
      coordinates: [-106.0378, 39.4817], // Breckenridge base area
      color: '#FF6B6B'
    },
    {
      id: 'user2',
      name: 'Bob Smith',
      type: 'user',
      coordinates: [-106.0456, 39.4852], // Peak 8
      color: '#4ECDC4'
    },
    {
      id: 'user3',
      name: 'Carol Davis',
      type: 'user',
      coordinates: [-106.0321, 39.4789], // Peak 6
      color: '#45B7D1'
    },
    {
      id: 'user4',
      name: 'David Wilson',
      type: 'user',
      coordinates: [-106.0412, 39.4834], // Near base
      color: '#96CEB4'
    },
    {
      id: 'user5',
      name: 'Emma Brown',
      type: 'user',
      coordinates: [-106.0355, 39.4798], // Village area
      color: '#FFEAA7'
    },
    {
      id: 'brewery1',
      name: 'Breckenridge Brewery',
      type: 'brewery',
      coordinates: [-106.0385, 39.4825], // Breckenridge Brewery location
      color: '#D63031',
      meetupTime: '5:00 PM'
    }
  ];

  useEffect(() => {
    console.log('🗺️ MapboxMap component mounted');
    console.log('Token available:', !!token);
    console.log('Token value:', token ? token.substring(0, 10) + '...' : 'undefined');
    console.log('Mapbox GL available:', typeof mapboxgl);
    
    if (!token) {
      console.error('🚨 Mapbox token is missing');
      return;
    }

    if (!mapboxgl) {
      console.error('🚨 Mapbox GL JS library not loaded');
      return;
    }

    mapboxgl.accessToken = token;

    if (!mapContainerRef.current) {
      console.error('🚨 Map container ref is null');
      return;
    }

    console.log('🧭 Mounting Mapbox map...');
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v11', // Better for outdoor/ski areas
      center: [-106.0378, 39.4817], // Breckenridge center
      zoom: 13
    });

    mapRef.current = map;

    map.on('load', () => {
      console.log('🗺️ Map loaded and visible');
      map.resize();

      // Add markers for mock locations
      mockLocations.forEach(location => {
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        markerElement.style.backgroundColor = location.color;
        markerElement.style.width = location.type === 'brewery' ? '25px' : location.type === 'restaurant' ? '20px' : '15px';
        markerElement.style.height = location.type === 'brewery' ? '25px' : location.type === 'restaurant' ? '20px' : '15px';
        markerElement.style.borderRadius = location.type === 'brewery' ? '4px' : '50%';
        markerElement.style.border = location.type === 'brewery' ? '3px solid #FFD700' : '2px solid white';
        markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat(location.coordinates)
          .addTo(map);

        // Add popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div style="font-family: Arial, sans-serif; padding: 5px;">
              <strong>${location.name}</strong><br>
              <small>${location.type === 'brewery' ? 'Brewery - Meetup at ' + location.meetupTime : location.type === 'restaurant' ? 'Restaurant' : 'Group Member'}</small>
            </div>
          `);

        marker.setPopup(popup);
      });

      // Add a legend
      const legend = document.createElement('div');
      legend.style.position = 'absolute';
      legend.style.top = '10px';
      legend.style.right = '10px';
      legend.style.background = 'white';
      legend.style.padding = '10px';
      legend.style.borderRadius = '5px';
      legend.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      legend.style.fontFamily = 'Arial, sans-serif';
      legend.style.fontSize = '12px';
      legend.innerHTML = `
        <strong>Group Members</strong><br>
        <span style="color: #FF6B6B;">●</span> Alice Johnson<br>
        <span style="color: #4ECDC4;">●</span> Bob Smith<br>
        <span style="color: #45B7D1;">●</span> Carol Davis<br>
        <span style="color: #96CEB4;">●</span> David Wilson<br>
        <span style="color: #FFEAA7;">●</span> Emma Brown<br>
        <br>
        <strong>Meetup Location</strong><br>
        <span style="color: #D63031;">■</span> Breckenridge Brewery (5:00 PM)
      `;

      map.getContainer().appendChild(legend);
    });

    return () => {
      map.remove();
    };
  }, [token]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>🗺️ TrafficJamz Meetup Map</h1>
      <p>5 Friends + Breckenridge Brewery Meetup at 5:00 PM</p>
      <div
        ref={mapContainerRef}
        className="mapbox-container"
        style={{ width: '100%', height: '600px', border: '2px solid #ccc', borderRadius: '8px' }}
      />
    </div>
  );
};

export default MapboxMap;
