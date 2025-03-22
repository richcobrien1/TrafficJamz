import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container,
  Grid2,
  Button,
  CircularProgress,
  Alert,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  AuthService, 
  GroupService, 
  AudioService, 
  LocationService, 
  SubscriptionService,
  NotificationService
} from '../services';

const TestIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [testStatus, setTestStatus] = useState({
    auth: 'pending',
    users: 'pending',
    groups: 'pending',
    audio: 'pending',
    location: 'pending',
    subscriptions: 'pending',
    notifications: 'pending'
  });

  const runAllTests = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setTestResults([]);
    
    try {
      await testAuthService();
      await testGroupService();
      await testAudioService();
      await testLocationService();
      await testSubscriptionService();
      await testNotificationService();
      
      setSuccess('All integration tests completed successfully!');
    } catch (error) {
      setError('Some tests failed. Check the results for details.');
    } finally {
      setLoading(false);
    }
  };

  const addTestResult = (service, endpoint, status, message) => {
    setTestResults(prev => [
      ...prev,
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        service,
        endpoint,
        status,
        message
      }
    ]);
  };

  const updateTestStatus = (service, status) => {
    setTestStatus(prev => ({
      ...prev,
      [service]: status
    }));
  };

  const testAuthService = async () => {
    updateTestStatus('auth', 'running');
    
    try {
      // Test login endpoint
      try {
        const loginResponse = await AuthService.login('test@example.com', 'password123');
        addTestResult('auth', 'login', 'success', 'Successfully connected to login endpoint');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // This is expected with fake credentials
          addTestResult('auth', 'login', 'success', 'Login endpoint correctly returned 401 for invalid credentials');
        } else {
          throw error;
        }
      }
      
      // Test register endpoint
      try {
        const registerResponse = await AuthService.register({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
        addTestResult('auth', 'register', 'success', 'Successfully connected to register endpoint');
      } catch (error) {
        if (error.response && (error.response.status === 400 || error.response.status === 409)) {
          // This is expected if user already exists
          addTestResult('auth', 'register', 'success', 'Register endpoint correctly returned error for existing user');
        } else {
          throw error;
        }
      }
      
      updateTestStatus('auth', 'success');
    } catch (error) {
      updateTestStatus('auth', 'failed');
      addTestResult('auth', 'general', 'error', `Auth service test failed: ${error.message}`);
      throw error;
    }
  };

  const testGroupService = async () => {
    updateTestStatus('groups', 'running');
    
    try {
      // Test get groups endpoint
      try {
        const groupsResponse = await GroupService.getGroups();
        addTestResult('groups', 'getGroups', 'success', 'Successfully connected to getGroups endpoint');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // This is expected if not authenticated
          addTestResult('groups', 'getGroups', 'success', 'GetGroups endpoint correctly returned 401 for unauthenticated request');
        } else {
          throw error;
        }
      }
      
      updateTestStatus('groups', 'success');
    } catch (error) {
      updateTestStatus('groups', 'failed');
      addTestResult('groups', 'general', 'error', `Group service test failed: ${error.message}`);
      throw error;
    }
  };

  const testAudioService = async () => {
    updateTestStatus('audio', 'running');
    
    try {
      // Test get active sessions endpoint
      try {
        const sessionsResponse = await AudioService.getActiveSessions();
        addTestResult('audio', 'getActiveSessions', 'success', 'Successfully connected to getActiveSessions endpoint');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // This is expected if not authenticated
          addTestResult('audio', 'getActiveSessions', 'success', 'GetActiveSessions endpoint correctly returned 401 for unauthenticated request');
        } else {
          throw error;
        }
      }
      
      updateTestStatus('audio', 'success');
    } catch (error) {
      updateTestStatus('audio', 'failed');
      addTestResult('audio', 'general', 'error', `Audio service test failed: ${error.message}`);
      throw error;
    }
  };

  const testLocationService = async () => {
    updateTestStatus('location', 'running');
    
    try {
      // Test update location endpoint
      try {
        const locationResponse = await LocationService.updateLocation({
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10
          }
        });
        addTestResult('location', 'updateLocation', 'success', 'Successfully connected to updateLocation endpoint');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // This is expected if not authenticated
          addTestResult('location', 'updateLocation', 'success', 'UpdateLocation endpoint correctly returned 401 for unauthenticated request');
        } else {
          throw error;
        }
      }
      
      updateTestStatus('location', 'success');
    } catch (error) {
      updateTestStatus('location', 'failed');
      addTestResult('location', 'general', 'error', `Location service test failed: ${error.message}`);
      throw error;
    }
  };

  const testSubscriptionService = async () => {
    updateTestStatus('subscriptions', 'running');
    
    try {
      // Test get plans endpoint
      try {
        const plansResponse = await SubscriptionService.getPlans();
        addTestResult('subscriptions', 'getPlans', 'success', 'Successfully connected to getPlans endpoint');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          // This might be expected if endpoint doesn't exist yet
          addTestResult('subscriptions', 'getPlans', 'warning', 'GetPlans endpoint returned 404 - might not be implemented yet');
        } else if (error.response && error.response.status === 401) {
          // This is expected if not authenticated
          addTestResult('subscriptions', 'getPlans', 'success', 'GetPlans endpoint correctly returned 401 for unauthenticated request');
        } else {
          throw error;
        }
      }
      
      updateTestStatus('subscriptions', 'success');
    } catch (error) {
      updateTestStatus('subscriptions', 'failed');
      addTestResult('subscriptions', 'general', 'error', `Subscription service test failed: ${error.message}`);
      throw error;
    }
  };

  const testNotificationService = async () => {
    updateTestStatus('notifications', 'running');
    
    try {
      // Test get notifications endpoint
      try {
        const notificationsResponse = await NotificationService.getNotifications();
        addTestResult('notifications', 'getNotifications', 'success', 'Successfully connected to getNotifications endpoint');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // This is expected if not authenticated
          addTestResult('notifications', 'getNotifications', 'success', 'GetNotifications endpoint correctly returned 401 for unauthenticated request');
        } else {
          throw error;
        }
      }
      
      updateTestStatus('notifications', 'success');
    } catch (error) {
      updateTestStatus('notifications', 'failed');
      addTestResult('notifications', 'general', 'error', `Notification service test failed: ${error.message}`);
      throw error;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'success.main';
      case 'running':
        return 'info.main';
      case 'failed':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Backend-Frontend Integration Tests
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Button 
          variant="contained" 
          onClick={runAllTests}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Run All Tests'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Grid2 container spacing={3}>
        <Grid2 item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test Status
            </Typography>
            
            <List>
              {Object.entries(testStatus).map(([service, status]) => (
                <React.Fragment key={service}>
                  <ListItem>
                    <ListItemText 
                      primary={service.charAt(0).toUpperCase() + service.slice(1)} 
                      secondary={status.charAt(0).toUpperCase() + status.slice(1)}
                      primaryTypographyProps={{
                        fontWeight: 'bold'
                      }}
                      secondaryTypographyProps={{
                        color: getStatusColor(status)
                      }}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid2>
        
        <Grid2 item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test Results
            </Typography>
            
            {testResults.length === 0 ? (
              <Typography color="text.secondary">
                No tests have been run yet. Click "Run All Tests" to start.
              </Typography>
            ) : (
              <List>
                {testResults.map((result) => (
                  <React.Fragment key={result.id}>
                    <ListItem>
                      <ListItemText 
                        primary={`${result.service} - ${result.endpoint}`}
                        secondary={
                          <>
                            <Typography 
                              component="span" 
                              variant="body2"
                              color={result.status === 'error' ? 'error.main' : result.status === 'warning' ? 'warning.main' : 'success.main'}
                            >
                              {result.status.toUpperCase()}
                            </Typography>
                            <Typography component="span" variant="body2">
                              {' - '}{result.message}
                            </Typography>
                            <Typography component="div" variant="caption" color="text.secondary">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid2>
      </Grid2>
    </Container>
  );
};

export default TestIntegration;
