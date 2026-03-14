// NativeAppPrompt.jsx - Detect if user has native app and prompt to use it
import React, { useState, useEffect } from 'react';
import { Alert, Button, Snackbar, IconButton } from '@mui/material';
import { Close as CloseIcon, OpenInNew } from '@mui/icons-material';

const NativeAppPrompt = () => {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    // Check if we're running in Electron
    const isElectron = !!(window.electron?.isElectron || window.electronAPI?.isElectron);
    
    if (isElectron) {
      // Already in native app, don't show prompt
      return;
    }

    // Check if user has previously downloaded the app
    const hasDownloaded = localStorage.getItem('native_app_downloaded');
    
    // Check if user has dismissed this prompt in the last 7 days
    const dismissedUntil = localStorage.getItem('native_app_prompt_dismissed');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      return;
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    let detectedPlatform = null;
    
    if (/android/.test(userAgent)) {
      detectedPlatform = 'android';
    } else if (/windows/.test(userAgent)) {
      detectedPlatform = 'windows';
    }

    // Show prompt if they previously downloaded and are on supported platform
    if (hasDownloaded && detectedPlatform) {
      setPlatform(detectedPlatform);
      setShow(true);
    }
  }, []);

  const handleOpenNative = () => {
    // Try to open the native app via custom URL scheme
    const deepLink = `trafficjamz://open${window.location.pathname}${window.location.search}`;
    window.location.href = deepLink;
    
    // If the app doesn't open in 2 seconds, assume it's not installed
    setTimeout(() => {
      // Could show a fallback message or do nothing
    }, 2000);
  };

  const handleDismiss = () => {
    setShow(false);
    // Don't show again for 7 days
    const dismissUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('native_app_prompt_dismissed', dismissUntil.toString());
  };

  if (!show || !platform) {
    return null;
  }

  return (
    <Snackbar
      open={show}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ mt: 8 }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <>
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleOpenNative}
              startIcon={<OpenInNew />}
            >
              Open App
            </Button>
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleDismiss}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      >
        Open in TrafficJamz native app for better performance?
      </Alert>
    </Snackbar>
  );
};

export default NativeAppPrompt;
