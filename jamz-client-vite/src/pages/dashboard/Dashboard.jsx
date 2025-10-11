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
  Badge,
  Drawer,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
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
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDrawer, setOpenDrawer] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [createGroupError, setCreateGroupError] = useState('');
  const [notifications, setNotifications] = useState([]);

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
    fetchNotifications();
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

  const fetchNotifications = async () => {
    try {
  const response = await api.get('/notifications/unread');
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    logout();
    navigate('/login');
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
        group_description: newGroupDescription
      });

      setGroups((prev) => [...prev, response.data.group]);
      setOpenCreateDialog(false);
      setNewGroupName('');
      setNewGroupDescription('');
    } catch (error) {
      setCreateGroupError(error.response?.data?.message || 'Failed to create group. Please try again.');
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const handleGroupClick = (groupId) => navigate(`/groups/${groupId}`);
  const isMenuOpen = Boolean(anchorEl);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            sx={{ mr: 2 }}
            onClick={() => setOpenDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Groups
          </Typography>
          <IconButton color="inherit" onClick={fetchNotifications} aria-label="refresh notifications">
            <Badge badgeContent={notifications?.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton
            edge="end"
            aria-label="account menu"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <AccountCircleIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>Profile</MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>

      <Drawer anchor="left" open={openDrawer} onClose={() => setOpenDrawer(false)}>
        <Box sx={{ width: 250 }} role="presentation" onClick={() => setOpenDrawer(false)}>
          <List>
            <ListItem>
              <ListItemAvatar>
                <Avatar src={currentUser?.profile_image_url}>
                  {currentUser?.first_name?.[0] || currentUser?.username?.[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`}
                secondary={currentUser?.email}
              />
            </ListItem>
            <Divider />
            <ListItem component="button" onClick={() => navigate('/')}>
              <ListItemAvatar>
                <Avatar><GroupIcon /></Avatar>
              </ListItemAvatar>
              <ListItemText primary="Groups" />
            </ListItem>
            <ListItem component="button" onClick={() => navigate('/profile')}>
              <ListItemAvatar>
                <Avatar><AccountCircleIcon /></Avatar>
              </ListItemAvatar>
              <ListItemText primary="Profile" />
            </ListItem>
            <Divider />
            <ListItem component="button" onClick={handleLogout}>
              <ListItemAvatar>
                <Avatar><LogoutIcon /></Avatar>
              </ListItemAvatar>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Your TrafficJamz Groups
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
              <Grid item xs={12} sm={6} md={4} key={group.id}>
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

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
                    <Button>
                      Join Audio
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LocationIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/location-tracking/${group.id}`);
                      }}
                    >
                      Location
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

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
            onChange={(e) => setNewGroupName(e.target.value)}
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
