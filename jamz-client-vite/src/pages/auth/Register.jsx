// Clerk-based Register component
import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { Container, Box, Paper } from '@mui/material';

const Register = () => {
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
          <SignUp 
            routing="path" 
            path="/auth/register"
            signInUrl="/auth/login"
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

export default Register;
