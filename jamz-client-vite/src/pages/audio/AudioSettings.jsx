import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Grid
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  VolumeUp as VolumeUpIcon
} from '@mui/icons-material';
import api from '../../services/api';

const AudioSettings = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);

  // Fetch group details
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await api.get(`/groups/${groupId}`);
        if (response.data && response.data.group) {
          setGroup(response.data.group);
        }
      } catch (error) {
        console.error('Error fetching group:', error);
      }
    };
    
    if (groupId) {
      fetchGroup();
    }
  }, [groupId]);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex' }}>
      {/* Vertical Group Name Bar - Lime Green */}
      {group && (
        <Box
          sx={{
            width: '32px',
            bgcolor: '#76ff03',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1000,
            boxShadow: 2
          }}
        >
          <Typography
            variant="body2"
            sx={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              color: '#000',
              fontWeight: 'bold',
              fontStyle: 'italic',
              letterSpacing: '0.1em',
              padding: '16px 4px',
              whiteSpace: 'nowrap',
              userSelect: 'none'
            }}
          >
            {group.name}
          </Typography>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, ml: group ? '32px' : 0 }}>
        {/* App Bar - Lime Green */}
        <AppBar position="static" sx={{ bgcolor: '#76ff03' }}>
          <Toolbar>
            <IconButton edge="start" sx={{ color: '#000' }} onClick={() => navigate(`/groups/${groupId}`)}>
              <ArrowBackIcon />
            </IconButton>
            <VolumeUpIcon sx={{ ml: 1, mr: 1, color: '#000' }} />
            <Typography variant="h6" sx={{ flexGrow: 1, color: '#000' }}>
              Voice
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box sx={{ p: 2 }}>
          {/* Voice Settings - Clean and simple */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                <VolumeUpIcon sx={{ fontSize: 64, color: '#76ff03', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Voice Settings
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Voice audio is automatically managed.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Use your device volume buttons to adjust levels.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default AudioSettings;
