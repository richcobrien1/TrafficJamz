// AppLoader.jsx - Loading screen for app initialization
import React from 'react';
import { Box, CircularProgress, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

const AppLoader = ({ message = 'Loading TrafficJamz...', error = null, onRetry = null }) => {
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
        padding: 3
      }}
    >
      {!error ? (
        <CircularProgress size={60} sx={{ color: 'white', mb: 3 }} />
      ) : (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            maxWidth: '400px',
            '& .MuiAlert-message': { color: 'text.primary' }
          }}
        >
          {error}
        </Alert>
      )}
      
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
        TrafficJamz
      </Typography>
      
      <Typography variant="body1" sx={{ opacity: 0.9, mb: 3, textAlign: 'center' }}>
        {message}
      </Typography>

      {error && onRetry && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{ mt: 2 }}
        >
          Refresh & Retry
        </Button>
      )}

      {!error && (
        <Typography variant="caption" sx={{ opacity: 0.7, mt: 2, textAlign: 'center' }}>
          This may take up to 30 seconds on first load
        </Typography>
      )}
    </Box>
  );
};

export default AppLoader;
