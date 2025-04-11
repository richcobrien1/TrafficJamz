import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_LOCAL_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Token found and added to request headers');
    } else {
      console.warn('No authentication token found in localStorage');
    }
    return config;
  },
  (error) => {
    console.error('Error in request interceptor:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error information
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        url: error.config.url,
        method: error.config.method
      });

      // Handle 401 Unauthorized errors (token expired)
      if (error.response.status === 401) {
        console.warn('Authentication token expired or invalid');
        localStorage.removeItem('token');
        // window.location.href = '/login';
      }
      
      // Handle 400 Bad Request errors
      if (error.response.status === 400) {
        console.warn('Bad Request - Check request parameters and authentication');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Helper function to check if token exists and is valid
api.hasValidToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return false;
  }
  
  // Basic check if token is a JWT (format: xxx.yyy.zzz)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return false;
  }
  
  try {
    // Check if middle part is valid base64 that can be decoded to JSON
    const payload = JSON.parse(atob(tokenParts[1]));
    
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn('Token has expired');
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Error parsing token:', e);
    return false;
  }
};

// Function to refresh token if needed before making critical requests
api.ensureValidToken = async () => {
  if (!api.hasValidToken()) {
    console.warn('No valid token found, user may need to log in again');
    // Here you could implement token refresh logic if you have a refresh token
    // For now, just return false to indicate no valid token
    return false;
  }
  return true;
};

export default api;
