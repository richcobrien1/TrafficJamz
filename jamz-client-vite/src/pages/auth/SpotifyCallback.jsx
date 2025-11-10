import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import spotifyClient from '../../services/spotify-client.service';

const SpotifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`Spotify authorization failed: ${errorParam}`);
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      try {
        const success = await spotifyClient.handleCallback(code);
        
        if (success) {
          // Redirect back to the page they came from
          const returnTo = localStorage.getItem('spotify_return_to') || '/';
          localStorage.removeItem('spotify_return_to');
          navigate(returnTo);
        } else {
          setError('Failed to authenticate with Spotify');
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (err) {
        console.error('Spotify callback error:', err);
        setError('Authentication error occurred');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {error}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Redirecting...
          </Typography>
        </Alert>
      ) : (
        <>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Connecting to Spotify...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please wait while we complete the authentication
          </Typography>
        </>
      )}
    </Box>
  );
};

export default SpotifyCallback;
