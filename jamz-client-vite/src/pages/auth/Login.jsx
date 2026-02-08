// Clerk-based Login component
import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Container, Box, Paper } from '@mui/material';

const Login = () => {
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <SignIn 
            routing="path" 
            path="/auth/login"
            signUpUrl="/auth/register"
            redirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: {
                  width: '100%',
                },
                card: {
                  boxShadow: 'none',
                  background: 'transparent',
                },
              },
            }}
          />
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
