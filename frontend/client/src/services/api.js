import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  // baseURL: process.env.REACT_APP_API_URL || 'https://trafficjam-v2u.vercel.app' || 'http://localhost:3001',
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: false,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Allow all origins for CORS
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',  // Allow specific methods for CORS
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',  // Allow specific headers for CORS
    }
  },

  console.log('API base URL:  ', process.env.REACT_APP_API_URL) // Log the base URL for debugging
);

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
