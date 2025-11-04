// ErrorBoundary.jsx - Catches React errors and shows fallback UI
import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon, BugReport as BugIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Store error in localStorage for debugging on iOS
    try {
      localStorage.setItem('lastError', JSON.stringify({
        message: error.toString(),
        stack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Could not store error in localStorage:', e);
    }
  }

  handleReset = () => {
    // Clear error state and try again
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Clear any stale state
    try {
      localStorage.removeItem('backendReady');
      localStorage.removeItem('backendReadyTimestamp');
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    
    // Reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
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
          <BugIcon sx={{ fontSize: 60, mb: 2, opacity: 0.8 }} />
          
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            Oops! Something went wrong
          </Typography>

          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              maxWidth: '500px',
              '& .MuiAlert-message': { color: 'text.primary' }
            }}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>
              {this.state.error?.toString() || 'An unexpected error occurred'}
            </Typography>
            
            {import.meta.env.DEV && this.state.errorInfo && (
              <Typography variant="caption" component="pre" sx={{ 
                mt: 1, 
                fontSize: '0.7rem',
                maxHeight: '200px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.errorInfo.componentStack}
              </Typography>
            )}
          </Alert>

          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={this.handleReset}
            sx={{ mt: 2 }}
          >
            Reload App
          </Button>

          <Typography variant="caption" sx={{ opacity: 0.7, mt: 3, textAlign: 'center' }}>
            If this problem persists, try clearing your browser cache
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
