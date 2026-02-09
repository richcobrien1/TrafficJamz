// Clerk-based Login component
import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const Login = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#0a0a0a'
    }}>
      <SignIn 
        routing="path" 
        path="/auth/login"
        signUpUrl="/auth/register"
        redirectUrl="/dashboard"
      />
    </div>
  );
};

export default Login;
