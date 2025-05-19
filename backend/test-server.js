// backend/test-server.js
const express = require('express');
const cors = require('cors');
const app = express();

// Add prominent logging to verify the server is loading
console.log('========================================');
console.log('TEST SERVER: Starting up - Vercel test');
console.log(`TEST SERVER: Environment: ${process.env.NODE_ENV}`);
console.log(`TEST SERVER: Time: ${new Date().toISOString()}`);
console.log('========================================');

// Configure CORS to allow all origins for testing
app.use(cors({
  origin: function(origin, callback) {
    console.log('TEST SERVER: CORS request from origin:', origin);
    callback(null, true); // Allow all origins for testing
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add middleware to log all requests
app.use((req, res, next) => {
  console.log(`TEST SERVER: ${req.method} ${req.url}`);
  console.log('TEST SERVER: Headers:', JSON.stringify(req.headers));
  next();
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  console.log('TEST SERVER: /health endpoint hit');
  res.json({ status: 'healthy', message: 'Test server is working!' });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  console.log('TEST SERVER: /api/test endpoint hit');
  res.json({ 
    message: 'Test server API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Catch-all route to verify routing
app.get('*', (req, res) => {
  console.log(`TEST SERVER: Catch-all route hit for: ${req.url}`);
  res.json({ 
    message: 'Test server catch-all route',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Export the Express app for Vercel
module.exports = app;
