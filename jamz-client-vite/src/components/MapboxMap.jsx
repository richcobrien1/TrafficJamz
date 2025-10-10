import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import '../styles/map/MapboxMap.css';

const MapboxMap = () => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  
  // For dev route, use env token directly (don't wait for config)
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  // Mock data for Breckenridge ski area
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
      id: 'restaurant1',
      name: 'Blue River Bistro',
      type: 'restaurant',
      coordinates: [-106.0385, 39.4825], // Near base area
      color: '#FFA07A'
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
        markerElement.style.width = location.type === 'restaurant' ? '20px' : '15px';
        markerElement.style.height = location.type === 'restaurant' ? '20px' : '15px';
        markerElement.style.borderRadius = '50%';
        markerElement.style.border = '2px solid white';
        markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat(location.coordinates)
          .addTo(map);

        // Add popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div style="font-family: Arial, sans-serif; padding: 5px;">
              <strong>${location.name}</strong><br>
              <small>${location.type === 'restaurant' ? 'Restaurant' : 'Group Member'}</small>
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
        <br>
        <strong>Restaurants</strong><br>
        <span style="color: #FFA07A;">●</span> Blue River Bistro
      `;

      map.getContainer().appendChild(legend);
    });

    return () => {
      map.remove();
    };
  }, [token]);

  return (
    <div
      ref={mapContainerRef}
      className="mapbox-container"
      style={{ width: '100%', height: '600px' }}
    />
  );
};

export default MapboxMap;
