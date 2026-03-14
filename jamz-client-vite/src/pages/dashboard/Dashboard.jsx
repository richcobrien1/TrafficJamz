// jamz-client-vite/src/pages/dashboard/Dashboard.jsx
// This file is part of the TrafficJamz project.

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Fab,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Mic as MicIcon,
  LocationOn as LocationIcon,
  ExitToApp as LogoutIcon,
  SmartToy as AIIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useUser, useClerk } from '@clerk/clerk-react';
import AIChatAssistant from '../../components/AIChatAssistant';
import sessionService from '../../services/session.service';
import { dbManager } from '../../services/indexedDBManager';
import { getAvatarContent, getAvatarFallback } from '../../utils/avatar.utils';
import { clearBackendTokens } from '../../utils/clerkBackendSync';

const Dashboard = () => {
  const [groups, setGroups] = useState(() => {
    // Try to load cached groups immediately for instant display
    const cached = sessionService.getCachedGroupsData();
    return cached || [];
  });
  const [loading, setLoading] = useState(() => {
    // Start with loading=false if we have cached data
    const cached = sessionService.getCachedGroupsData();
    return !cached;
  });
  const [error, setError] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [avatarOptions, setAvatarOptions] = useState([]);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [createGroupError, setCreateGroupError] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);

  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [backendUser, setBackendUser] = React.useState(() => {
    // Try to load from cache on first render for instant display
    const cached = sessionService.getCachedUserData();
    return cached || null;
  });
  const [hasToken, setHasToken] = React.useState(() => !!localStorage.getItem('token'));
  const profileFetchedRef = React.useRef(false);
  const lastUserCacheTimestamp = React.useRef(null);
  const groupsFetchedRef = React.useRef(false);
  const hasInitialGroupsRef = React.useRef((() => {
    // Check if we have cached groups on mount
    const cached = sessionService.getCachedGroupsData();
    return !!cached && cached.length > 0;
  })());

  // Monitor token changes (clerk-sync completion)
  React.useEffect(() => {
    const checkToken = () => {
      const token = !!localStorage.getItem('token');
      if (token !== hasToken) {
        setHasToken(token);
        // When token appears, reload cached user data immediately
        if (token && !hasToken) {
          const cached = sessionService.getCachedUserData();
          if (cached) {
            setBackendUser(cached);
            console.log('✅ Loaded backend user from cache after clerk-sync');
          }
        }
      }
    };
    
    // Check immediately and set up interval
    checkToken();
    const interval = setInterval(checkToken, 200); // Check every 200ms
    
    return () => clearInterval(interval);
  }, [hasToken]);

  // Fetch backend user profile to get actual profile image from Supabase
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (token && clerkUser) {
        // Check if cache was updated since our last fetch
        const cacheTimestamp = localStorage.getItem('jamz_user_timestamp');
        const shouldRefetch = !profileFetchedRef.current || 
                             (cacheTimestamp && cacheTimestamp !== lastUserCacheTimestamp.current);
        
        if (shouldRefetch) {
          profileFetchedRef.current = true;
          lastUserCacheTimestamp.current = cacheTimestamp;
          
          try {
            const response = await api.get('/users/profile');
            if (response.data.success && response.data.user) {
              setBackendUser(response.data.user);
              // Cache for next time
              sessionService.cacheUserData(response.data.user);
              console.log('✅ User profile refreshed with latest avatar');
            }
          } catch (error) {
            console.warn('⚠️ Could not fetch backend user profile:', error.message);
            profileFetchedRef.current = false; // Reset on error for retry
          }
        }
      }
    };
    
    if (clerkUser && hasToken) {
      fetchUserProfile();
    }
  }, [clerkUser, hasToken]);

  // Map Clerk user + backend profile to format expected by avatar utils
  // Memoized to prevent unnecessary re-renders
  const currentUser = useMemo(() => {
    if (!clerkUser) return null;
    
    return {
      profile_image_url: backendUser?.profile_image_url || clerkUser.imageUrl || clerkUser.profileImageUrl,
      full_name: backendUser?.full_name || clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      username: backendUser?.username || clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0],
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName
    };
  }, [clerkUser, backendUser]);

  const fetchGroups = React.useCallback(async () => {
    console.log('🔄 fetchGroups() called', { 
      alreadyFetched: groupsFetchedRef.current, 
      hasInitialData: hasInitialGroupsRef.current,
      timestamp: new Date().toISOString()
    });
    
    // Prevent multiple simultaneous fetches
    if (groupsFetchedRef.current) {
      console.log('⏭️ Skipping groups fetch - already fetched');
      return;
    }
    groupsFetchedRef.current = true;
    
    try {
      // If we already have groups loaded from initial state, don't show loading spinner
      const hasInitialData = hasInitialGroupsRef.current;
      if (!hasInitialData) {
        setLoading(true);
      }
      
      let cacheLoaded = hasInitialData; // Already loaded in initial state
      
      // Only check cache if we don't already have data
      if (!hasInitialData) {
        // Try cached data first for instant display (localStorage - fast)
        const cachedGroups = sessionService.getCachedGroupsData();
        if (cachedGroups) {
          console.log('📦 Using cached groups data from localStorage');
          setGroups(cachedGroups);
          setLoading(false); // Turn off loading immediately when we have cache
          cacheLoaded = true;
        } else {
          // Fallback to IndexedDB if localStorage is empty/expired
          try {
            const idbGroups = await dbManager.getGroups();
            if (idbGroups && idbGroups.length > 0) {
              console.log('📦 Using cached groups data from IndexedDB (localStorage was empty)');
              setGroups(idbGroups);
              // Restore to localStorage for faster access next time
              sessionService.cacheGroupsData(idbGroups);
              setLoading(false);
              cacheLoaded = true;
            }
          } catch (idbError) {
            console.warn('Failed to load from IndexedDB:', idbError);
          }
        }
      }
      
      // Only fetch if online
      if (!navigator.onLine) {
        console.log('📴 Offline - using cached data only');
        if (!cacheLoaded) {
          setError('📴 Offline mode - Connect to internet to load groups.');
        }
        if (!hasInitialData) {
          setLoading(false);
        }
        return;
      }
      
      // Fetch fresh data (silently in background if we have cache)
      console.log('🌐 Fetching fresh groups from API...', new Date().toISOString());
      const response = await api.get('/groups');
      console.log('✅ Groups API response received', response.data.groups?.length, 'groups');
      
      // Always update with fresh data
      setGroups(response.data.groups);
      
      // Cache fresh data in BOTH locations
      sessionService.cacheGroupsData(response.data.groups);
      await dbManager.saveGroups(response.data.groups);
      
      setError('');
    } catch (error) {
      console.error('Error fetching groups:', error);
      
      // If we have cached data, use it and show a warning
      const cachedGroups = sessionService.getCachedGroupsData();
      if (cachedGroups && cachedGroups.length > 0) {
        console.log('⚠️ Using cached groups due to fetch error');
        setGroups(cachedGroups);
        setError(''); // Don't show error if we have cached data
      } else {
        // Try IndexedDB fallback
        try {
          const idbGroups = await dbManager.getGroups();
          if (idbGroups && idbGroups.length > 0) {
            console.log('⚠️ Using IndexedDB groups due to fetch error');
            setGroups(idbGroups);
            setError(''); // Don't show error if we have cached data
            return;
          }
        } catch (idbError) {
          console.warn('Failed to load from IndexedDB fallback:', idbError);
        }
        
        // No cache - show error based on connection state
        if (navigator.onLine) {
          setError('Failed to load groups. Please check your connection.');
        } else {
          setError('📴 Offline mode - Connect to internet to load groups.');
        }
      }
    } finally {
      setLoading(false); // CRITICAL: Always turn off loading
    }
  }, []); // No dependencies - fetchGroups doesn't need to recreate

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleLogout = async () => {
    // Clear backend JWT tokens
    clearBackendTokens();
    
    // Clear user cache
    sessionService.clearUserCache();
    
    // Sign out from Clerk with explicit redirect
    await signOut({ redirectUrl: '/auth/login' });
  };

  const generateAvatarOptions = (groupName) => {
    if (!groupName.trim()) {
      setAvatarOptions([]);
      return;
    }
    
    // Generate 8 different avatar styles based on group name
    const styles = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'micah', 'personas', 'shapes'];
    const options = styles.map(style => 
      `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(groupName)}&size=200`
    );
    setAvatarOptions(options);
    setSelectedAvatar(options[0]); // Select first one by default
  };
  
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setCreateGroupError('Group name is required');
      return;
    }

    try {
      setCreateGroupLoading(true);
      setCreateGroupError('');

  const response = await api.post('/groups', {
        group_name: newGroupName,
        group_description: newGroupDescription,
        avatar_url: selectedAvatar
      });

      setGroups((prev) => [...prev, response.data.group]);
      setOpenCreateDialog(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedAvatar('');
      setAvatarOptions([]);
    } catch (error) {
      setCreateGroupError(error.response?.data?.message || 'Failed to create group. Please try again.');
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const handleGroupClick = (groupId) => {
    console.log('🔵 Group clicked, navigating to:', `/groups/${groupId}`);
    try {
      navigate(`/groups/${groupId}`);
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback to window.location for iOS Safari
      window.location.href = `/groups/${groupId}`;
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #76ff03 0%, #2196f3 50%, #e91e63 100%)',
      backgroundAttachment: 'fixed'
    }}>
      <AppBar position="static" sx={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}>
        <Toolbar>
          {/* User Avatar and Name - Click to open settings */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              flexGrow: 1,
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 }
            }}
            onClick={() => {
              console.log('🔵 Profile clicked, navigating to /profile');
              try {
                navigate('/profile');
              } catch (error) {
                console.error('❌ Navigation error:', error);
                window.location.href = '/profile';
              }
            }}
          >
            <Avatar 
              src={getAvatarContent(currentUser)}
              sx={{ width: 40, height: 40, mr: 2 }}
            >
              {getAvatarFallback(currentUser)}
            </Avatar>
            <Typography variant="h6" component="div">
              {currentUser?.full_name || currentUser?.username || 'User'}
            </Typography>
          </Box>
          
          {/* Download Native App Button */}
          <IconButton 
            onClick={() => {
              console.log('🔵 Download clicked, navigating to /download');
              try {
                navigate('/download');
              } catch (error) {
                console.error('❌ Navigation error:', error);
                window.location.href = '/download';
              }
            }}
            aria-label="download app"
            sx={{ 
              color: '#4CAF50',
              '&:hover': { 
                bgcolor: 'rgba(76, 175, 80, 0.08)'
              }
            }}
          >
            <DownloadIcon />
          </IconButton>
          
          {/* Logout Icon - Bright Red */}
          <IconButton 
            onClick={handleLogout}
            aria-label="logout"
            sx={{ 
              color: '#ff1744',
              '&:hover': { 
                bgcolor: 'rgba(255, 23, 68, 0.08)'
              }
            }}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>


      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Your Groups
          </Typography>
          <Fab color="primary" aria-label="create new group" onClick={() => setOpenCreateDialog(true)}>
            <AddIcon />
          </Fab>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Don't show loading spinner - just show content immediately */}
        {groups?.length === 0 && !loading ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              You don't have any groups yet
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Create a new group to start communicating with your friends
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
            >
              Create Group
            </Button>
          </Paper>
        ) : groups?.length === 0 && loading ? (
          // First load - show nothing instead of spinner to avoid flicker
          <Box sx={{ height: 200 }} />
        ) : (groups && groups.length > 0) ? (
          <Grid container spacing={3}>
            {groups.map((group) => (
              <Grid item size={{ xs: 12, sm: 6, md: 4 }} key={group.id}>
                <Paper
                  sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 6 }
                  }}
                  onClick={() => handleGroupClick(group.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar src={group.avatar_url} sx={{ width: 56, height: 56, mr: 2 }}>
                      {group?.name?.[0] || 'G'}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{group?.name || 'Unnamed Group'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {group.members?.length || 0} members
                      </Typography>
                    </Box>
                  </Box>

                  {group.description && (
                    <Typography variant="body2" sx={{ mb: 2, flexGrow: 1 }}>
                      {group.description}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : null}
      </Container>

      {/* AI Chat Assistant Button */}
      <Fab
        color="secondary"
        aria-label="AI assistant"
        onClick={() => setShowAIChat(true)}
        sx={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 1000
        }}
      >
        <AIIcon />
      </Fab>

      {/* AI Chat Assistant Panel */}
      {showAIChat && (
        <AIChatAssistant onClose={() => setShowAIChat(false)} />
      )}

      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} aria-labelledby="create-group-dialog">
        <DialogTitle id="create-group-dialog">Create New Group</DialogTitle>
        <DialogContent>
          {createGroupError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createGroupError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            id="group-name"
            label="Group Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newGroupName}
            onChange={(e) => {
              setNewGroupName(e.target.value);
              generateAvatarOptions(e.target.value);
            }}
            required
            aria-required="true"
          />
          <TextField
            margin="dense"
            id="group-description"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newGroupDescription}
            onChange={(e) => setNewGroupDescription(e.target.value)}
          />
          {avatarOptions.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Select a Group Avatar
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {avatarOptions.map((url, index) => (
                  <Avatar
                    key={index}
                    src={url}
                    sx={{
                      width: 60,
                      height: 60,
                      cursor: 'pointer',
                      border: selectedAvatar === url ? '3px solid #1976d2' : '2px solid transparent',
                      '&:hover': { opacity: 0.7 }
                    }}
                    onClick={() => setSelectedAvatar(url)}
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            disabled={createGroupLoading}
            aria-label="submit new group"
          >
            {createGroupLoading ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
