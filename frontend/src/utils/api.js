/**
 * API client utility
 */
const API_URL = '/api';

/**
 * Get authentication token from localStorage
 */
const getToken = () => localStorage.getItem('token');

/**
 * Set authentication token in localStorage
 */
const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

/**
 * Check if user is authenticated
 */
const isAuthenticated = () => !!getToken();

/**
 * Generic request function with authentication
 */
const request = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add auth token if available
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers
  };
  
  try {
    const response = await fetch(url, config);
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      setToken(null); // Clear token
      window.location.href = '/login'; // Redirect to login
      return null;
    }
    
    // Parse JSON response
    const data = await response.json();
    
    // Throw error for non-2xx responses
    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Stream API
export const getStreamStatus = () => request('/streams/status');
export const getStreamHealth = () => request('/streams/health');
export const startStream = (camera) => request('/streams/start', {
  method: 'POST',
  body: JSON.stringify({ camera })
});
export const stopStream = () => request('/streams/stop', { method: 'POST' });

// Recording API
export const getRecordings = () => request('/recordings');
export const startRecording = (camera) => request('/recordings/start', {
  method: 'POST',
  body: JSON.stringify({ camera })
});
export const stopRecording = () => request('/recordings/stop', { method: 'POST' });
export const deleteRecording = (filename) => request(`/recordings/${filename}`, {
  method: 'DELETE'
});

// Auth API
export const login = (username, password) => request('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});

export const verifyAuth = () => request('/auth/verify');

export default {
  getToken,
  setToken,
  isAuthenticated,
  getStreamStatus,
  getStreamHealth,
  startStream,
  stopStream,
  getRecordings,
  startRecording,
  stopRecording,
  deleteRecording,
  login,
  verifyAuth
}; 