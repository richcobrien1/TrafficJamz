import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://trafficjam-v2u.vercel.app/api'  // Relative path (no domain needed)
    : 'http://localhost:3001'  // For local dev
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Added token to request headers');
    } else {
      console.warn('No token found in localStorage for API request');
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log the error for debugging
    console.error('API Error Response:', error.response || error);
    
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      console.error('Authentication token expired or invalid');
      // Optionally redirect to login page or refresh token
      // window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
