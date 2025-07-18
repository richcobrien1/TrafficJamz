import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const SubscriptionPlans = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      billing: 'forever',
      features: [
        'Basic audio communication',
        'Join up to 3 groups',
        'Location tracking with basic refresh rate',
        'Standard audio quality'
      ],
      limitations: [
        'No music sharing',
        'Limited to 5 members per group',
        'Basic proximity alerts'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 9.99,
      billing: 'monthly',
      features: [
        'High-quality audio communication',
        'Join unlimited groups',
        'Real-time location tracking',
        'Music sharing',
        'Advanced proximity alerts',
        'Up to 20 members per group',
        'Priority support'
      ],
      limitations: []
    },
    {
      id: 'family',
      name: 'Family',
      price: 14.99,
      billing: 'monthly',
      features: [
        'All Premium features',
        'Up to 6 family members',
        'Family location dashboard',
        'Parental controls',
        'Enhanced privacy settings',
        'Up to 30 members per group',
        'Premium support'
      ],
      limitations: []
    }
  ];
  
  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
  };
  
  const handleSubscribe = () => {
    if (!selectedPlan) return;
    
    // In a real implementation, we would redirect to a payment page
    // or process the subscription
    alert(`You selected the ${selectedPlan} plan. In a real implementation, this would redirect to payment processing.`);
  };
  
  const getCurrentPlan = () => {
    return currentUser?.subscription?.plan_id || 'free';
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            sx={{ mr: 2 }}
            onClick={() => navigate(currentUser ? '/' : '/login')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Subscription Plans
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Choose Your Plan
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select the plan that best fits your needs
          </Typography>
        </Box>
        
        <Grid container spacing={3} justifyContent="center">
          {plans.map((plan) => {
            const isCurrentPlan = getCurrentPlan() === plan.id;
            const isSelected = selectedPlan === plan.id;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={plan.id}>
                <Card 
                  raised={isSelected}
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: isSelected ? 2 : 0,
                    borderColor: 'primary.main'
                  }}
                >
                  {plan.id === 'premium' && (
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 10, 
                        right: 10,
                        bgcolor: 'secondary.main',
                        color: 'secondary.contrastText',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      POPULAR
                    </Box>
                  )}
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" component="h2" gutterBottom>
                      {plan.name}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h4" component="span">
                        ${plan.price}
                      </Typography>
                      <Typography variant="body1" component="span" color="text.secondary">
                        /{plan.billing}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Features:
                    </Typography>
                    <List dense>
                      {plan.features.map((feature, index) => (
                        <ListItem key={index} disableGutters>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <CheckIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>
                    
                    {plan.limitations.length > 0 && (
                      <>
                        <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                          Limitations:
                        </Typography>
                        <List dense>
                          {plan.limitations.map((limitation, index) => (
                            <ListItem key={index} disableGutters>
                              <ListItemIcon sx={{ minWidth: 30 }}>
                                <CloseIcon color="error" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={limitation} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </CardContent>
                  
                  <CardActions>
                    {isCurrentPlan ? (
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        disabled
                      >
                        Current Plan
                      </Button>
                    ) : (
                      <Button 
                        fullWidth 
                        variant={isSelected ? "contained" : "outlined"}
                        onClick={() => handleSelectPlan(plan.id)}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button 
            variant="contained" 
            size="large"
            disabled={!selectedPlan || selectedPlan === getCurrentPlan()}
            onClick={handleSubscribe}
          >
            {selectedPlan ? `Subscribe to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}` : 'Select a Plan'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default SubscriptionPlans;
