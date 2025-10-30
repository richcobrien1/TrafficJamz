// AuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const provider = searchParams.get('provider');
        const error = searchParams.get('error');

        if (error) {
          setError(`Authentication failed: ${error}`);
          setLoading(false);
          return;
        }

        if (!accessToken) {
          setError('No access token received');
          setLoading(false);
          return;
        }

        // Store tokens
        localStorage.setItem('token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }

        // Fetch user profile to update context
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            // Redirect to dashboard
            navigate('/dashboard');
          } else {
            setError('Failed to fetch user profile');
          }
        } else {
          setError('Failed to authenticate');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, setUser]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3
        }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6">
          Completing authentication...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3
        }}
      >
        <Alert severity="error" sx={{ mb: 2, maxWidth: 400 }}>
          {error}
        </Alert>
        <Typography
          variant="body1"
          sx={{ cursor: 'pointer', color: 'primary.main' }}
          onClick={() => navigate('/login')}
        >
          Return to login
        </Typography>
      </Box>
    );
  }

  return null;
};

export default AuthCallback;