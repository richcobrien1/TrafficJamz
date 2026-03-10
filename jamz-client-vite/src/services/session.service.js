// src/services/session.service.js
// Purpose: Persist critical session data to survive page refreshes and idle periods
// Caches user data, groups, and config in localStorage with timestamps

const CACHE_KEYS = {
  USER_DATA: 'jamz_user_data',
  USER_TIMESTAMP: 'jamz_user_timestamp',
  GROUPS_DATA: 'jamz_groups_data',
  GROUPS_TIMESTAMP: 'jamz_groups_timestamp',
  CONFIG_DATA: 'jamz_config_data',
  CONFIG_TIMESTAMP: 'jamz_config_timestamp',
  SESSION_ACTIVE: 'jamz_session_active'
};

// Cache TTL in milliseconds
const CACHE_TTL = {
  USER: 24 * 60 * 60 * 1000,     // 24 hours - user data persists across sessions
  GROUPS: 24 * 60 * 60 * 1000,   // 24 hours - stable data
  CONFIG: 24 * 60 * 60 * 1000    // 24 hours - rarely changes
};

class SessionService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  init() {
    if (this.initialized) return;
    
    // Mark session as active
    this.markSessionActive();
    
    // Clean up old/expired cache on init
    this.cleanupExpiredCache();
    
    // Set up visibility change listener to track when app goes to background
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('📱 App returned to foreground - checking session validity');
        this.validateSession();
      }
    });
    
    // Handle page unload to mark session end
    window.addEventListener('beforeunload', () => {
      this.markSessionInactive();
    });
    
    this.initialized = true;
    console.log('✅ Session persistence service initialized');
  }

  // Mark session as active
  markSessionActive() {
    try {
      localStorage.setItem(CACHE_KEYS.SESSION_ACTIVE, Date.now().toString());
    } catch (e) {
      console.warn('Failed to mark session active:', e);
    }
  }

  // Mark session as inactive
  markSessionInactive() {
    try {
      localStorage.removeItem(CACHE_KEYS.SESSION_ACTIVE);
    } catch (e) {
      console.warn('Failed to mark session inactive:', e);
    }
  }

  // Check if session is valid
  isSessionValid() {
    try {
      const lastActive = localStorage.getItem(CACHE_KEYS.SESSION_ACTIVE);
      if (!lastActive) return false;
      
      const age = Date.now() - parseInt(lastActive);
      // Consider session valid if active within last 30 minutes
      return age < 30 * 60 * 1000;
    } catch (e) {
      console.warn('Failed to check session validity:', e);
      return false;
    }
  }

  // Validate session on foreground return
  validateSession() {
    if (!this.isSessionValid()) {
      console.log('⚠️ Session expired - clearing cached data');
      this.clearAll();
      return false;
    }
    
    this.markSessionActive();
    return true;
  }

  // Clean up expired cache entries
  cleanupExpiredCache() {
    try {
      // Check user cache
      if (this.isCacheExpired(CACHE_KEYS.USER_TIMESTAMP, CACHE_TTL.USER)) {
        this.clearUserCache();
      }
      
      // Check groups cache
      if (this.isCacheExpired(CACHE_KEYS.GROUPS_TIMESTAMP, CACHE_TTL.GROUPS)) {
        this.clearGroupsCache();
      }
      
      // Check config cache
      if (this.isCacheExpired(CACHE_KEYS.CONFIG_TIMESTAMP, CACHE_TTL.CONFIG)) {
        this.clearConfigCache();
      }
    } catch (e) {
      console.warn('Failed to cleanup expired cache:', e);
    }
  }

  // Check if cache is expired
  isCacheExpired(timestampKey, ttl) {
    try {
      const timestamp = localStorage.getItem(timestampKey);
      if (!timestamp) return true;
      
      const age = Date.now() - parseInt(timestamp);
      return age > ttl;
    } catch (e) {
      return true;
    }
  }

  // USER DATA METHODS
  
  cacheUserData(userData) {
    try {
      localStorage.setItem(CACHE_KEYS.USER_DATA, JSON.stringify(userData));
      localStorage.setItem(CACHE_KEYS.USER_TIMESTAMP, Date.now().toString());
      console.log('💾 User data cached');
    } catch (e) {
      console.warn('Failed to cache user data:', e);
    }
  }

  getCachedUserData() {
    try {
      if (this.isCacheExpired(CACHE_KEYS.USER_TIMESTAMP, CACHE_TTL.USER)) {
        console.log('⚠️ User cache expired');
        this.clearUserCache();
        return null;
      }
      
      const data = localStorage.getItem(CACHE_KEYS.USER_DATA);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      console.log('✅ Retrieved cached user data');
      return parsed;
    } catch (e) {
      console.warn('Failed to get cached user data:', e);
      return null;
    }
  }

  clearUserCache() {
    try {
      localStorage.removeItem(CACHE_KEYS.USER_DATA);
      localStorage.removeItem(CACHE_KEYS.USER_TIMESTAMP);
    } catch (e) {
      console.warn('Failed to clear user cache:', e);
    }
  }

  // GROUPS DATA METHODS
  
  cacheGroupsData(groupsData) {
    try {
      localStorage.setItem(CACHE_KEYS.GROUPS_DATA, JSON.stringify(groupsData));
      localStorage.setItem(CACHE_KEYS.GROUPS_TIMESTAMP, Date.now().toString());
      console.log('💾 Groups data cached');
    } catch (e) {
      console.warn('Failed to cache groups data:', e);
    }
  }

  getCachedGroupsData() {
    try {
      if (this.isCacheExpired(CACHE_KEYS.GROUPS_TIMESTAMP, CACHE_TTL.GROUPS)) {
        console.log('⚠️ Groups cache expired');
        this.clearGroupsCache();
        return null;
      }
      
      const data = localStorage.getItem(CACHE_KEYS.GROUPS_DATA);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      console.log('✅ Retrieved cached groups data');
      return parsed;
    } catch (e) {
      console.warn('Failed to get cached groups data:', e);
      return null;
    }
  }

  clearGroupsCache() {
    try {
      localStorage.removeItem(CACHE_KEYS.GROUPS_DATA);
      localStorage.removeItem(CACHE_KEYS.GROUPS_TIMESTAMP);
    } catch (e) {
      console.warn('Failed to clear groups cache:', e);
    }
  }

  // CONFIG DATA METHODS
  
  cacheConfigData(configData) {
    try {
      localStorage.setItem(CACHE_KEYS.CONFIG_DATA, JSON.stringify(configData));
      localStorage.setItem(CACHE_KEYS.CONFIG_TIMESTAMP, Date.now().toString());
      console.log('💾 Config data cached');
    } catch (e) {
      console.warn('Failed to cache config data:', e);
    }
  }

  getCachedConfigData() {
    try {
      if (this.isCacheExpired(CACHE_KEYS.CONFIG_TIMESTAMP, CACHE_TTL.CONFIG)) {
        console.log('⚠️ Config cache expired');
        this.clearConfigCache();
        return null;
      }
      
      const data = localStorage.getItem(CACHE_KEYS.CONFIG_DATA);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      console.log('✅ Retrieved cached config data');
      return parsed;
    } catch (e) {
      console.warn('Failed to get cached config data:', e);
      return null;
    }
  }

  clearConfigCache() {
    try {
      localStorage.removeItem(CACHE_KEYS.CONFIG_DATA);
      localStorage.removeItem(CACHE_KEYS.CONFIG_TIMESTAMP);
    } catch (e) {
      console.warn('Failed to clear config cache:', e);
    }
  }

  // CLEAR ALL CACHE
  
  clearAll() {
    console.log('🗑️ Clearing all cached session data');
    this.clearUserCache();
    this.clearGroupsCache();
    this.clearConfigCache();
    this.markSessionInactive();
  }

  // GET ALL CACHE STATUS (for debugging)
  
  getCacheStatus() {
    return {
      user: {
        cached: !!localStorage.getItem(CACHE_KEYS.USER_DATA),
        expired: this.isCacheExpired(CACHE_KEYS.USER_TIMESTAMP, CACHE_TTL.USER),
        age: this.getCacheAge(CACHE_KEYS.USER_TIMESTAMP)
      },
      groups: {
        cached: !!localStorage.getItem(CACHE_KEYS.GROUPS_DATA),
        expired: this.isCacheExpired(CACHE_KEYS.GROUPS_TIMESTAMP, CACHE_TTL.GROUPS),
        age: this.getCacheAge(CACHE_KEYS.GROUPS_TIMESTAMP)
      },
      config: {
        cached: !!localStorage.getItem(CACHE_KEYS.CONFIG_DATA),
        expired: this.isCacheExpired(CACHE_KEYS.CONFIG_TIMESTAMP, CACHE_TTL.CONFIG),
        age: this.getCacheAge(CACHE_KEYS.CONFIG_TIMESTAMP)
      },
      sessionValid: this.isSessionValid()
    };
  }

  getCacheAge(timestampKey) {
    try {
      const timestamp = localStorage.getItem(timestampKey);
      if (!timestamp) return null;
      return Date.now() - parseInt(timestamp);
    } catch (e) {
      return null;
    }
  }
}

// Export singleton instance
const sessionService = new SessionService();
export default sessionService;
