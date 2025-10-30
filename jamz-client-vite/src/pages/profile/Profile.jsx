import React, { useState, useEffect, useRef } from 'react';
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
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  AccountCircle as AccountCircleIcon,
  CreditCard as CreditCardIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Edit as EditIcon,
  Facebook as FacebookIcon,
  LinkedIn as LinkedInIcon,
  Twitter as TwitterIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts//AuthContext';

const Profile = () => {
  const { user, loading: authLoading, updateProfile, updateNotificationSettings, updatePassword, enable2FA, verify2FA, disable2FA, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    proximity_alerts: true,
    group_invitations: true
  });
  const [helpCenterOpen, setHelpCenterOpen] = useState(false);
  const [contactSupportOpen, setContactSupportOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Security modals
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [enable2FAOpen, setEnable2FAOpen] = useState(false);
  
  // AI Chat Support
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hi there! I\'m your AI support assistant. How can I help you with TrafficJamz today?',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [helpCenterTab, setHelpCenterTab] = useState('articles'); // 'articles' or 'chat'
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // 2FA setup
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQR, setTwoFactorQR] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  
  // Individual panel notifications
  const [personalInfoSuccess, setPersonalInfoSuccess] = useState('');
  const [personalInfoError, setPersonalInfoError] = useState('');
  const [notificationsSuccess, setNotificationsSuccess] = useState('');
  const [notificationsError, setNotificationsError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [socialSuccess, setSocialSuccess] = useState('');
  const [socialError, setSocialError] = useState('');
  
  // Initialize form data from user data
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || ''
      });
      
      // Initialize notification settings from user preferences
      setNotificationSettings({
        email_notifications: user.email_notifications ?? true,
        push_notifications: user.push_notifications ?? true,
        proximity_alerts: user.proximity_alerts ?? true,
        group_invitations: user.group_invitations ?? true
      });
    }
  }, [user]);
  
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
  
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setPersonalInfoError('');
      setPersonalInfoSuccess('');

      // Only send updatable fields (exclude username and email for security)
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number
      };

      // Update database and get updated user data
      await updateProfile(updateData);

      // Show success notification
      setPersonalInfoSuccess('Profile updated successfully');

      // Close edit mode after successful save
      setEditMode(false);

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setPersonalInfoSuccess('');
      }, 5000);

    } catch (error) {
      console.error('Profile update error:', error);
      setPersonalInfoError(error.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };  const handleSaveNotifications = async () => {
    try {
      setLoading(true);
      setNotificationsError('');
      setNotificationsSuccess('');

      // Update notification settings in database and get updated user data
      await updateNotificationSettings(notificationSettings);

      // Update the user object to reflect the saved settings
      // This ensures the notificationSettings state stays in sync
      setUser(prevUser => ({
        ...prevUser,
        ...notificationSettings
      }));

      // Show success notification
      setNotificationsSuccess('Notification settings saved successfully');

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setNotificationsSuccess('');
      }, 5000);

    } catch (error) {
      console.error('Notification settings update error:', error);
      setNotificationsError(error.response?.data?.message || 'Failed to update notification settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmitPasswordChange = async () => {
    try {
      setLoading(true);
      setSecurityError('');
      setSecuritySuccess('');

      // Validate passwords match
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setSecurityError('New passwords do not match');
        return;
      }

      // Validate password strength
      if (passwordForm.newPassword.length < 8) {
        setSecurityError('Password must be at least 8 characters long');
        return;
      }

      // Update password
      await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);

      // Show success notification
      setSecuritySuccess('Password changed successfully');

      // Reset form and close modal
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setChangePasswordOpen(false);

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSecuritySuccess('');
      }, 5000);

    } catch (error) {
      console.error('Password change error:', error);
      setSecurityError(error.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      setSecurityError('');
      
      const response = await enable2FA();
      
      // Set the 2FA secret and QR code
      setTwoFactorSecret(response.secret);
      setTwoFactorQR(response.qr_code_url);
      setEnable2FAOpen(true);
      
    } catch (error) {
      console.error('Enable 2FA error:', error);
      setSecurityError(error.response?.data?.message || 'Failed to enable 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerify2FA = async () => {
    try {
      setLoading(true);
      setSecurityError('');
      
      await verify2FA(twoFactorToken);
      
      // Show success notification
      setSecuritySuccess('Two-factor authentication enabled successfully');
      
      // Reset form and close modal
      setTwoFactorSecret('');
      setTwoFactorQR('');
      setTwoFactorToken('');
      setEnable2FAOpen(false);
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSecuritySuccess('');
      }, 5000);

    } catch (error) {
      console.error('Verify 2FA error:', error);
      setSecurityError(error.response?.data?.message || 'Invalid 2FA code. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDisable2FA = async () => {
    // For simplicity, we'll just show a confirmation dialog
    // In a real implementation, you'd want a proper confirmation modal
    if (window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      try {
        setLoading(true);
        setSecurityError('');
        
        // For disable, we might need the user's password
        const password = prompt('Please enter your password to confirm:');
        if (!password) return;
        
        await disable2FA(password);
        
        setSecuritySuccess('Two-factor authentication disabled successfully');
        
        setTimeout(() => {
          setSecuritySuccess('');
        }, 5000);
        
      } catch (error) {
        console.error('Disable 2FA error:', error);
        setSecurityError(error.response?.data?.message || 'Failed to disable 2FA. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };
  
  // AI Chat Support Handlers
  const generateAIResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    // Simple keyword-based responses (in a real app, this would call an AI API)
    if (message.includes('password') || message.includes('login')) {
      return "For password issues, you can reset your password from the login page. If you're having trouble logging in, make sure you're using the correct email address associated with your account.";
    }
    
    if (message.includes('group') || message.includes('create')) {
      return "To create a group, go to the Groups page and click 'Create New Group'. You can invite friends by sharing the group code or sending invitations. Groups allow real-time location sharing with your selected contacts.";
    }
    
    if (message.includes('location') || message.includes('share')) {
      return "Location sharing is controlled per group. You can enable/disable location sharing in your group settings. Make sure you have location permissions enabled in your browser for the best experience.";
    }
    
    if (message.includes('notification') || message.includes('alert')) {
      return "You can customize your notifications in your Profile settings. Choose which types of alerts you want to receive: email notifications, push notifications, proximity alerts, and group invitations.";
    }
    
    if (message.includes('2fa') || message.includes('security') || message.includes('two-factor')) {
      return "Two-factor authentication adds an extra layer of security to your account. You can enable it in your Profile under Security settings. You'll need an authenticator app like Google Authenticator.";
    }
    
    if (message.includes('help') || message.includes('support')) {
      return "I'm here to help! You can ask me about account issues, group management, location sharing, notifications, security settings, or any other features of TrafficJamz.";
    }
    
    if (message.includes('bug') || message.includes('error') || message.includes('problem')) {
      return "If you're experiencing technical issues, try refreshing the page first. If the problem persists, please contact our support team at support@trafficjamz.com with details about what you're experiencing.";
    }
    
    // Default response
    return "Thanks for your question! I'm here to help with TrafficJamz features like groups, location sharing, notifications, and account settings. Could you please provide more details about what you'd like to know?";
  };
  
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = {
      id: chatMessages.length + 1,
      type: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse = {
        id: chatMessages.length + 2,
        type: 'bot',
        content: generateAIResponse(userMessage.content),
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
      setChatLoading(false);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };
  
  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Social account management
  const handleLinkSocialAccount = (provider) => {
    // Redirect to OAuth flow
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/${provider}`;
  };

  const handleUnlinkSocialAccount = async (provider) => {
    try {
      setLoading(true);
      setSocialError('');
      setSocialSuccess('');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/unlink-social`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ provider })
      });

      const data = await response.json();

      if (data.success) {
        // Update user data to reflect unlinked account
        setUser(prevUser => ({
          ...prevUser,
          social_accounts: {
            ...prevUser.social_accounts,
            [provider]: undefined
          },
          connected_social_platforms: prevUser.connected_social_platforms?.filter(p => p !== provider) || []
        }));

        setSocialSuccess(`${provider} account unlinked successfully`);
      } else {
        setSocialError(data.message || 'Failed to unlink account');
      }
    } catch (error) {
      console.error('Unlink social account error:', error);
      setSocialError('Failed to unlink account. Please try again.');
    } finally {
      setLoading(false);
    }

    // Auto-clear messages after 5 seconds
    setTimeout(() => {
      setSocialSuccess('');
      setSocialError('');
    }, 5000);
  };
  
  // Generate avatar URL or use emoji fallback
  const getAvatarContent = () => {
    // First priority: user's actual profile image
    if (user?.profile_image_url) {
      return user.profile_image_url;
    }
    
    // Second priority: social platform avatars (in order of preference)
    if (user?.social_accounts) {
      // Facebook avatar
      if (user.social_accounts.facebook?.profile_data?.picture?.data?.url) {
        return user.social_accounts.facebook.profile_data.picture.data.url;
      }
      
      // LinkedIn avatar (from profile data)
      if (user.social_accounts.linkedin?.profile_data?.profilePicture?.displayImage) {
        const images = user.social_accounts.linkedin.profile_data.profilePicture.displayImage;
        if (images && images.length > 0) {
          return images[images.length - 1].data['com.linkedin.digitalmedia.mediaartifact.StillImage'].storageSize.large.url;
        }
      }
      
      // X avatar
      if (user.social_accounts.x?.profile_data?.profile_image_url_https) {
        return user.social_accounts.x.profile_data.profile_image_url_https;
      }
    }
    
    // Third priority: generate avatar from name using DiceBear
    const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    if (name) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    }
    
    // Final fallback: default emoji
    return null;
  };
  
  // Format join date
  const formatJoinDate = () => {
    if (user?.created_at) {
      const date = new Date(user.created_at);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    return 'Recently Joined';
  };
  
  // Show loading while auth is being checked
  if (authLoading) {
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
        <Container component="main" sx={{ flexGrow: 1, py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">Loading profile...</Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  // Show error if no user data after loading
  if (!user) {
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
        <Container component="main" sx={{ flexGrow: 1, py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="error" sx={{ mb: 2 }}>
              Unable to load profile data
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>
              Go Back
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

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
      
      <Container component="main" sx={{ flexGrow: 1, py: 4, px: 0 }} maxWidth={false}>
        <Box sx={{ px: { xs: 2, sm: 3, md: 0, lg: 0 } }}>
          <Box sx={{ 
            px: { lg: 3 },
            display: { xs: 'block', md: 'flex' },
            gap: { md: 3 }
          }}>
            {/* Left column - Profile sidebar */}
            <Box sx={{ 
              width: { xs: '100%', md: 320 }, 
              flexShrink: 0,
              mb: { xs: 3, md: 0 }
            }}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <Avatar 
                  src={getAvatarContent()}
                  sx={{ 
                    width: { xs: 80, md: 120 }, 
                    height: { xs: 80, md: 120 }, 
                    mb: 2,
                    bgcolor: 'primary.main',
                    border: '4px solid',
                    borderColor: 'primary.light'
                  }}
                >
                  {user?.first_name?.[0] || user?.username?.[0] || '👤'}
                </Avatar>
                <Typography variant="h5" gutterBottom fontWeight="600" sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                  {user?.first_name} {user?.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatJoinDate()}
                </Typography>
              </Box>
              
              <List sx={{ width: '100%' }}>
                <ListItem button onClick={() => navigate('/subscription-plans')} sx={{ borderRadius: 1 }}>
                  <ListItemAvatar>
                    <Avatar>
                      <CreditCardIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Subscription" 
                    secondary={user?.subscription?.plan_name || 'Free Plan'} 
                  />
                </ListItem>
                <Divider />
                <ListItem button sx={{ borderRadius: 1 }}>
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
                <ListItem button sx={{ borderRadius: 1 }}>
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
                <ListItem button sx={{ borderRadius: 1 }}>
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
                <ListItem button onClick={handleLogout} sx={{ borderRadius: 1, bgcolor: 'error.main', color: 'white', mt: 2, '&:hover': { bgcolor: 'error.dark' } }}>
                  <ListItemText 
                    primary="LOGOUT"
                  />
                </ListItem>
              </List>
            </Paper>
          </Box>
          
          {/* Right column - Forms */}
          <Box sx={{ flex: 1, mt: { md: 3 } }}>
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Personal Information
                </Typography>
                {!editMode && (
                  <IconButton
                    onClick={() => setEditMode(true)}
                    color="primary"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                )}
              </Box>
              
              {personalInfoError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {personalInfoError}
                </Alert>
              )}
              
              {personalInfoSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {personalInfoSuccess}
                </Alert>
              )}
              
              <Box sx={{ mb: 3 }}>
                {/* Username and Email on first row */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body2" color="text.secondary">
                      Username
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {formData.username}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body2" color="text.secondary">
                      Email Address
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {formData.email}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Full Name on its own row */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Full Name
                  </Typography>
                  <Typography variant="body1">
                    {formData.first_name || formData.last_name ? 
                      `${formData.first_name} ${formData.last_name}`.trim() : 
                      'Not provided'}
                  </Typography>
                </Box>
                
                {/* Phone Number on its own row */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Phone Number
                  </Typography>
                  <Typography variant="body1">
                    {formData.phone_number || 'Not provided'}
                  </Typography>
                </Box>
              </Box>
              
              {editMode && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Edit Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        id="first_name"
                        label="First Name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
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
                  
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      disabled={loading}
                      onClick={handleSubmit}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditMode(false);
                        setPersonalInfoError('');
                        setPersonalInfoSuccess('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
            
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              
              {notificationsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {notificationsError}
                </Alert>
              )}
              
              {notificationsSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {notificationsSuccess}
                </Alert>
              )}
              
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
                variant="contained"
                sx={{ 
                  mt: 2, mb: 2,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }}
                onClick={handleSaveNotifications}
              >
                Save Notification Settings
              </Button>
            </Paper>
            
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Security
              </Typography>
              
              {securityError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {securityError}
                </Alert>
              )}
              
              {securitySuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {securitySuccess}
                </Alert>
              )}
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Manage your account security settings, including password changes and two-factor authentication.
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Password
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Last changed: {user?.password_last_changed ? new Date(user.password_last_changed).toLocaleDateString() : 'Never'}
                </Typography>
                <Button
                  variant="outlined"
                  sx={{ 
                    mr: 2, mb: 2,
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      borderColor: 'primary.dark',
                      bgcolor: 'primary.light',
                    }
                  }}
                  onClick={() => setChangePasswordOpen(true)}
                >
                  Change Password
                </Button>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Two-Factor Authentication
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user?.two_factor_enabled ? 'Enabled - Your account is protected with 2FA' : 'Not enabled - Add an extra layer of security to your account'}
                </Typography>
                {user?.two_factor_enabled ? (
                  <Button
                    variant="outlined"
                    color="error"
                    sx={{ 
                      mr: 2, mb: 2,
                      borderColor: 'error.main',
                      color: 'error.main',
                      '&:hover': {
                        borderColor: 'error.dark',
                        bgcolor: 'error.light',
                      }
                    }}
                    onClick={handleDisable2FA}
                  >
                    Disable 2FA
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    sx={{ 
                      mr: 2, mb: 2,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      }
                    }}
                    onClick={handleEnable2FA}
                  >
                    Enable 2FA
                  </Button>
                )}
              </Box>
            </Paper>
            
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Help & Support
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Need assistance? Get help with your account, groups, or technical issues.
              </Typography>
              
              <Button
                variant="contained"
                sx={{ 
                  mr: 2, mt: 2, mb: 2,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }}
                onClick={() => setHelpCenterOpen(true)}
              >
                Help Center
              </Button>
              
              <Button
                variant="contained"
                sx={{ 
                  mt: 2, mb: 2,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }}
                onClick={() => setContactSupportOpen(true)}
              >
                Contact Support
              </Button>
            </Paper>
            
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Social Accounts
              </Typography>
              
              {socialError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {socialError}
                </Alert>
              )}
              
              {socialSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {socialSuccess}
                </Alert>
              )}
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Connect your social accounts to use your profile pictures and enable easier login.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Facebook */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FacebookIcon sx={{ mr: 2, color: '#1877F2' }} />
                    <Box>
                      <Typography variant="body1" fontWeight="500">
                        Facebook
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user?.connected_social_platforms?.includes('facebook') ? 'Connected' : 'Not connected'}
                      </Typography>
                    </Box>
                  </Box>
                  {user?.connected_social_platforms?.includes('facebook') ? (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<UnlinkIcon />}
                      onClick={() => handleUnlinkSocialAccount('facebook')}
                      disabled={loading}
                    >
                      Unlink
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      onClick={() => handleLinkSocialAccount('facebook')}
                      disabled={loading}
                      sx={{ borderColor: '#1877F2', color: '#1877F2' }}
                    >
                      Connect
                    </Button>
                  )}
                </Box>

                {/* LinkedIn */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LinkedInIcon sx={{ mr: 2, color: '#0077B5' }} />
                    <Box>
                      <Typography variant="body1" fontWeight="500">
                        LinkedIn
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user?.connected_social_platforms?.includes('linkedin') ? 'Connected' : 'Not connected'}
                      </Typography>
                    </Box>
                  </Box>
                  {user?.connected_social_platforms?.includes('linkedin') ? (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<UnlinkIcon />}
                      onClick={() => handleUnlinkSocialAccount('linkedin')}
                      disabled={loading}
                    >
                      Unlink
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      onClick={() => handleLinkSocialAccount('linkedin')}
                      disabled={loading}
                      sx={{ borderColor: '#0077B5', color: '#0077B5' }}
                    >
                      Connect
                    </Button>
                  )}
                </Box>

                {/* X (Twitter) */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TwitterIcon sx={{ mr: 2, color: '#000000' }} />
                    <Box>
                      <Typography variant="body1" fontWeight="500">
                        X (Twitter)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user?.connected_social_platforms?.includes('x') ? 'Connected' : 'Not connected'}
                      </Typography>
                    </Box>
                  </Box>
                  {user?.connected_social_platforms?.includes('x') ? (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<UnlinkIcon />}
                      onClick={() => handleUnlinkSocialAccount('x')}
                      disabled={loading}
                    >
                      Unlink
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      onClick={() => handleLinkSocialAccount('x')}
                      disabled={loading}
                      sx={{ borderColor: '#000000', color: '#000000' }}
                    >
                      Connect
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
        </Box>
      </Container>

      {/* Help Center Modal */}
      <Dialog 
        open={helpCenterOpen} 
        onClose={() => {
          setHelpCenterOpen(false);
          setHelpCenterTab('articles');
        }}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { maxHeight: '80vh' } }}
      >
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Help Center
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={helpCenterTab} 
              onChange={(e, newValue) => setHelpCenterTab(newValue)}
              sx={{ minHeight: 48 }}
            >
              <Tab 
                label="Help Articles" 
                value="articles" 
                sx={{ minHeight: 48, textTransform: 'none' }}
              />
              <Tab 
                label="AI Chat Support" 
                value="chat" 
                sx={{ minHeight: 48, textTransform: 'none' }}
              />
            </Tabs>
          </Box>

          {helpCenterTab === 'articles' && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Getting Started
              </Typography>
              <Typography variant="body2" paragraph>
                Welcome to TrafficJamz! Here's how to get started with our location-based social platform.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Creating Groups
              </Typography>
              <Typography variant="body2" paragraph>
                Groups allow you to connect with friends and family in real-time. Create a group, invite members, and start sharing your location.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Location Sharing
              </Typography>
              <Typography variant="body2" paragraph>
                Enable location sharing to see where your group members are and get proximity alerts when they're nearby.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Privacy & Security
              </Typography>
              <Typography variant="body2" paragraph>
                Your privacy is important to us. You control who can see your location and when location sharing is active.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Troubleshooting
              </Typography>
              <Typography variant="body2" paragraph>
                Having issues? Try refreshing the app, checking your internet connection, or clearing your browser cache.
              </Typography>
            </Box>
          )}

          {helpCenterTab === 'chat' && (
            <Box sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
              {/* Chat Messages */}
              <Box 
                sx={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  mb: 2, 
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  minHeight: '350px',
                  maxHeight: '400px',
                  bgcolor: 'grey.50'
                }}
              >
                {chatMessages.map((message) => (
                  <Box 
                    key={message.id}
                    sx={{ 
                      display: 'flex',
                      justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}
                  >
                    <Box 
                      sx={{ 
                        maxWidth: '85%',
                        p: 2,
                        borderRadius: 3,
                        bgcolor: message.type === 'user' ? 'primary.main' : 'white',
                        color: message.type === 'user' ? 'white' : 'text.primary',
                        boxShadow: 1,
                        position: 'relative'
                      }}
                    >
                      {message.type === 'bot' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }}>
                            🤖
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            AI Assistant
                          </Typography>
                        </Box>
                      )}
                      <Typography variant="body1" sx={{ lineHeight: 1.5, color: message.type === 'user' ? 'white' : 'text.primary' }}>
                        {message.content}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          display: 'block', 
                          mt: 1, 
                          opacity: 0.7,
                          textAlign: message.type === 'user' ? 'right' : 'left',
                          color: message.type === 'user' ? 'rgba(255,255,255,0.8)' : 'text.secondary'
                        }}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                
                {chatLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                    <Box 
                      sx={{ 
                        maxWidth: '85%',
                        p: 2,
                        borderRadius: 3,
                        bgcolor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        boxShadow: 1
                      }}
                    >
                      <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }}>
                        🤖
                      </Avatar>
                      <Typography variant="body1" sx={{ mr: 2, color: 'text.primary' }}>
                        AI Assistant is typing
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          bgcolor: 'primary.main', 
                          borderRadius: '50%', 
                          animation: 'typing 1.4s ease-in-out infinite both',
                          '@keyframes typing': {
                            '0%, 80%, 100%': { transform: 'scale(0)', opacity: 0.5 },
                            '40%': { transform: 'scale(1)', opacity: 1 }
                          }
                        }} />
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          bgcolor: 'primary.main', 
                          borderRadius: '50%', 
                          animation: 'typing 1.4s ease-in-out 0.16s infinite both',
                          '@keyframes typing': {
                            '0%, 80%, 100%': { transform: 'scale(0)', opacity: 0.5 },
                            '40%': { transform: 'scale(1)', opacity: 1 }
                          }
                        }} />
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          bgcolor: 'primary.main', 
                          borderRadius: '50%', 
                          animation: 'typing 1.4s ease-in-out 0.32s infinite both',
                          '@keyframes typing': {
                            '0%, 80%, 100%': { transform: 'scale(0)', opacity: 0.5 },
                            '40%': { transform: 'scale(1)', opacity: 1 }
                          }
                        }} />
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Chat Input */}
              <Box sx={{ display: 'flex', gap: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Ask me anything about TrafficJamz..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleChatKeyPress}
                  disabled={chatLoading}
                  size="small"
                  sx={{ 
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white'
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  sx={{ minWidth: 'auto', px: 3, py: 1 }}
                >
                  Send
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                AI support is available 24/7. For complex issues, contact our support team.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setHelpCenterOpen(false);
            setHelpCenterTab('articles');
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contact Support Modal */}
      <Dialog 
        open={contactSupportOpen} 
        onClose={() => setContactSupportOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Contact Support
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Need assistance? Our support team is here to help!
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Contact Information
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Email Support:
            </Typography>
            <Typography variant="body2" color="primary">
              support@trafficjamz.com
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Business Hours:
            </Typography>
            <Typography variant="body2">
              Monday - Friday: 9:00 AM - 6:00 PM EST
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Response Time:
            </Typography>
            <Typography variant="body2">
              We typically respond within 24 hours
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 3, fontStyle: 'italic' }}>
            For urgent technical issues, please include screenshots and detailed information about the problem.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactSupportOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog 
        open={changePasswordOpen} 
        onClose={() => {
          setChangePasswordOpen(false);
          setSecurityError('');
          setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Change Password
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enter your current password and choose a new secure password.
          </Typography>
          
          {securityError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {securityError}
            </Alert>
          )}
          
          <TextField
            fullWidth
            type="password"
            label="Current Password"
            name="currentPassword"
            value={passwordForm.currentPassword}
            onChange={handlePasswordChange}
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            fullWidth
            type="password"
            label="New Password"
            name="newPassword"
            value={passwordForm.newPassword}
            onChange={handlePasswordChange}
            sx={{ mb: 2 }}
            required
            helperText="Must be at least 8 characters long"
          />
          
          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            name="confirmPassword"
            value={passwordForm.confirmPassword}
            onChange={handlePasswordChange}
            sx={{ mb: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setChangePasswordOpen(false);
              setSecurityError('');
              setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              });
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            disabled={loading}
            onClick={handleSubmitPasswordChange}
          >
            {loading ? <CircularProgress size={20} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enable 2FA Modal */}
      <Dialog 
        open={enable2FAOpen} 
        onClose={() => {
          setEnable2FAOpen(false);
          setSecurityError('');
          setTwoFactorSecret('');
          setTwoFactorQR('');
          setTwoFactorToken('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Enable Two-Factor Authentication
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Scan the QR code below with your authenticator app (like Google Authenticator, Authy, or similar), then enter the 6-digit code to complete setup.
          </Typography>
          
          {securityError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {securityError}
            </Alert>
          )}
          
          {twoFactorQR && (
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                Scan this QR code with your authenticator app:
              </Typography>
              <img 
                src={twoFactorQR} 
                alt="2FA QR Code" 
                style={{ maxWidth: '200px', maxHeight: '200px' }} 
              />
            </Box>
          )}
          
          {twoFactorSecret && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Or manually enter this secret key:
              </Typography>
              <TextField
                fullWidth
                value={twoFactorSecret}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Keep this secret key safe. You can use it to restore 2FA if you lose your device.
              </Typography>
            </Box>
          )}
          
          <TextField
            fullWidth
            label="6-digit code from authenticator app"
            value={twoFactorToken}
            onChange={(e) => setTwoFactorToken(e.target.value)}
            inputProps={{ maxLength: 6 }}
            sx={{ mb: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setEnable2FAOpen(false);
              setSecurityError('');
              setTwoFactorSecret('');
              setTwoFactorQR('');
              setTwoFactorToken('');
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            disabled={loading || twoFactorToken.length !== 6}
            onClick={handleVerify2FA}
          >
            {loading ? <CircularProgress size={20} /> : 'Enable 2FA'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
