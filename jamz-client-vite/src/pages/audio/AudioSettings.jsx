import React from 'react';
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
  Settings as SettingsIcon
} from '@mui/icons-material';

const AudioSettings = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();

  return (
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(`/groups/${groupId}`)}>
            <ArrowBackIcon />
          </IconButton>
          <SettingsIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Audio Settings
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Content Area */}
      <Box sx={{ p: 2 }}>
      {/* Audio Settings - Clean and simple */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <SettingsIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Voice Controls
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
  );
};

export default AudioSettings;
