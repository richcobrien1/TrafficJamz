import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  Divider,
  IconButton,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  Snackbar,
  Link,
  Tabs,
  Tab,
  Chip,
  Menu,
  MenuItem
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Mic as MicIcon, 
  LocationOn as LocationIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExitToApp as LeaveIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../../services/api'; // Adjust the path as needed to point to your api.js file
import { useAuth } from '../../contexts/AuthContext';

const GroupDetail = () => {
  // Force rebuild - ensure equal panel widths
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState('private');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteTextMsg, setInviteTextMsg] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMode, setEditMode] = useState(false); // Add this line
  const [editDescription, setEditDescription] = useState('');
  const [selectedEditAvatar, setSelectedEditAvatar] = useState('');
  const [editAvatarOptions, setEditAvatarOptions] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openCancelInviteDialog, setOpenCancelInviteDialog] = useState(false);
  const [cancelInviteLoading, setCancelInviteLoading] = useState(false);
  const [inviteToCancel, setInviteToCancel] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAudioSession, setShowAudioSession] = useState(false);  // In your GroupDetails component
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState({});
  const [audioSessionActive, setAudioSessionActive] = useState(false); // Audio session state
  const [locationTrackingActive, setLocationTrackingActive] = useState(false); // Location tracking state
  const [serviceStatusError, setServiceStatusError] = useState(false); // Track if status check is failing
  const [pollInterval, setPollInterval] = useState(10000); // Dynamic poll interval (10s default)
  const { user } = useAuth();
  const navigate = useNavigate();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarLink, setSnackbarLink] = useState(null);
  
  // Ref for location tracking watch
  const watchIdRef = useRef(null);

  // Poll interval id ref-like state not necessary; use effect cleanup

  // Add useEffect to initialize form fields when group data is loaded
  useEffect(() => {
    if (group) {
      setGroupName(group.name || '');
      setGroupDescription(group.description || '');
      setPrivacyLevel(group.privacy_level || 'private');
      setAvatarUrl(group.avatar_url || '');
    }
  }, [group]);
  
  const generateEditAvatarOptions = (groupName) => {
    if (!groupName.trim()) {
      setEditAvatarOptions([]);
      return;
    }
    
    // Generate 8 different avatar styles based on group name
    const styles = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'micah', 'personas', 'shapes'];
    const options = styles.map(style => 
      `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(groupName)}&size=200`
    );
    setEditAvatarOptions(options);
    // Keep current avatar selected if it exists, otherwise select first option
    if (!selectedEditAvatar && options.length > 0) {
      setSelectedEditAvatar(group?.avatar_url || options[0]);
    }
  };
  
  useEffect(() => {
    fetchGroupDetails();
    fetchInvitations();
    checkServiceStatus();
    
    // Dynamic poll interval based on connection status
    const statusPoll = setInterval(() => {
      checkServiceStatus();
    }, pollInterval);
    
    // poll invitations every 20s so the pending pill and list refresh automatically
    const invitePoll = setInterval(() => {
      fetchInvitations();
    }, 20000);

    return () => {
      clearInterval(statusPoll);
      clearInterval(invitePoll);
    };
  }, [groupId, pollInterval]);

  // Auto-start audio session when viewing group
  useEffect(() => {
    console.log('🔍 Audio useEffect fired - groupId:', groupId, 'user:', user);
    
    const userId = user?.user?.id || user?.id;
    if (!groupId || !userId) {
      console.log('⏸️ Audio auto-start skipped - groupId:', groupId, 'userId:', userId);
      return;
    }

    let isActive = true;

    const startAudioSession = async () => {
      try {
        console.log('🎤 Auto-starting audio session for group:', groupId);
        
        // Check if session already exists
        const checkResponse = await api.get(`/audio/sessions/group/${groupId}`);
        if (checkResponse.data?.session) {
          console.log('✅ Audio session already exists:', checkResponse.data.session.id);
          return;
        }
      } catch (error) {
        // Session doesn't exist, create it
        if (error.response?.status === 404) {
          try {
            const createResponse = await api.post('/audio/sessions', {
              group_id: groupId,
              session_type: 'voice_only',
              device_type: 'web'
            });
            console.log('✅ Audio session created:', createResponse.data.session?.id);
          } catch (createError) {
            console.warn('Failed to create audio session:', createError.message);
          }
        }
      }
    };

    if (isActive) {
      startAudioSession();
    }

    return () => {
      isActive = false;
    };
  }, [groupId, user]);

  // Auto-start location tracking when viewing group
  useEffect(() => {
    console.log('🔍 Location useEffect fired - groupId:', groupId, 'user:', user);
    
    const userId = user?.user?.id || user?.id;
    if (!groupId || !userId) {
      console.log('⏸️ Location auto-start skipped - groupId:', groupId, 'userId:', userId);
      // Stop watching if no group or user
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('⏹️ Stopped location tracking (no group/user)');
      }
      return;
    }

    console.log('🎯 Auto-starting location tracking for group:', groupId, 'userId:', userId);

    // Request permission first
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
        
        const locationData = {
          latitude,
          longitude,
          accuracy,
          altitude: altitude || 0,
          heading: heading || 0,
          speed: speed || 0
        };

        console.log('📍 Location update (GroupDetail):', locationData);

        // Save to backend via API
        api.post('/location/update', {
          coordinates: locationData,
          device_id: navigator.userAgent,
          battery_level: 85 // TODO: Get actual battery level if available
        }).then(() => {
          console.log('✅ Location sent to backend');
        }).catch(err => {
          console.warn('⚠️ Failed to save location to API:', err.message);
        });
      },
      (error) => {
        console.error('❌ Geolocation error (GroupDetail):', error.code, error.message);
        if (error.code === 1) {
          console.error('❌ Location permission denied - please allow location access');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    watchIdRef.current = watchId;
    console.log('✅ Location watch started with ID:', watchId);

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log('⏹️ Stopped location tracking on cleanup');
      }
    };
  }, [groupId, user]);

  // Check if audio session or location tracking is active
  const checkServiceStatus = async () => {
    try {
      // Check audio session status
      const audioResponse = await api.get(`/audio/audio-session/${groupId}/status`);
      console.log('🎤 Audio status response:', audioResponse.data);
      setAudioSessionActive(audioResponse.data?.active || false);
      
      // Check location tracking status (check if any members are sharing location)
      const locationResponse = await api.get(`/location/location-tracking/${groupId}/active`);
      console.log('📍 Location status response:', locationResponse.data);
      setLocationTrackingActive(locationResponse.data?.active || false);
      
      console.log('Panel states - Audio:', audioResponse.data?.active, 'Location:', locationResponse.data?.active);
      
      // Success - reset to fast polling and clear error
      setServiceStatusError(false);
      setPollInterval(10000); // 10 seconds
      
    } catch (error) {
      console.debug('Service status check error:', error.message);
      setServiceStatusError(true);
      
      // Exponential backoff: if 404 (not found) use 10s, if network error use 2min
      if (error.response?.status === 404) {
        // Endpoint doesn't exist yet, check every 10s
        setPollInterval(10000);
      } else {
        // Network or server error, slow down to 2 minutes
        setPollInterval(120000);
      }
    }
  };
  
  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
  const response = await api.get(`/groups/${groupId}`);
      setGroup(response.data.group);
      setEditName(response.data.group.name);
      setCreatedAt(response.data.group.createdAt);
      setEditDescription(response.data.group.description || '');
      setError('');
    } catch (error) {
      console.error('Error fetching group details:', error);
      setError('Failed to load group details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchInvitations = async () => {
    try {
      setInvitationsLoading(true);
      console.log('Fetching invitations for group:', groupId);
      const response = await api.get(`/groups/${groupId}/invitations`);
      console.log('Invitations response:', response.data);
      const invitationsList = response.data.invitations || [];
      console.log('Setting invitations:', invitationsList.length, 'items');
      setInvitations(invitationsList);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty array on error so UI shows "No pending invitations"
      setInvitations([]);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const inviteCountForEmail = (email) => {
    if (!email || !invitations) return 0;
    // Prefer server-provided invite_count on any invitation matching this email
    const serverCount = invitations.find(i => i.email && i.email.toLowerCase() === email.toLowerCase() && i.invite_count);
    if (serverCount && serverCount.invite_count) return serverCount.invite_count;
    return invitations.filter(i => i.email && i.email.toLowerCase() === email.toLowerCase()).length;
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Fetch invitations when switching to the invitations tab
    if (newValue === 1) {
      fetchInvitations();
    }
  };
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('Text not available at this time');
      return;
    }
    
    try {
      setInviteLoading(true);
      setInviteError('');
      
      console.log('Sending invitation to:', inviteEmail);
      const response = await api.post(`/groups/${groupId}/invitations`, {
        email: inviteEmail,
        phoneNumber: invitePhone || undefined,
        text: inviteTextMsg || undefined
      }, {
        timeout: 60000 // 60 second timeout for email sending
      });
      
      console.log('Invitation response:', response.data);
      
      // Reset form fields after successful invitation
      setInviteEmail('');
      setInvitePhone('');
      setInviteTextMsg('');
      setOpenInviteDialog(false);
      
      // Refresh the invitations list
      fetchInvitations();
      
      // Show success message
      setSnackbarMsg('Invitation sent successfully!');
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error inviting member:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMsg = 'Failed to send invitation. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timed out. The invitation may still be processing. Please check the Invited tab in a moment.';
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setInviteError(errorMsg);
    } finally {
      setInviteLoading(false);
    }
  };
  
  const handleEditGroup = async () => {
    try {
      setSubmitting(true); // Now this will work
      
  console.log('Sending PUT request to:', `/groups/${groupId}`);
      console.log('Request data:', {
        group_name: editName,
        group_description: editDescription,
        // TODO other fields...
      });
      
      // Determine avatar URL to send (use selected or keep existing)
      const avatarToSend = selectedEditAvatar || avatarUrl;
      
  const response = await api.put(`/groups/${groupId}`, {
        group_name: editName,
        group_description: editDescription,
        privacy_level: privacyLevel,
        avatar_url: avatarToSend
      });
      
      console.log('Update response:', response.data);
      
      // Update only the changed fields instead of replacing the entire group object
      // to preserve member details that might not be included in the update response
      setGroup(prevGroup => ({
        ...prevGroup,
        name: response.data.group.name || response.data.group.group_name,
        description: response.data.group.description || response.data.group.group_description,
        privacy_level: response.data.group.privacy_level,
        avatar_url: response.data.group.avatar_url,
        updatedAt: response.data.group.updatedAt
      }));
      setEditMode(false);
      setOpenEditDialog(false); // Close the dialog after successful save
      setEditAvatarOptions([]);
      setSelectedEditAvatar('');
      setError('');
    } catch (error) {
      console.error('Error updating group:', error);
      setError(error.response?.data?.message || 'Failed to update group. Please try again.');
    } finally {
      setSubmitting(false); // And this will work too
    }
  };
  
  const handleDeleteGroup = async () => {
    try {
      if (!group || !group.members || !Array.isArray(group.members)) {
        setError('Group information is not available.');
        return;
      }
      
      // Find the owner in the members array
      const ownerMember = group.members.find(member => member.role === 'owner');
      
      if (!ownerMember || !ownerMember.user_id) {
        setError('Owner information is not available.');
        return;
      }
      
      // Use the MongoDB _id format
      const correctGroupId = group.id || groupId;
      
      console.log('Using group ID:', correctGroupId);
      
      setDeleteLoading(true);
      
      // Try using the exact MongoDB _id format
  await api.delete(`/groups/${correctGroupId}`, {
        data: { 
          owner_id: ownerMember.user_id,
          // Include the ID in the body as well in case the route expects it there
          group_id: correctGroupId
        }
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error deleting group:', error);
      console.error('Response data:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to delete group. Please try again.');
    } finally {
      setDeleteLoading(false);
      setOpenDeleteDialog(false);
    }
  };
  
  
  const handleLeaveGroup = async (user_id, navigateAway = true) => {
    try {
      await api.delete(`/groups/${groupId}/members/${user_id}`);
      if (navigateAway) {
        navigate('/');
      } else {
        // Refresh group details so the members list updates in-place
        await fetchGroupDetails();
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };
  
  const isOwner = group?.owner_id === user?.id;
  const isMenuOpen = Boolean(anchorEl);
  
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
            {loading ? 'Loading...' : group?.name}
          </Typography>
          <IconButton
            edge="end"
            aria-label="group options"
            aria-controls="group-menu"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
          >
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Menu
        id="group-menu"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={isMenuOpen}
        onClose={handleMenuClose}
      >
        {isOwner && (
          <MenuItem onClick={() => { handleMenuClose(); setOpenEditDialog(true); }}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit Group
          </MenuItem>
        )}
        <MenuItem onClick={() => { handleMenuClose(); setOpenInviteDialog(true); }}>
          <PersonAddIcon fontSize="small" sx={{ mr: 1 }} />
          Invite Member
        </MenuItem>
        {isOwner ? (
          <MenuItem onClick={() => { handleMenuClose(); setOpenDeleteDialog(true); }} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete Group
          </MenuItem>
        ) : (
          <MenuItem onClick={() => { handleMenuClose(); handleLeaveGroup(); }} sx={{ color: 'error.main' }}>
            <LeaveIcon fontSize="small" sx={{ mr: 1 }} />
            Leave Group
          </MenuItem>
        )}
      </Menu>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Container sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} centered>
              <Tab label="Details" />
              <Tab label="Members" />
              <Tab label="Invited" />
            </Tabs>
          </Box>
          
          <Container component="main" sx={{ flexGrow: 1, py: 4, maxWidth: 'none !important', px: 2 }}>
            {tabValue === 0 ? (
              <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      src={group.avatar_url}
                      sx={{ width: 80, height: 80, mr: 3 }}
                    >
                      {group.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" component="h1">
                        {group.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {group.members?.length || 0} members • Created {new Date(group.createdAt).toLocaleDateString()}
                      </Typography>
                      <Chip 
                        label={group.privacy_level} 
                        size="small" 
                        color={group.privacy_level === 'public' ? 'success' : 'primary'}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Box>

                  {group.description && (
                    <Typography variant="body1" paragraph>
                      {group.description}
                    </Typography>
                  )}
                </Paper>
                
                <Box 
                  sx={{ 
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                    width: '100%'
                  }}
                >
                  <Box sx={{ flex: '0 0 calc(50% - 8px)', minWidth: 0 }}>
                    <Paper 
                      sx={{ 
                        p: 3,
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        minHeight: 200,
                        height: '100%',
                        border: audioSessionActive ? '3px solid' : '1px solid',
                        borderColor: audioSessionActive ? 'primary.main' : 'divider',
                        boxShadow: audioSessionActive ? 4 : 1,
                        bgcolor: audioSessionActive ? 'primary.main' : 'background.paper',
                        color: audioSessionActive ? '#fff' : 'inherit',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          boxShadow: 6
                        },
                        '& .MuiTypography-root': {
                          color: audioSessionActive ? '#fff' : 'inherit'
                        }
                      }}
                      onClick={() => navigate(`/audio-session/${groupId}`)}
                    >
                      <Avatar sx={{ 
                        bgcolor: audioSessionActive ? 'rgba(255, 255, 255, 0.2)' : 'primary.light', 
                        color: audioSessionActive ? '#fff' : 'inherit',
                        width: 60, 
                        height: 60, 
                        mb: 2,
                        animation: audioSessionActive ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.7)' },
                          '70%': { boxShadow: '0 0 0 10px rgba(255, 255, 255, 0)' },
                          '100%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)' }
                        }
                      }}>
                        <MicIcon fontSize="large" />
                      </Avatar>
                      <Typography variant="h6" gutterBottom align="center">
                        {audioSessionActive ? 'Audio Active' : 'Audio'}
                      </Typography>
                      <Typography variant="body2" align="center">
                        {audioSessionActive 
                          ? 'Click to join the active audio conversation'
                          : 'Start or join a real-time audio conversation with group members'
                        }
                      </Typography>
                      {audioSessionActive && (
                        <Chip 
                          label="ACTIVE" 
                          color="primary" 
                          size="small" 
                          sx={{ mt: 1, fontWeight: 'bold' }}
                        />
                      )}
                    </Paper>
                  </Box>

                  <Box sx={{ flex: '0 0 calc(50% - 8px)', minWidth: 0 }}>
                    <Paper 
                      sx={{ 
                        p: 3,
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        minHeight: 200,
                        height: '100%',
                        border: locationTrackingActive ? '3px solid' : '1px solid',
                        borderColor: locationTrackingActive ? 'secondary.main' : 'divider',
                        boxShadow: locationTrackingActive ? 4 : 1,
                        bgcolor: locationTrackingActive ? 'secondary.main' : 'background.paper',
                        color: locationTrackingActive ? '#fff' : 'inherit',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          boxShadow: 6
                        },
                        '& .MuiTypography-root': {
                          color: locationTrackingActive ? '#fff' : 'inherit'
                        }
                      }}
                      onClick={() => navigate(`/location-tracking/${groupId}`)}
                    >
                      <Avatar sx={{ 
                        bgcolor: locationTrackingActive ? 'rgba(255, 255, 255, 0.2)' : 'secondary.light',
                        color: locationTrackingActive ? '#fff' : 'inherit',
                        width: 60, 
                        height: 60, 
                        mb: 2,
                        animation: locationTrackingActive ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.7)' },
                          '70%': { boxShadow: '0 0 0 10px rgba(255, 255, 255, 0)' },
                          '100%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)' }
                        }
                      }}>
                        <LocationIcon fontSize="large" />
                      </Avatar>
                      <Typography variant="h6" gutterBottom align="center">
                        {locationTrackingActive ? 'Locator Active' : 'Locator'}
                      </Typography>
                      <Typography variant="body2" align="center">
                        {locationTrackingActive
                          ? 'Members are sharing their location - click to view'
                          : 'View the location of your group members on the map'
                        }
                      </Typography>
                      {locationTrackingActive && (
                        <Chip 
                          label="ACTIVE" 
                          color="secondary" 
                          size="small" 
                          sx={{ mt: 1, fontWeight: 'bold' }}
                        />
                      )}
                    </Paper>
                  </Box>
                </Box>
              </Box>
            ) : tabValue === 1 ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Members ({group.members?.length || 0})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      variant="outlined" 
                      startIcon={<PersonAddIcon />}
                      onClick={() => setOpenInviteDialog(true)}
                    >
                      Invite
                    </Button>
                    {/* Temporarily hidden - Create functionality moved to map interface
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        // Navigate to location tracking and signal to open create-place dialog
                        navigate(`/location-tracking/${groupId}`, { state: { openCreatePlace: true } });
                      }}
                    >
                      Create
                    </Button>
                    */}
                  </Box>
                </Box>
                
                <Paper>
                  <List>
                    {group.members && group.members.length > 0 ? (
                      group.members.map((member, index) => (
                        member && member.user_id ? (
                          <React.Fragment key={member.user_id}>
                            <ListItem
                              secondaryAction={
                                isOwner && member.user_id !== user?.user_id && member.role !== 'owner' ? (
                                  <IconButton edge="end" aria-label="remove" onClick={() => { handleLeaveGroup(member.user_id, false); }}>
                                    <DeleteIcon />
                                  </IconButton>
                                ) : 'Owner'
                              }
                            >
                                <ListItemAvatar>
                                  <Badge
                                    badgeContent={inviteCountForEmail(member.email) || null}
                                    color="primary"
                                    overlap="circular"
                                  >
                                    <Avatar 
                                      src={
                                        member.profile_image_url || 
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(`${member.first_name || ''} ${member.last_name || ''}`.trim())}&background=random&size=128`
                                      }
                                      alt={`${member.first_name} ${member.last_name}`}
                                    >
                                      {member.first_name?.[0]}
                                    </Avatar>
                                  </Badge>
                                </ListItemAvatar>
                              <ListItemText 
                                disableTypography
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body1">
                                      {`${member.first_name || ''} ${member.last_name || ''}`}
                                      {member.user_id === user?.user_id && ' (You)'}
                                    </Typography>
                                    {member.user_id === group.owner_id && (
                                      <Chip 
                                        label="Owner" 
                                        size="small" 
                                        color="primary"
                                      />
                                    )}
                                  </Box>
                                }
                                secondary={member.email}
                              />
                            </ListItem>
                            {index < group.members.length - 1 && <Divider />}
                          </React.Fragment>
                        ) : null
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText primary="No members found" />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Pending Invitations ({invitations?.length || 0})
                  </Typography>
                  {/* Circular blue action button to match Group-add style */}
                  <Button
                    onClick={() => setOpenInviteDialog(true)}
                    sx={{
                      minWidth: 48,
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'common.white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    <PersonAddIcon />
                  </Button>
                </Box>
                
                <Paper>
                  {invitationsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : invitations && invitations.length > 0 ? (
                    <List>
                      {invitations.map((invitation, index) => {
                        const invId = invitation.id || invitation._id || index;
                        return (
                        <React.Fragment key={invId}>
                          <ListItem>
                            <ListItemAvatar>
                              {/* show badge with count of how many times this email appears in invitations */}
                              <Badge
                                badgeContent={
                                  // Prefer server-provided invite_count, fallback to local count
                                  (invitation.invite_count && invitation.invite_count > 0)
                                    ? invitation.invite_count
                                    : (invitations.filter(i => i.email === invitation.email).length || null)
                                }
                                color="primary"
                                overlap="circular"
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                              >
                                <Tooltip title={`Invited ${invitation.invite_count && invitation.invite_count > 0 ? invitation.invite_count : invitations.filter(i => i.email === invitation.email).length} times`}>
                                  <Avatar>
                                    <PersonIcon />
                                  </Avatar>
                                </Tooltip>
                              </Badge>
                            </ListItemAvatar>
                            <ListItemText 
                              primary={invitation.email}
                              secondary={
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Invited {new Date(invitation.invited_at).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Expires {new Date(invitation.expires_at).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              }
                            />
                            {/* Replace status chip with resend (refresh) action for pending invitations */}
                            {invitation.status === 'pending' ? (
                              <Box sx={{ ml: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                                <IconButton
                                  aria-label="resend-invitation"
                                  size="small"
                                  onClick={async () => {
                                    try {
                                      setResendLoading(l => ({ ...l, [invId]: true }));
                                      const resp = await api.post(`/groups/${groupId}/invitations/${invId}/resend`, {}, {
                                        timeout: 60000 // 60 second timeout for email sending
                                      });
                                      // refresh invitations after successful resend
                                      await fetchInvitations();
                                      const preview = resp?.data?.previewUrl || resp?.data?.invitation?.emailPreviewUrl || null;
                                      if (preview) {
                                        setSnackbarMsg('Invitation resent — preview:');
                                        setSnackbarLink(preview);
                                        setSnackbarOpen(true);
                                      } else {
                                        setSnackbarMsg('Invitation resent');
                                        setSnackbarLink(null);
                                        setSnackbarOpen(true);
                                      }
                                    } catch (err) {
                                      console.error('Error resending invitation:', err);
                                      
                                      let errorMsg = 'Failed to resend invitation';
                                      if (err.code === 'ECONNABORTED') {
                                        errorMsg = 'Request timed out. The invitation may still be processing.';
                                      }
                                      
                                      setSnackbarMsg(errorMsg);
                                      setSnackbarLink(null);
                                      setSnackbarOpen(true);
                                    } finally {
                                      setResendLoading(l => ({ ...l, [invId]: false }));
                                    }
                                  }}
                                >
                                  {resendLoading[invId] ? (
                                    <CircularProgress size={18} />
                                  ) : (
                                    <RefreshIcon fontSize="small" />
                                  )}
                                </IconButton>

                                {/* Delete / Cancel invitation button */}
                                <IconButton
                                  aria-label="cancel-invitation"
                                  size="small"
                                  onClick={() => {
                                    setInviteToCancel({ id: invId, email: invitation.email });
                                    setOpenCancelInviteDialog(true);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ) : (
                              <Chip 
                                label={invitation.status} 
                                size="small" 
                                color={invitation.status === 'accepted' ? 'success' : 'error'}
                                sx={{ ml: 2 }}
                              />
                            )}
                          </ListItem>
                          {index < invitations.length - 1 && <Divider />}
                        </React.Fragment>
                      );
                      })}
                    </List>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        No pending invitations
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Send invitations to grow your group!
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            )}
          </Container>
        </>
      )}
      
      {/* Invite Member Dialog */}
      <Dialog open={openInviteDialog} onClose={() => setOpenInviteDialog(false)}>
        <DialogTitle>Invite Member</DialogTitle>
        <DialogContent>
          {inviteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {inviteError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            id="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            id="phone"
            label="Mobile Phone (Optional)"
            type="tel"
            fullWidth
            variant="outlined"
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            helperText="For SMS notifications (e.g., +12025551234)"
          />
          <TextField
            margin="dense"
            id="message"
            label="Custom Message (Optional)"
            type="text"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={inviteTextMsg}
            onChange={(e) => setInviteTextMsg(e.target.value)}
            helperText="Personalize the invitation message"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInviteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleInviteMember} 
            variant="contained"
            disabled={inviteLoading}
          >
            {inviteLoading ? <CircularProgress size={24} /> : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Group Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Group Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editName}
            onChange={(e) => {
              setEditName(e.target.value);
              generateEditAvatarOptions(e.target.value);
            }}
            required
          />
          <TextField
            margin="dense"
            id="description"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
          {editAvatarOptions.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Select a Group Avatar
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {editAvatarOptions.map((url, index) => (
                  <Avatar
                    key={index}
                    src={url}
                    sx={{
                      width: 60,
                      height: 60,
                      cursor: 'pointer',
                      border: selectedEditAvatar === url ? '3px solid #1976d2' : '2px solid transparent',
                      '&:hover': { opacity: 0.7 }
                    }}
                    onClick={() => setSelectedEditAvatar(url)}
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleEditGroup} 
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Group Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this group? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteGroup} 
            variant="contained"
            color="error"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Cancel Invitation Dialog */}
      <Dialog open={openCancelInviteDialog} onClose={() => { setOpenCancelInviteDialog(false); setInviteToCancel(null); }}>
        <DialogTitle>Cancel Invitation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel the invitation to {inviteToCancel?.email}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenCancelInviteDialog(false); setInviteToCancel(null); }}>No</Button>
          <Button 
            onClick={async () => {
              if (!inviteToCancel) return;
              try {
                setCancelInviteLoading(true);
                const resp = await api.delete(`/groups/${groupId}/invitations/${inviteToCancel.id}`);
                if (resp?.data?.success) {
                  setSnackbarMsg('Invitation cancelled');
                  setSnackbarLink(null);
                  setSnackbarOpen(true);
                  // Refresh list
                  await fetchInvitations();
                } else {
                  setSnackbarMsg('Failed to cancel invitation');
                  setSnackbarOpen(true);
                }
              } catch (err) {
                console.error('Error cancelling invitation:', err);
                setSnackbarMsg(err.response?.data?.message || 'Failed to cancel invitation');
                setSnackbarOpen(true);
              } finally {
                setCancelInviteLoading(false);
                setOpenCancelInviteDialog(false);
                setInviteToCancel(null);
              }
            }}
            variant="contained"
            color="error"
            disabled={cancelInviteLoading}
          >
            {cancelInviteLoading ? <CircularProgress size={20} /> : 'Yes, Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={10000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMsg}
        action={
          snackbarLink ? (
            <Link href={snackbarLink} target="_blank" rel="noopener" color="inherit" sx={{ textDecoration: 'underline', ml: 1 }}>
              Open preview
            </Link>
          ) : null
        }
      />
    </Box>
  );
};

export default GroupDetail;
