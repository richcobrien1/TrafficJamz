import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import youtubeClient from '../../services/youtube-client.service';

const YouTubeCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`YouTube authorization failed: ${errorParam}`);
        setTimeout(() => navigate('/dashboard'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setTimeout(() => navigate('/dashboard'), 3000);
        return;
      }

      try {
        const success = await youtubeClient.handleCallback(code);
        
        if (success) {
          // Redirect back to wherever the user came from
          const returnTo = localStorage.getItem('youtube_return_to') || '/';
          localStorage.removeItem('youtube_return_to');
          navigate(returnTo);
        } else {
          setError('Failed to complete YouTube authorization');
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (err) {
        console.error('YouTube callback error:', err);
        setError(err.message || 'An error occurred during authorization');
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
        p: 3,
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          {error}
        </Alert>
      ) : (
        <>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Connecting to YouTube Music...
          </Typography>
        </>
      )}
    </Box>
  );
};

export default YouTubeCallback;
