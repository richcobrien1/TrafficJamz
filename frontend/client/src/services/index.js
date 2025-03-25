import api from './api';

// Auth Service
export const AuthService = {
  login: (email, password) => {
    return api.post('/auth/login', { email, password });
  },
  
  register: (userData) => {
    return api.post('/auth/register', userData);
  },
  
  logout: () => {
    return api.post('/auth/logout');
  },
  
  getProfile: () => {
    return api.get('/users/profile');
  },
  
  updateProfile: (userData) => {
    return api.put('/users/profile', userData);
  },
  
  changePassword: (currentPassword, newPassword) => {
    return api.put('/auth/password', { currentPassword, newPassword });
  },
  
  requestPasswordReset: (email) => {
    return api.post('/auth/password-reset-request', { email });
  },
  
  resetPassword: (token, newPassword) => {
    return api.post('/auth/password-reset', { token, newPassword });
  }
};

// User Service
export const UserService = {
  getUsers: (params) => {
    return api.get('/users', { params });
  },
  
  getUserById: (user_id) => {
    return api.get(`/users/${user_id}`);
  },
  
  updateUser: (user_id, userData) => {
    return api.put(`/users/${user_id}`, userData);
  },
  
  deleteUser: (user_id) => {
    return api.delete(`/users/${user_id}`);
  }
};

// Group Service
export const GroupService = {
  getGroups: () => {
    return api.get('/groups');
  },
  
  getGroupById: (groupId) => {
    return api.get(`/groups/${groupId}`);
  },
  
  createGroup: (groupData) => {
    return api.post('/groups', groupData);
  },
  
  updateGroup: (groupId, groupData) => {
    return api.put(`/groups/${groupId}`, groupData);
  },
  
  deleteGroup: (groupId) => {
    return api.delete(`/groups/${groupId}`);
  },
  
  getGroupMembers: (groupId) => {
    return api.get(`/groups/${groupId}/members`);
  },
  
  addGroupMember: (groupId, user_id) => {
    return api.post(`/groups/${groupId}/members`, { user_id });
  },
  
  removeGroupMember: (groupId, user_id) => {
    return api.delete(`/groups/${groupId}/members/${user_id}`);
  },
  
  sendInvitation: (groupId, email) => {
    return api.post(`/api/groups/${groupId}/invitations`, { email });
  },
  
  getInvitations: () => {
    return api.get('/groups/invitations');
  },
  
  respondToInvitation: (invitationId, accept) => {
    return api.put(`/groups/invitations/${invitationId}`, { accept });
  }
};

// Audio Service
export const AudioService = {
  getActiveSessions: () => {
    return api.get('/audio/sessions');
  },
  
  getSessionById: (sessionId) => {
    return api.get(`/audio/sessions/${sessionId}`);
  },
  
  getGroupSession: (groupId) => {
    return api.get(`/audio/sessions/group/${groupId}`);
  },
  
  createSession: (groupId) => {
    return api.post('/audio/sessions', { groupId });
  },
  
  joinSession: (sessionId) => {
    return api.post(`/audio/sessions/${sessionId}/join`);
  },
  
  leaveSession: (sessionId) => {
    return api.post(`/audio/sessions/${sessionId}/leave`);
  },
  
  updateStatus: (sessionId, statusData) => {
    return api.put(`/audio/sessions/${sessionId}/status`, statusData);
  },
  
  // Music related endpoints
  getPlaylist: (sessionId) => {
    return api.get(`/audio/sessions/${sessionId}/playlist`);
  },
  
  addTrack: (sessionId, trackData) => {
    return api.post(`/audio/sessions/${sessionId}/playlist`, trackData);
  },
  
  removeTrack: (sessionId, trackId) => {
    return api.delete(`/audio/sessions/${sessionId}/playlist/${trackId}`);
  },
  
  playTrack: (sessionId, trackId) => {
    return api.post(`/audio/sessions/${sessionId}/playlist/${trackId}/play`);
  },
  
  pauseTrack: (sessionId) => {
    return api.post(`/audio/sessions/${sessionId}/playlist/pause`);
  }
};

// Location Service
export const LocationService = {
  updateLocation: (locationData) => {
    return api.post('/location/update', locationData);
  },
  
  getGroupLocations: (groupId) => {
    return api.get(`/location/group/${groupId}`);
  },
  
  getUserLocation: (user_id) => {
    return api.get(`/location/user/${user_id}`);
  },
  
  updatePrivacySettings: (privacyData) => {
    return api.put('/location/privacy', privacyData);
  },
  
  createProximityAlert: (alertData) => {
    return api.post('/location/proximity-alerts', alertData);
  },
  
  getProximityAlerts: () => {
    return api.get('/location/proximity-alerts');
  },
  
  updateProximityAlert: (alertId, alertData) => {
    return api.put(`/location/proximity-alerts/${alertId}`, alertData);
  },
  
  deleteProximityAlert: (alertId) => {
    return api.delete(`/location/proximity-alerts/${alertId}`);
  }
};

// Subscription Service
export const SubscriptionService = {
  getPlans: () => {
    return api.get('/subscriptions/plans');
  },
  
  getCurrentSubscription: () => {
    return api.get('/subscriptions/current');
  },
  
  subscribe: (planId, paymentData) => {
    return api.post('/subscriptions', { planId, ...paymentData });
  },
  
  cancelSubscription: () => {
    return api.delete('/subscriptions/current');
  },
  
  updatePaymentMethod: (paymentData) => {
    return api.put('/subscriptions/payment-method', paymentData);
  }
};

// Notification Service
export const NotificationService = {
  getNotifications: (params) => {
    return api.get('/notifications', { params });
  },
  
  getUnreadNotifications: () => {
    return api.get('/notifications/unread');
  },
  
  markAsRead: (notificationId) => {
    return api.put(`/notifications/${notificationId}/read`);
  },
  
  markAllAsRead: () => {
    return api.put('/notifications/read-all');
  },
  
  deleteNotification: (notificationId) => {
    return api.delete(`/notifications/${notificationId}`);
  },
  
  updateNotificationSettings: (settingsData) => {
    return api.put('/notifications/settings', settingsData);
  }
};
