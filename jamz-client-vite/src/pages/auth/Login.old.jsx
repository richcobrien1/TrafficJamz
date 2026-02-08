// jamz-client-vite/src/pages/auth/Login.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Link, 
  Paper,
  Avatar,
  CircularProgress,
  Alert
} from '@mui/material';
// Replaced Lock icon with the TrafficJamz logo (served from public/)
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If a protected route redirected here, capture the origin and persist
  // it so the redirect helper can navigate back after login.
  useEffect(() => {
    const from = location.state?.from;
    if (from) {
      localStorage.setItem('redirectAfterLogin', from);
    }
  }, [location]);
  
  // Stable navigation function
  const handleRedirect = useCallback(() => {
    const redirectUrl = localStorage.getItem('redirectAfterLogin');
    if (redirectUrl && redirectUrl !== '/login') {  // Avoid redirecting to invalid /login
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectUrl);
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);
  
  // Auto-redirect when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      handleRedirect();
    }
  }, [isAuthenticated, handleRedirect]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Call the login function from AuthContext
      await login(email, password);
      
      // Navigation will be handled by useEffect when isAuthenticated becomes true
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to login. Please check your credentials.');
      setLoading(false);
    }
  };
  
  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <img src="/TrafficJamz.ico" alt="TrafficJamz" style={{ width: 48, height: 48 }} />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
          <Grid container spacing={3} sx={{
              justifyContent: "center",
              alignItems: "center",
            }}>
            <Grid item xs>
              <Link component={RouterLink} to="/forgot-password" variant="body2">
                Forgot my password?
              </Link>
            </Grid>
            <Grid item xs>
              <Link component={RouterLink} to="/auth/register" state={{ from: location.state?.from }} variant="body2">
                {"Don't have an account? Sign Up"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      <Box mt={4}>
        <Typography variant="body2" color="text.secondary" align="center">
          {"Copyright © "}
          <Link color="inherit" href="#">
            Audio Group Communication App
          </Link>{" "}
          {new Date().getFullYear()}
          {"."}
        </Typography>
      </Box>
    </Container>
  );
};

export default Login;
