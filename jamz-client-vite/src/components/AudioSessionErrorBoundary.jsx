import React from 'react';
import { Container, Typography, Button, Paper } from '@mui/material';

class AudioSessionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('AudioSession Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h4" color="error" gutterBottom>
              Audio Session Error
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Something went wrong with the audio session. This could be due to:
            </Typography>
            <ul>
              <li>Microphone permission issues</li>
              <li>Network connectivity problems</li>
              <li>Browser compatibility issues</li>
              <li>WebRTC initialization failures</li>
            </ul>

            <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace', bgcolor: 'grey.100', p: 1 }}>
              Error: {this.state.error && this.state.error.toString()}
            </Typography>

            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ mr: 2 }}
            >
              Reload Page
            </Button>

            <Button
              variant="outlined"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
              Try Again
            </Button>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default AudioSessionErrorBoundary;