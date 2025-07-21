import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import '../styles/map/MapboxMap.css';

const MapboxMap = () => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token) {
      console.error('🚨 Mapbox token is missing');
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
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-104.8877, 39.4030],
      zoom: 14
    });

    mapRef.current = map;

    map.on('load', () => {
      console.log('🗺️ Map loaded and visible');
      map.resize();
    });

    return () => {
      map.remove();
    };
  }, [token]);

  return (
    <div
      ref={mapContainerRef}
      className="mapbox-container"
    />
  );
};

export default MapboxMap;
