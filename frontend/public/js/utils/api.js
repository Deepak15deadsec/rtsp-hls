/**
 * API utility for making requests to the backend
 */
const API_BASE_URL = '/api';
const TOKEN_KEY = 'rtsp_auth_token';

const api = {
  /**
   * Set auth token in localStorage
   */
  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  
  /**
   * Get auth token from localStorage
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  },
  
  /**
   * Make API request with authentication
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const config = {
      ...options,
      headers,
    };
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error(`API error (${endpoint}):`, error);
      throw error;
    }
  },
  
  // Stream API
  
  /**
   * Get stream status
   */
  getStreamStatus() {
    return this.request('/streams/status');
  },
  
  /**
   * Start stream
   */
  startStream(camera = 'camera-first') {
    return this.request('/streams/start', {
      method: 'POST',
      body: JSON.stringify({ camera }),
    });
  },
  
  /**
   * Stop stream
   */
  stopStream() {
    return this.request('/streams/stop', {
      method: 'POST',
    });
  },
  
  /**
   * Get stream health
   */
  getStreamHealth() {
    return this.request('/streams/health');
  },
  
  // Recording API
  
  /**
   * Get all recordings
   */
  getRecordings() {
    return this.request('/recordings');
  },
  
  /**
   * Start recording
   */
  startRecording(camera = 'camera-first') {
    return this.request('/recordings/start', {
      method: 'POST',
      body: JSON.stringify({ camera }),
    });
  },
  
  /**
   * Stop recording
   */
  stopRecording() {
    return this.request('/recordings/stop', {
      method: 'POST',
    });
  },
  
  /**
   * Delete recording
   */
  deleteRecording(filename) {
    return this.request(`/recordings/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
  },
  
  // Auth API
  
  /**
   * Login
   */
  login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
};

export default api; 