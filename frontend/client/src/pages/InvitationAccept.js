// InvitationAccept.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Alert,
  Avatar,  
  Button, 
  Box, 
  CircularProgress,
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Paper,
  Typography, 
  TextField,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

const InvitationAccept = () => {
  const { groupId, invitationIndex } = useParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [group, setGroup] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [isRegisteredUser, setIsRegisteredUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobilePhone: ''
  });
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkInvitation = async () => {
      try {
        setStatus('loading');
        
        // First, fetch the group to get the invitation
        const groupResponse = await api.get(`/api/groups/${groupId}`);
        const fetchedGroup = groupResponse.data.group;
        setGroup(fetchedGroup);
        
        // Convert index to number
        const numericIndex = parseInt(invitationIndex, 10);
        
        // Check if the invitation index is valid
        if (!fetchedGroup.invitations || 
            !Array.isArray(fetchedGroup.invitations) ||
            numericIndex < 0 || 
            numericIndex >= fetchedGroup.invitations.length) {
          setStatus('error');
          setError('Invalid invitation');
          return;
        }
        
        const fetchedInvitation = fetchedGroup.invitations[numericIndex];
        setInvitation(fetchedInvitation);
        
        if (!fetchedInvitation || !fetchedInvitation.id) {
          setStatus('error');
          setError('Invalid invitation data');
          return;
        }
        
        // Check if the invitation email belongs to a registered user
        try {
          const checkUserResponse = await api.get(`/api/users/check-email?email=${fetchedInvitation.email}`);
          setIsRegisteredUser(checkUserResponse.data.exists);
          
          if (checkUserResponse.data.exists) {
            // If user exists, we need to check if they're logged in
            const token = localStorage.getItem('token'); // Or however you store auth tokens
            if (!token) {
              // Save the invitation URL to return to after login
              localStorage.setItem('redirectAfterLogin', `/invitations/${groupId}/${invitationIndex}`);
              navigate('/login');
              return;
            }
            
            // User is registered and logged in, proceed with acceptance
            setStatus('ready_to_accept');
          } else {
            // User is not registered, show the form
            setStatus('show_form');
          }
        } catch (err) {
          console.error('Error checking user:', err);
          // If we can't determine if user exists, show the form
          setStatus('show_form');
        }
      } catch (err) {
        console.error('Error checking invitation:', err);
        setStatus('error');
        setError(err.response?.data?.message || 'Failed to process invitation');
      }
    };

    checkInvitation();
  }, [groupId, invitationIndex, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAcceptInvitation = async () => {
    try {
      setStatus('accepting');
      
      let acceptResponse;
      
      if (isRegisteredUser) {
        // For registered users, simply accept the invitation
        acceptResponse = await api.post(`/api/groups/invitations/${invitation.id}/accept`);
      } else {
        // For new users, accept with additional profile data
        acceptResponse = await api.post(`/api/groups/invitations/${invitation.id}/accept-new`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          mobilePhone: formData.mobilePhone,
          email: invitation.email
        });
      }
      
      console.log('Accept response:', acceptResponse.data);
      
      // Fetch the updated group data to get the latest member list
      const updatedGroupResponse = await api.get(`/api/groups/${groupId}`);
      const updatedGroup = updatedGroupResponse.data.group;
      
      // Update the state with the latest group data
      setGroup(updatedGroup);
      setStatus('success');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setStatus('error');
      setError(err.response?.data?.message || 'Failed to accept invitation');
    }
  };

  const handleContinue = () => {
    navigate(`/groups/${groupId}`);
  };

  if (status === 'loading' || status === 'accepting') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {status === 'loading' ? 'Processing your invitation...' : 'Accepting invitation...'}
        </Typography>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <Typography variant="h5" color="error">
          Error Processing Invitation
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/')} 
          sx={{ mt: 3 }}
        >
          Return to Home
        </Button>
      </Box>
    );
  }

  if (status === 'show_form') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, maxWidth: 500, mx: 'auto' }}>
        <Paper sx={{ p: 3, width: '100%' }}>
          <Typography variant="h5" gutterBottom align="center">
            Accept Invitation
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3 }} align="center">
            You've been invited to join <strong>{group?.name}</strong>
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" sx={{ width: '100%', mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="firstName"
              label="First Name"
              name="firstName"
              autoComplete="given-name"
              value={formData.firstName}
              onChange={handleInputChange}
              variant="outlined"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="lastName"
              label="Last Name"
              name="lastName"
              autoComplete="family-name"
              value={formData.lastName}
              onChange={handleInputChange}
              variant="outlined"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="mobilePhone"
              label="Mobile Phone"
              name="mobilePhone"
              autoComplete="tel"
              value={formData.mobilePhone}
              onChange={handleInputChange}
              variant="outlined"
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="contained"
                onClick={handleAcceptInvitation}
                disabled={!formData.firstName || !formData.lastName || !formData.mobilePhone}
              >
                Accept Invitation
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (status === 'ready_to_accept') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Accept Invitation
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          You've been invited to join <strong>{group?.name}</strong>. Click the button below to accept the invitation.
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleAcceptInvitation}
          size="large"
        >
          Accept Invitation
        </Button>
      </Box>
    );
  }

  if (status === 'success') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <Typography variant="h5" color="primary" gutterBottom>
          Invitation Accepted!
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          You have successfully joined the group <strong>{group?.name}</strong>.
        </Typography>
        
        <Box sx={{ width: '100%', maxWidth: 500, bgcolor: 'background.paper', mb: 3 }}>
          <Typography variant="h6" sx={{ px: 2, pt: 2 }}>
            Group Members ({group?.members?.length || 0})
          </Typography>
          
          <List>
            {group?.members?.map((member) => (
              <ListItem key={member.id}>
                <ListItemAvatar>
                  <Avatar src={member.profile_image_url || ''}>
                    {member.username ? member.username[0] : (member.first_name ? member.first_name[0] : '?')}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={`${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username || 'Invitee'} 
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {member.role + member.role.slice(1)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleContinue}
          size="large"
        >
          Continue to Group
        </Button>
      </Box>
    );
  }

  return null;
};

export default InvitationAccept;
