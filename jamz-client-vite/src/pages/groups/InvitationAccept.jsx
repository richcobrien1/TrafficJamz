// InvitationAccept.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
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
  const [invitationData, setInvitationData] = useState(null);
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
        
        // Fetch invitation details from the API
        const response = await api.get(`/invitations/${groupId}/${invitationIndex}`);
        const data = response.data;
        
        setInvitationData(data);
        
        // Check if the invitation email belongs to a registered user
        try {
          const checkUserResponse = await api.get(`/users/check-email?email=${data.invitation.email}`);
          setIsRegisteredUser(checkUserResponse.data.exists);
          
          if (checkUserResponse.data.exists) {
            setStatus('ready_to_accept');
          } else {
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
      
      // Accept the invitation using the correct API endpoint
      const acceptResponse = await api.post(`/invitations/${invitationData.invitationId}/accept`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobilePhone: formData.mobilePhone,
        email: invitationData.invitation.email
      });
      
      console.log('Accept response:', acceptResponse.data);
      
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
            You've been invited to join <strong>{invitationData?.group?.name}</strong>
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
          You've been invited to join <strong>{invitationData?.group?.name}</strong>. Click the button below to accept the invitation.
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
          You have successfully joined the group <strong>{invitationData?.group?.name}</strong>.
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate(`/groups/${groupId}`)}
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
