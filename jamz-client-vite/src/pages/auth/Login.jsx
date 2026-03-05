// Clerk-based Login component
import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Box } from '@mui/material';

const Login = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #00ff87 0%, #60efff 25%, #0061ff 50%, #b649f7 75%, #ff006e 100%)',
        padding: { xs: 3, sm: 4, md: 6 },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: { xs: '40px 32px', sm: '56px 48px' },
          margin: { xs: 2, sm: 3 },
        }}
      >
        <SignIn
          routing="path"
          path="/auth/login"
          signUpUrl="/auth/register"
          redirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: {
                width: '100%',
                margin: '0 auto',
              },
              card: {
                boxShadow: 'none',
                background: 'transparent',
                padding: 0,
                margin: 0,
              },
              headerTitle: {
                fontSize: '28px',
                fontWeight: '700',
                color: '#1a1a1a',
                marginBottom: '8px',
              },
              headerSubtitle: {
                fontSize: '16px',
                color: '#666',
                marginBottom: '24px',
              },
              socialButtonsBlockButton: {
                fontSize: '16px',
                fontWeight: '600',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                backgroundColor: '#ffffff',
                color: '#1a1a1a',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  borderColor: '#0061ff',
                },
              },
              socialButtonsBlockButtonText: {
                fontSize: '16px',
                fontWeight: '600',
                color: '#1a1a1a',
              },
              dividerLine: {
                backgroundColor: '#e0e0e0',
                height: '1px',
              },
              dividerText: {
                fontSize: '14px',
                color: '#666',
                fontWeight: '500',
              },
              formFieldLabel: {
                fontSize: '15px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '8px',
              },
              formFieldInput: {
                fontSize: '16px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                backgroundColor: '#ffffff',
                color: '#1a1a1a',
                transition: 'border-color 0.2s',
                '&:focus': {
                  borderColor: '#0061ff',
                  outline: 'none',
                },
              },
              formButtonPrimary: {
                fontSize: '17px',
                fontWeight: '700',
                padding: '14px 20px',
                borderRadius: '8px',
                backgroundColor: '#0061ff',
                color: '#ffffff',
                textTransform: 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: '#0052d9',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0, 97, 255, 0.3)',
                },
              },
              footerActionLink: {
                fontSize: '15px',
                fontWeight: '600',
                color: '#0061ff',
                '&:hover': {
                  color: '#0052d9',
                },
              },
              identityPreviewText: {
                fontSize: '15px',
                color: '#333',
              },
              identityPreviewEditButton: {
                fontSize: '14px',
                color: '#0061ff',
                fontWeight: '600',
              },
              formFieldErrorText: {
                fontSize: '14px',
                color: '#dc2626',
                marginTop: '4px',
              },
              footerAction: {
                margin: '20px 0 0 0',
              },
              footerActionText: {
                fontSize: '15px',
                color: '#666',
              },
              footer: {
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid #e0e0e0',
              },
              footerPages: {
                gap: '16px',
              },
              footerPageLink__privacy: {
                fontSize: '14px',
                color: '#666',
                '&:hover': {
                  color: '#0061ff',
                },
              },
              footerPageLink__terms: {
                fontSize: '14px',
                color: '#666',
                '&:hover': {
                  color: '#0061ff',
                },
              },
            },
            layout: {
              socialButtonsPlacement: 'top',
              socialButtonsVariant: 'blockButton',
              showOptionalFields: false,
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default Login;
