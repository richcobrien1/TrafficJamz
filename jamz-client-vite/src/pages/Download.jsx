import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Button, Card, CardContent } from '@mui/material';
import { Android, Apple, Computer, Download as DownloadIcon } from '@mui/icons-material';

const Download = () => {
  const [platform, setPlatform] = useState('unknown');
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/android/.test(userAgent)) {
      setPlatform('android');
      setDownloadUrl('https://trafficjamz.v2u.us/downloads/TrafficJamz.apk');
    } else if (/windows/.test(userAgent)) {
      setPlatform('windows');
      setDownloadUrl('https://trafficjamz.v2u.us/downloads/TrafficJamz-Setup.exe');
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
      // iOS would need App Store link
    } else if (/mac/.test(userAgent)) {
      setPlatform('mac');
      // Mac installer
    } else if (/linux/.test(userAgent)) {
      setPlatform('linux');
      // Linux package
    }
  }, []);

  const handleDownload = () => {
    if (downloadUrl) {
      // Mark that user has downloaded the native app
      localStorage.setItem('native_app_downloaded', 'true');
      localStorage.setItem('native_app_platform', platform);
      window.location.href = downloadUrl;
    }
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case 'android': return <Android sx={{ fontSize: 64 }} />;
      case 'windows': return <Computer sx={{ fontSize: 64 }} />;
      case 'ios': return <Apple sx={{ fontSize: 64 }} />;
      case 'mac': return <Apple sx={{ fontSize: 64 }} />;
      default: return <DownloadIcon sx={{ fontSize: 64 }} />;
    }
  };

  const getPlatformName = () => {
    switch (platform) {
      case 'android': return 'Android';
      case 'windows': return 'Windows';
      case 'ios': return 'iOS';
      case 'mac': return 'macOS';
      default: return 'your platform';
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card elevation={4}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Box sx={{ mb: 3, color: 'primary.main' }}>
            {getPlatformIcon()}
          </Box>
          
          <Typography variant="h4" gutterBottom>
            Download TrafficJamz
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            for {getPlatformName()}
          </Typography>

          <Typography variant="body1" color="success.main" sx={{ mb: 4, fontWeight: 500 }}>
            ✓ You're logged in! Your session will automatically work in the native app.
          </Typography>

          {downloadUrl && (
            <>
              <Button
                variant="contained"
                size="large"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{ mb: 2, px: 6, py: 2, fontSize: '1.1rem' }}
              >
                Download Now
              </Button>
              
              {platform === 'android' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                  After downloading, tap the file and allow installation from unknown sources if prompted.
                </Typography>
              )}
            </>
          )}

          {!downloadUrl && (
            <Typography color="text.secondary">
              Native app not available for {getPlatformName()} yet.
              <br />
              Please use the web version.
            </Typography>
          )}

          <Button
            variant="text"
            href="/"
            sx={{ mt: 4 }}
          >
            Use Web Version Instead
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Download;
