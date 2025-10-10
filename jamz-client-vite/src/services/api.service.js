// src/services/api.service.js

import api from './api';

// Config-related API calls
export const configService = {
  // Get client configuration
  getClientConfig: async () => {
    const res = await api.get('/api/config/client-config');
    return res.data;
  }
};
