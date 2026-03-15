// Native-friendly login for Android/iOS (bypasses Clerk UI components)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link
} from '@mui/material';
import api from '../../services/api';

const NativeLogin = () => {
  const navigate = useNavigate();
  const { signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Method 1: Try Clerk's programmatic sign-in (doesn't use UI components)
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        
        // Sync with backend
        const clerkUser = result.userData;
        await api.post('/auth/clerk-sync', {
          clerkUserId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || email
        });

        navigate('/dashboard');
      } else {
        // Handle 2FA or other verification steps
        console.log('Additional verification required:', result.status);
        setError('Additional verification required. Please complete in web browser.');
      }
    } catch (err) {
      console.error('Native login error:', err);
      
      // Method 2: Fallback to backend direct authentication
      try {
        console.log('Trying backend authentication fallback...');
        const response = await api.post('/auth/login', { 
          email, 
          password 
        });
        
        if (response.data.access_token) {
          localStorage.setItem('token', response.data.access_token);
          if (response.data.refresh_token) {
            localStorage.setItem('refresh_token', response.data.refresh_token);
          }
          navigate('/dashboard');
        }
      } catch (backendErr) {
        console.error('Backend fallback error:', backendErr);
        setError(err.errors?.[0]?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 3,
        background: 'linear-gradient(135deg, #00ff87 0%, #60efff 25%, #0061ff 50%, #b649f7 75%, #ff006e 100%)',
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: 4,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 700 }}>
          TrafficJamz
        </Typography>
        <Typography variant="body1" gutterBottom align="center" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to continue
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          sx={{ mb: 2 }}
          autoComplete="email"
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          sx={{ mb: 3 }}
          autoComplete="current-password"
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          sx={{
            mb: 2,
            py: 1.5,
            fontSize: '16px',
            fontWeight: 600,
            background: 'linear-gradient(90deg, #0061ff 0%, #60efff 100%)',
            '&:hover': {
              background: 'linear-gradient(90deg, #0051dd 0%, #50dfef 100%)',
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link href="/auth/register" sx={{ fontWeight: 600, textDecoration: 'none' }}>
              Sign Up
            </Link>
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Having trouble? Try the web version at jamz.v2u.us
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default NativeLogin;
