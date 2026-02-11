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
          minHeight: '100vh',
          background: 'linear-gradient(180deg, rgb(0, 255, 0) 0%, rgb(0, 0, 255) 50%, rgb(255, 0, 0) 100%)',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', mt: 4 }}>
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
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateStep1 = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    return true;
  };
  
  const handleNext = () => {
    if (activeStep === 0) {
      if (validateStep1()) {
        setError('');
        setActiveStep(1);
      }
    } else {
      handleSubmit();
    }
  };
  
  const handleBack = () => {
    setActiveStep(0);
    setError('');
  };
  
  const handleSubmit = async () => {
    try {
      setError('');
      setLoading(true);
      
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        gender: formData.gender || null
      };
      
  // Register will store the token and set the user in AuthContext.
  // After registration, redirect back to the originating page (if any),
  // otherwise to the app root/dashboard so the new user remains logged in.
  await register(userData);
  navigate(from, { replace: true });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to register. Please try again.');
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };
  
  const steps = ['Account Information', 'Personal Details'];
  
  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <PersonAddIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign up
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ width: '100%', mt: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" sx={{ mt: 3, width: '100%' }}>
          {activeStep === 0 ? (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="username"
                  label="Username"
                  name="username"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  helperText="Password must be at least 8 characters long"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="first_name"
                  label="First Name"
                  name="first_name"
                  autoComplete="given-name"
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="last_name"
                  label="Last Name"
                  name="last_name"
                  autoComplete="family-name"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="phone_number"
                  label="Phone Number"
                  name="phone_number"
                  autoComplete="tel"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Gender (for avatar personalization)
                  </Typography>
                  <ToggleButtonGroup
                    value={formData.gender}
                    exclusive
                    onChange={(event, newGender) => {
                      if (newGender !== null) {
                        setFormData(prev => ({ ...prev, gender: newGender }));
                      }
                    }}
                    aria-label="gender selection"
                    fullWidth
                    sx={{ mt: 1 }}
                  >
                    <ToggleButton value="male" aria-label="male">
                      Male
                    </ToggleButton>
                    <ToggleButton value="female" aria-label="female">
                      Female
                    </ToggleButton>
                    <ToggleButton value="non-binary" aria-label="non-binary">
                      Non-binary
                    </ToggleButton>
                    <ToggleButton value="prefer-not-to-say" aria-label="prefer not to say">
                      Prefer not to say
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Grid>
            </Grid>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            {activeStep > 0 && (
              <Button
                onClick={handleBack}
                variant="outlined"
              >
                Back
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
              sx={{ ml: activeStep > 0 ? 'auto' : 0 }}
            >
              {loading ? <CircularProgress size={24} /> : activeStep === steps.length - 1 ? 'Sign Up' : 'Next'}
            </Button>
          </Box>
        </Box>
        
        <Grid container justifyContent="flex-end" sx={{ mt: 3 }}>
          <Grid item>
            <Link component={RouterLink} to="/login" variant="body2">
              Already have an account? Sign in
            </Link>
          </Grid>
        </Grid>
      </Paper>
      <Box mt={4}>
        <Typography variant="body2" color="text.secondary" align="center">
          {"Copyright © "}
          <Link color="inherit" href="#">
            Jamz Audio Communications Group
          </Link>{" "}
          {new Date().getFullYear()}
          {"."}
        </Typography>
      </Box>
    </Container>
  );
};

export default Register;
