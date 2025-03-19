import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  AccountCircle as AccountCircleIcon,
  CreditCard as CreditCardIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { currentUser, updateProfile, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    username: currentUser?.username || '',
    email: currentUser?.email || '',
    first_name: currentUser?.first_name || '',
    last_name: currentUser?.last_name || '',
    phone_number: currentUser?.phone_number || ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    proximity_alerts: true,
    group_invitations: true
  });
  
  const navigate = useNavigate();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleNotificationChange = (setting) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await updateProfile(formData);
      
      setSuccess('Profile updated successfully');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            sx={{ mr: 2 }}
            onClick={() => navigate('/')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Profile
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <Avatar 
                  src={currentUser?.profile_image_url}
                  sx={{ width: 100, height: 100, mb: 2 }}
                >
                  {currentUser?.first_name?.[0] || currentUser?.username?.[0]}
                </Avatar>
                <Typography variant="h5" gutterBottom>
                  {currentUser?.first_name} {currentUser?.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  @{currentUser?.username}
                </Typography>
              </Box>
              
              <List>
                <ListItem button onClick={() => navigate('/subscription-plans')}>
                  <ListItemAvatar>
                    <Avatar>
                      <CreditCardIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Subscription" 
                    secondary={currentUser?.subscription?.plan_name || 'Free Plan'} 
                  />
                </ListItem>
                <Divider />
                <ListItem button>
                  <ListItemAvatar>
                    <Avatar>
                      <NotificationsIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Notifications" 
                    secondary="Manage notification settings" 
                  />
                </ListItem>
                <Divider />
                <ListItem button>
                  <ListItemAvatar>
                    <Avatar>
                      <SecurityIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Security" 
                    secondary="Password and authentication" 
                  />
                </ListItem>
                <Divider />
                <ListItem button>
                  <ListItemAvatar>
                    <Avatar>
                      <HelpIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Help & Support" 
                    secondary="Get assistance" 
                  />
                </ListItem>
                <Divider />
                <ListItem button onClick={handleLogout}>
                  <ListItemText 
                    primary="Logout" 
                    primaryTypographyProps={{ color: 'error' }}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Personal Information
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
              
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="username"
                      label="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="email"
                      label="Email Address"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="first_name"
                      label="First Name"
                      name="first_name"
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
                      value={formData.phone_number}
                      onChange={handleChange}
                    />
                  </Grid>
                </Grid>
                
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ mt: 3 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
              </Box>
            </Paper>
            
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Notification Settings
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Email Notifications" 
                    secondary="Receive notifications via email" 
                  />
                  <Switch
                    edge="end"
                    checked={notificationSettings.email_notifications}
                    onChange={() => handleNotificationChange('email_notifications')}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="Push Notifications" 
                    secondary="Receive notifications on your device" 
                  />
                  <Switch
                    edge="end"
                    checked={notificationSettings.push_notifications}
                    onChange={() => handleNotificationChange('push_notifications')}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="Proximity Alerts" 
                    secondary="Get notified when group members are nearby" 
                  />
                  <Switch
                    edge="end"
                    checked={notificationSettings.proximity_alerts}
                    onChange={() => handleNotificationChange('proximity_alerts')}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="Group Invitations" 
                    secondary="Get notified about new group invitations" 
                  />
                  <Switch
                    edge="end"
                    checked={notificationSettings.group_invitations}
                    onChange={() => handleNotificationChange('group_invitations')}
                  />
                </ListItem>
              </List>
              
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => {
                  // In a real implementation, we would save the notification settings
                  setSuccess('Notification settings saved');
                }}
              >
                Save Notification Settings
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Profile;
