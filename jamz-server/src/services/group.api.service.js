/**
 * Example frontend API service for handling group-related requests
 */
class GroupApiService {
    constructor(httpClient) {
      this.httpClient = httpClient;
      this.baseUrl = '/api/groups';
    }
  
    /**
     * Configure request headers with authentication token
     * @returns {Object} Headers object with authorization
     */
    getHeaders() {
      const token = localStorage.getItem('access_token');
      return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      };
    }
  
    /**
     * Handle token refresh when access token expires
     * @returns {Promise<boolean>} Success status
     */
    async refreshToken() {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          return false;
        }
  
        const response = await this.httpClient.post('/api/auth/refresh', {
          refresh_token: refreshToken
        });
  
        if (response.data.success) {
          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
      }
    }
  
    /**
     * Execute API request with token refresh handling
     * @param {Function} requestFn - Request function to execute
     * @returns {Promise<Object>} API response
     */
    async executeRequest(requestFn) {
      try {
        return await requestFn();
      } catch (error) {
        // If 401 error, try to refresh token and retry
        if (error.response && error.response.status === 401) {
          const refreshSuccess = await this.refreshToken();
          if (refreshSuccess) {
            return await requestFn();
          } else {
            // Redirect to login if refresh fails
            window.location.href = '/login';
            throw new Error('Authentication failed. Please login again.');
          }
        }
        throw error;
      }
    }
  
    /**
     * Get groups for current user
     * @returns {Promise<Array>} User's groups
     */
    async getUserGroups() {
      return this.executeRequest(async () => {
        const response = await this.httpClient.get(this.baseUrl, {
          headers: this.getHeaders()
        });
        return response.data;
      });
    }
  
    /**
     * Create a new group
     * @param {Object} groupData - Group creation data
     * @returns {Promise<Object>} Created group
     */
    async createGroup(groupData) {
      return this.executeRequest(async () => {
        const response = await this.httpClient.post(this.baseUrl, groupData, {
          headers: this.getHeaders()
        });
        return response.data;
      });
    }
  
    /**
     * Get group by ID
     * @param {string} groupId - Group ID
     * @returns {Promise<Object>} Group data
     */
    async getGroupById(groupId) {
      return this.executeRequest(async () => {
        const response = await this.httpClient.get(`${this.baseUrl}/${groupId}`, {
          headers: this.getHeaders()
        });
        return response.data;
      });
    }
  
    /**
     * Update group details
     * @param {string} groupId - Group ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated group
     */
    async updateGroup(groupId, updateData) {
      return this.executeRequest(async () => {
        const response = await this.httpClient.put(`${this.baseUrl}/${groupId}`, updateData, {
          headers: this.getHeaders()
        });
        return response.data;
      });
    }
  
    /**
     * Delete a group
     * @param {string} groupId - Group ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteGroup(groupId) {
      return this.executeRequest(async () => {
        const response = await this.httpClient.delete(`${this.baseUrl}/${groupId}`, {
          headers: this.getHeaders()
        });
        return response.data;
      });
    }
  }
  
  export default GroupApiService;
  