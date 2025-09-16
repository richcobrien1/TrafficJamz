// src/services/api.service.js

import { createClient } from '@supabase/supabase-js';
import api from './api';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// User-related API calls (PostgreSQL via Supabase)
export const userService = {
  // Get user profile
  getUserProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  // Update user profile
  updateUserProfile: async (userId, profileData) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(profileData)
        .eq('user_id', userId)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
};

// Group-related API calls (MongoDB via backend API)
export const groupService = {
  // Get all groups
  getGroups: async () => {
    const res = await api.get('/groups');
    return res.data;
  },

  // Get group by ID
  getGroupById: async (groupId) => {
    const res = await api.get(`/groups/${groupId}`);
    return res.data;
  },

  // Create new group
  createGroup: async (groupData) => {
    const res = await api.post('/groups', groupData);
    return res.data;
  }
};

// Location-related API calls (MongoDB via backend API)
export const locationService = {
  // Get user locations
  getUserLocations: async (userId) => {
    const res = await api.get(`/location/user/${userId}`);
    return res.data;
  },

  // Update user location
  updateUserLocation: async (locationData) => {
    const res = await api.post('/location/update', locationData);
    return res.data;
  }
};
