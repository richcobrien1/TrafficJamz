// Clerk-based Register component
import React from 'react';
import { SignUp } from '@clerk/clerk-react';

const Register = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#0a0a0a'
    }}>
      <SignUp 
        routing="path" 
        path="/auth/register"
        signInUrl="/auth/login"
        redirectUrl="/dashboard"
      />
    </div>
  );
};

export default Register;
