import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const NotFound = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
        <Typography variant="h1" color="error" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The page you are looking for does not exist or has been moved.
        </Typography>
      </Paper>
    </Box>
  );
};

export default NotFound;
