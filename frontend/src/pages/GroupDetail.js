import React, { useState, useEffect } from 'react';
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
  ExitToApp as LeaveIcon
} from '@mui/icons-material';
import api from '../services/api'; // Adjust the path as needed to point to your api.js file
import { useAuth } from '../contexts/AuthContext';

const GroupDetail = () => {
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
  const [inviteTextMsg, setInviteTextMsg] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMode, setEditMode] = useState(false); // Add this line
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAudioSession, setShowAudioSession] = useState(false);  // In your GroupDetails component
  const { user } = useAuth();
  const navigate = useNavigate();

  // Add useEffect to initialize form fields when group data is loaded
  useEffect(() => {
    if (group) {
      setGroupName(group.name || '');
      setGroupDescription(group.description || '');
      setPrivacyLevel(group.privacy_level || 'private');
      setAvatarUrl(group.avatar_url || '');
    }
  }, [group]);
  
  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);
  
  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/groups/${groupId}`);
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
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
      
      await api.post(`/api/groups/${groupId}/invitations`, {
        email: inviteEmail,
        text: inviteTextMsg
      });
      
      setOpenInviteDialog(false);
      
      // Show success message or update UI
    } catch (error) {
      console.error('Error inviting member:', error);
      setInviteError(error.response?.data?.message || 'Failed to send invitation to: ' + inviteEmail + '. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };
  
  const handleEditGroup = async () => {
    try {
      setSubmitting(true); // Now this will work
      
      console.log('Sending PUT request to:', `/api/groups/${groupId}`);
      console.log('Request data:', {
        group_name: editName,
        group_description: editDescription,
        // TODO other fields...
      });
      
      const response = await api.put(`/api/groups/${groupId}`, {
        group_name: editName,
        group_description: editDescription,
        privacy_level: privacyLevel,
        avatar_url: avatarUrl
      });
      
      console.log('Update response:', response.data);
      
      // Update local state with the response
      setGroup(response.data.group);
      setEditMode(false);
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
      await api.delete(`/api/groups/${correctGroupId}`, {
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
  
  
  const handleLeaveGroup = async (user_id) => {
    try {
      await api.delete(`/api/groups/${groupId}/members/${user_id}`);
      navigate('/');
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
            </Tabs>
          </Box>
          
          <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
            {tabValue === 0 ? (
              <Box>
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
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      sx={{ 
                        p: 3, 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 6
                        }
                      }}
                      onClick={() => navigate(`/audio-session/${groupId}`)}
                    >
                      <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60, mb: 2 }}>
                        <MicIcon fontSize="large" />
                      </Avatar>
                      <Typography variant="h6" gutterBottom>
                        Join Audio Session
                      </Typography>
                      <Typography variant="body2" color="text.secondary" align="center">
                        Start or join a real-time audio conversation with group members
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Paper 
                      sx={{ 
                        p: 3, 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 6
                        }
                      }}
                      onClick={() => navigate(`/location-tracking/${groupId}`)}
                    >
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 60, height: 60, mb: 2 }}>
                        <LocationIcon fontSize="large" />
                      </Avatar>
                      <Typography variant="h6" gutterBottom>
                        Location Tracking Now
                      </Typography>
                      <Typography variant="body2" color="text.secondary" align="center">
                        View the location of group members on a map
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Members ({group.members?.length || 0})
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<PersonAddIcon />}
                    onClick={() => setOpenInviteDialog(true)}
                  >
                    Invite
                  </Button>
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
                                  <IconButton edge="end" aria-label="remove" onClick={() => { handleLeaveGroup(member.user_id); }}>
                                    <DeleteIcon />
                                  </IconButton>
                                ) : 'Owner'
                              }
                            >
                              <ListItemAvatar>
                                <Avatar src={member.profile_image_url}>
                                  {member.first_name?.[0]}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText 
                                primary={
                                  <>
                                    {`${member.first_name || ''} ${member.last_name || ''}`}
                                    {member.user_id === user?.user_id && ' (You)'}
                                    {member.user_id === group.owner_id && (
                                      <Chip 
                                        label="Owner" 
                                        size="small" 
                                        color="primary"
                                        sx={{ ml: 1 }}
                                      />
                                    )}
                                  </>
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
            autoFocus
            margin="dense"
            id="text message"
            label="Mobile Phone"
            type="phone"
            fullWidth
            variant="outlined"
            value={inviteTextMsg}
            onChange={(e) => setInviteTextMsg(e.target.value)}
            required
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
            onChange={(e) => setEditName(e.target.value)}
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
    </Box>
  );
};

export default GroupDetail;
