// SocialLoginButtons.jsx
import React from 'react';
import { Button, Box, Typography, Divider } from '@mui/material';
import { Facebook as FacebookIcon, LinkedIn as LinkedInIcon, Twitter as TwitterIcon } from '@mui/icons-material';

const SocialLoginButtons = ({ onSocialLogin, disabled = false }) => {
  const handleSocialLogin = (provider) => {
    if (onSocialLogin) {
      onSocialLogin(provider);
    } else {
      // Default behavior: redirect to backend OAuth endpoint
      window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/${provider}`;
    }
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Or continue with
        </Typography>
      </Divider>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<FacebookIcon />}
          onClick={() => handleSocialLogin('facebook')}
          disabled={disabled}
          sx={{
            borderColor: '#1877F2',
            color: '#1877F2',
            '&:hover': {
              borderColor: '#166FE5',
              bgcolor: 'rgba(24, 119, 242, 0.04)'
            }
          }}
        >
          Continue with Facebook
        </Button>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<LinkedInIcon />}
          onClick={() => handleSocialLogin('linkedin')}
          disabled={disabled}
          sx={{
            borderColor: '#0077B5',
            color: '#0077B5',
            '&:hover': {
              borderColor: '#005885',
              bgcolor: 'rgba(0, 119, 181, 0.04)'
            }
          }}
        >
          Continue with LinkedIn
        </Button>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<TwitterIcon />}
          onClick={() => handleSocialLogin('x')}
          disabled={disabled}
          sx={{
            borderColor: '#000000',
            color: '#000000',
            '&:hover': {
              borderColor: '#333333',
              bgcolor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          Continue with X
        </Button>
      </Box>
    </Box>
  );
};

export default SocialLoginButtons;