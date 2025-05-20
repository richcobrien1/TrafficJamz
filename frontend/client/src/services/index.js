import api from './api';

// Auth Service
export const AuthService = {
  login: (email, password) => {
    return api.post('/api/auth/debug-login', { email, password });
  },
  
  register: (userData) => {
    return api.post('/api/auth/register', userData);
  },
  
  logout: () => {
    return api.post('/api/auth/logout');
  },
  
  getProfile: () => {
    return api.get('/api/users/profile');
  },
  
  updateProfile: (userData) => {
    return api.put('/api/users/profile', userData);
  },
  
  changePassword: (currentPassword, newPassword) => {
    return api.put('/api/auth/password', { currentPassword, newPassword });
  },
  
  requestPasswordReset: (email) => {
    return api.post('/api/auth/password-reset-request', { email });
  },
  
  resetPassword: (token, newPassword) => {
    return api.post('/api/auth/password-reset', { token, newPassword });
  }
};

// User Service
export const UserService = {
  getUsers: (params) => {
    return api.get('/api/users', { params });
  },
  
  getUserById: (user_id) => {
    return api.get(`/api/users/${user_id}`);
  },
  
  getUserByEmail: (email) => {
    return api.get(`/api/users/${email}`);
  },
  
  updateUser: (user_id, userData) => {
    return api.put(`/api/users/${user_id}`, userData);
  },
  
  deleteUser: (user_id) => {
    return api.delete(`/api/users/${user_id}`);
  }
};

// Group Service
export const GroupService = {
  getGroups: () => {
    return api.get('/api/groups');
  },
  
  getGroupById: (groupId) => {
    return api.get(`/api/groups/${groupId}`);
  },
  
  createGroup: (groupData) => {
    return api.post('/api/groups', groupData);
  },
  
  updateGroup: (groupId, groupData) => {
    return api.put(`/api/groups/${groupId}`, groupData);
  },
  
  deleteGroup: (groupId) => {
    return api.delete(`/api/groups/${groupId}`);
  },
  
  getGroupMembers: (groupId) => {
    return api.get(`/api/groups/${groupId}/members`);
  },
  
  addGroupMember: (groupId, user_id) => {
    return api.post(`/api/groups/${groupId}/members`, { user_id });
  },
  
  removeGroupMember: (groupId, user_id) => {
    return api.delete(`/api/groups/${groupId}/members/${user_id}`);
  },
  
  sendInvitation: (groupId, email) => {
    return api.post(`/api/groups/${groupId}/invitations`, { email });
  },
  
  getInvitations: () => {
    return api.get('/api/groups/invitations');
  },
  
  respondToInvitation: (invitationId, accept) => {
    return api.put(`/api/groups/invitations/${invitationId}`, { accept });
  }
};

// Audio Service
export const AudioService = {
  getActiveSessions: () => {
    return api.get('/api/audio/sessions');
  },
  
  getSessionById: (sessionId) => {
    return api.get(`/api/audio/sessions/${sessionId}`);
  },
  
  getGroupSession: (groupId) => {
    return api.get(`/api/audio/sessions/group/${groupId}`);
  },
  
  createSession: (groupId) => {
    return api.post('/api/audio/sessions', { groupId });
  },
  
  joinSession: (sessionId) => {
    return api.post(`/api/audio/sessions/${sessionId}/join`);
  },
  
  leaveSession: (sessionId) => {
    return api.post(`/api/audio/sessions/${sessionId}/leave`);
  },
  
  updateStatus: (sessionId, statusData) => {
    return api.put(`/api/audio/sessions/${sessionId}/status`, statusData);
  },
  
  // Music related endpoints
  getPlaylist: (sessionId) => {
    return api.get(`/api/audio/sessions/${sessionId}/playlist`);
  },
  
  addTrack: (sessionId, trackData) => {
    return api.post(`/api/audio/sessions/${sessionId}/playlist`, trackData);
  },
  
  removeTrack: (sessionId, trackId) => {
    return api.delete(`/api/audio/sessions/${sessionId}/playlist/${trackId}`);
  },
  
  playTrack: (sessionId, trackId) => {
    return api.post(`/api/audio/sessions/${sessionId}/playlist/${trackId}/play`);
  },
  
  pauseTrack: (sessionId) => {
    return api.post(`/api/audio/sessions/${sessionId}/playlist/pause`);
  }
};

// Location Service
export const LocationService = {
  updateLocation: (locationData) => {
    return api.post('/api/location/update', locationData);
  },
  
  getGroupLocations: (groupId) => {
    return api.get(`/api/location/group/${groupId}`);
  },
  
  getUserLocation: (user_id) => {
    return api.get(`/api/location/user/${user_id}`);
  },
  
  updatePrivacySettings: (privacyData) => {
    return api.put('/api/location/privacy', privacyData);
  },
  
  createProximityAlert: (alertData) => {
    return api.post('/api/location/proximity-alerts', alertData);
  },
  
  getProximityAlerts: () => {
    return api.get('/api/location/proximity-alerts');
  },
  
  updateProximityAlert: (alertId, alertData) => {
    return api.put(`/api/location/proximity-alerts/${alertId}`, alertData);
  },
  
  deleteProximityAlert: (alertId) => {
    return api.delete(`/api/location/proximity-alerts/${alertId}`);
  }
};

// Subscription Service
export const SubscriptionService = {
  getPlans: () => {
    return api.get('/api/subscriptions/plans');
  },
  
  getCurrentSubscription: () => {
    return api.get('/api/subscriptions/current');
  },
  
  subscribe: (planId, paymentData) => {
    return api.post('/api/subscriptions', { planId, ...paymentData });
  },
  
  cancelSubscription: () => {
    return api.delete('/api/subscriptions/current');
  },
  
  updatePaymentMethod: (paymentData) => {
    return api.put('/api/subscriptions/payment-method', paymentData);
  }
};

// Notification Service
export const NotificationService = {
  getNotifications: (params) => {
    return api.get('/api/notifications', { params });
  },
  
  getUnreadNotifications: () => {
    return api.get('/api/notifications/unread');
  },
  
  markAsRead: (notificationId) => {
    return api.put(`/api/notifications/${notificationId}/read`);
  },
  
  markAllAsRead: () => {
    return api.put('/api/notifications/read-all');
  },
  
  deleteNotification: (notificationId) => {
    return api.delete(`/api/notifications/${notificationId}`);
  },
  
  updateNotificationSettings: (settingsData) => {
    return api.put('/api/notifications/settings', settingsData);
  }
};
