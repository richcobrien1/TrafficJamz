// AppLoader.jsx - Loading screen for app initialization
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const AppLoader = ({ message = 'Loading TrafficJamz...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}
    >
      <CircularProgress size={60} sx={{ color: 'white', mb: 3 }} />
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
        TrafficJamz
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.9 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default AppLoader;
