// jamz-client-vite/src/pages/dashboard/Dashboard.jsx
// This file is part of the TrafficJamz project.

import React, { useState, useEffect } from 'react';
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
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  SmartToy as AIIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AIChatAssistant from '../../components/AIChatAssistant';
import { getAvatarContent, getAvatarFallback } from '../../utils/avatar.utils';

const Dashboard = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [avatarOptions, setAvatarOptions] = useState([]);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [createGroupError, setCreateGroupError] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);

  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
  const response = await api.get('/groups');
      setGroups(response.data.groups);
      setError('');
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
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

  const handleGroupClick = (groupId) => navigate(`/groups/${groupId}`);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}>
        <Toolbar>
          {/* User Avatar and Name */}
          <Avatar 
            src={getAvatarContent(currentUser)}
            sx={{ width: 40, height: 40, mr: 2 }}
          >
            {getAvatarFallback(currentUser)}
          </Avatar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {currentUser?.full_name || currentUser?.username || 'User'}
          </Typography>
          
          {/* Settings Icon */}
          <IconButton 
            color="inherit" 
            onClick={() => navigate('/profile')}
            aria-label="settings"
            sx={{ mr: 1 }}
          >
            <SettingsIcon />
          </IconButton>
          
          {/* Logout Icon */}
          <IconButton 
            color="inherit" 
            onClick={handleLogout}
            aria-label="logout"
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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : groups?.length === 0 ? (
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
        ) : (
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
                      {group.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{group.name}</Typography>
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
        )}
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
