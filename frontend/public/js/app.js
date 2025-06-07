/**
 * Main application entry point
 */
import VideoPlayer from '../js/components/VideoPlayer.js';
import api from '../js/utils/api.js';

// DOM Elements
const mainContent = document.getElementById('main-content');
const loadingElement = document.getElementById('loading');

// Application state
let currentPage = null;
let videoPlayer = null;

/**
 * Initialize the application
 */
const init = async () => {
  // Check authentication
  try {
    const isLoggedIn = api.isAuthenticated();
    
    // Setup router
    setupRouter();
    
    // Navigate to initial page
    const path = window.location.pathname;
    navigateTo(path);
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize application');
  }
};

/**
 * Setup the client-side router
 */
const setupRouter = () => {
  // Handle navigation clicks
  document.addEventListener('click', (e) => {
    // Only handle links within our app
    if (e.target.matches('a') && e.target.href.startsWith(window.location.origin)) {
      e.preventDefault();
      navigateTo(new URL(e.target.href).pathname);
    }
  });
  
  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname, false);
  });
};

/**
 * Navigate to a specific page
 */
const navigateTo = async (path, addToHistory = true) => {
  // Add to browser history if needed
  if (addToHistory) {
    history.pushState(null, null, path);
  }
  
  // Show loading indicator
  showLoading();
  
  // Determine which page to load
  try {
    if (path === '/' || path === '/stream') {
      await loadStreamPage();
    } else if (path === '/recordings') {
      await loadRecordingsPage();
    } else if (path === '/admin') {
      // Check if user is authenticated for admin page
      if (api.isAuthenticated()) {
        await loadAdminPage();
      } else {
        await loadLoginPage('/admin');
      }
    } else if (path === '/login') {
      await loadLoginPage();
    } else {
      loadErrorPage('Page not found');
    }
  } catch (error) {
    console.error('Navigation error:', error);
    loadErrorPage('Error loading page');
  } finally {
    // Hide loading indicator
    hideLoading();
  }
};

/**
 * Load the stream page
 */
const loadStreamPage = async () => {
  currentPage = 'stream';
  
  // Create stream page HTML
  const html = `
    <h1 class="mb-4">Live Stream</h1>
    <div class="row">
      <div class="col-md-12">
        <h2 id="stream-status" class="text-center status-loading">Checking stream status...</h2>
        
        <div id="video-wrapper" class="hide">
          <button id="btn-fullscreen" class="btn">
            <svg version="1.1" viewBox="0 0 36 36">
              <path d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 0,0 z"></path>
              <path d="m 20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 0,0 z"></path>
              <path d="m 24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 0,0 z"></path>
              <path d="M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 0,0 z"></path>
            </svg>
          </button>
          
          <button id="btn-play" class="btn">
            <svg viewBox="0 0 26 26">
              <polygon points="9.33 6.69 9.33 19.39 19.3 13.04 9.33 6.69" />
            </svg>
          </button>
          
          <button id="btn-stop" class="btn hide">
            <svg viewBox="0 0 26 26">
              <path d="M3.5 5A1.5 1.5 0 0 1 5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5zM5 4.5a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5V5a.5.5 0 0 0-.5-.5H5z" />
            </svg>
          </button>
          
          <video id="video" autoplay muted playsinline
                 preload="auto"
                 x-webkit-airplay="allow"
                 x5-video-player-type="h5"
                 x5-video-player-fullscreen="true">
            <source src="/hls/stream.m3u8" type="application/x-mpegURL" />
            Your browser does not support the video tag.
          </video>
        </div>
        
        <div class="text-center mt-4">
          <button id="btn-start-stream" class="btn btn-primary">Start Stream</button>
          <button id="btn-stop-stream" class="btn btn-danger">Stop Stream</button>
        </div>
      </div>
    </div>
  `;
  
  // Update the content
  mainContent.innerHTML = html;
  
  // Initialize UI elements
  const streamStatus = document.getElementById('stream-status');
  const videoWrapper = document.getElementById('video-wrapper');
  const btnStartStream = document.getElementById('btn-start-stream');
  const btnStopStream = document.getElementById('btn-stop-stream');
  
  // Initialize video player
  videoPlayer = new VideoPlayer('video', '/hls/stream.m3u8');
  
  // Check stream status
  try {
    const status = await api.getStreamStatus();
    
    if (status.found) {
      streamStatus.textContent = status.message;
      streamStatus.className = 'text-center status-online';
      videoWrapper.classList.remove('hide');
      btnStartStream.disabled = true;
      btnStopStream.disabled = false;
    } else {
      streamStatus.textContent = status.message || 'Stream offline';
      streamStatus.className = 'text-center status-offline';
      videoWrapper.classList.add('hide');
      btnStartStream.disabled = false;
      btnStopStream.disabled = true;
    }
  } catch (error) {
    console.error('Error checking stream status:', error);
    streamStatus.textContent = 'Error checking stream status';
    streamStatus.className = 'text-center status-offline';
  }
  
  // Add event listeners
  btnStartStream.addEventListener('click', async () => {
    try {
      btnStartStream.disabled = true;
      streamStatus.textContent = 'Starting stream...';
      streamStatus.className = 'text-center status-loading';
      
      await api.startStream('camera-first');
      
      // Wait a moment for the stream to initialize
      setTimeout(async () => {
        const status = await api.getStreamStatus();
        if (status.found) {
          streamStatus.textContent = status.message;
          streamStatus.className = 'text-center status-online';
          videoWrapper.classList.remove('hide');
          btnStopStream.disabled = false;
        } else {
          streamStatus.textContent = 'Stream starting...';
          streamStatus.className = 'text-center status-loading';
          setTimeout(() => window.location.reload(), 5000);
        }
      }, 3000);
    } catch (error) {
      console.error('Error starting stream:', error);
      streamStatus.textContent = 'Error starting stream';
      streamStatus.className = 'text-center status-offline';
      btnStartStream.disabled = false;
    }
  });
  
  btnStopStream.addEventListener('click', async () => {
    try {
      btnStopStream.disabled = true;
      streamStatus.textContent = 'Stopping stream...';
      streamStatus.className = 'text-center status-loading';
      
      await api.stopStream();
      
      streamStatus.textContent = 'Stream offline';
      streamStatus.className = 'text-center status-offline';
      videoWrapper.classList.add('hide');
      btnStartStream.disabled = false;
    } catch (error) {
      console.error('Error stopping stream:', error);
      streamStatus.textContent = 'Error stopping stream';
      btnStopStream.disabled = false;
    }
  });
};

/**
 * Load the recordings page
 */
const loadRecordingsPage = async () => {
  currentPage = 'recordings';
  
  // Create recordings page HTML
  const html = `
    <h1 class="mb-4">Recordings</h1>
    <div class="row">
      <div class="col-md-12">
        <div class="d-flex justify-content-between mb-4">
          <button id="btn-refresh" class="btn btn-secondary">Refresh</button>
          <button id="btn-start-recording" class="btn btn-primary">Start Recording</button>
          <button id="btn-stop-recording" class="btn btn-danger">Stop Recording</button>
        </div>
        
        <div id="recordings-container">
          <p>Loading recordings...</p>
        </div>
      </div>
    </div>
  `;
  
  // Update the content
  mainContent.innerHTML = html;
  
  // Initialize UI elements
  const recordingsContainer = document.getElementById('recordings-container');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnStartRecording = document.getElementById('btn-start-recording');
  const btnStopRecording = document.getElementById('btn-stop-recording');
  
  // Load recordings
  const loadRecordings = async () => {
    try {
      const data = await api.getRecordings();
      
      if (data.recordings && data.recordings.length > 0) {
        const recordingsHtml = `
          <ul class="recording-list">
            ${data.recordings.map(recording => `
              <li class="recording-item">
                <div>
                  <h4>${recording.name}</h4>
                  <p>Size: ${formatFileSize(recording.size)}</p>
                  <p>Created: ${new Date(recording.created).toLocaleString()}</p>
                </div>
                <div class="recording-controls">
                  <a href="${recording.path}" download class="btn btn-primary">Download</a>
                  <button class="btn btn-danger btn-delete" data-filename="${recording.name}">Delete</button>
                </div>
              </li>
            `).join('')}
          </ul>
        `;
        
        recordingsContainer.innerHTML = recordingsHtml;
        
        // Add event listeners for delete buttons
        document.querySelectorAll('.btn-delete').forEach(button => {
          button.addEventListener('click', async () => {
            const filename = button.getAttribute('data-filename');
            if (confirm(`Are you sure you want to delete "${filename}"?`)) {
              try {
                await api.deleteRecording(filename);
                loadRecordings(); // Reload the list
              } catch (error) {
                console.error('Error deleting recording:', error);
                alert('Error deleting recording');
              }
            }
          });
        });
      } else {
        recordingsContainer.innerHTML = '<p>No recordings found</p>';
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      recordingsContainer.innerHTML = '<p>Error loading recordings</p>';
    }
  };
  
  // Load initial recordings
  await loadRecordings();
  
  // Add event listeners
  btnRefresh.addEventListener('click', loadRecordings);
  
  btnStartRecording.addEventListener('click', async () => {
    try {
      btnStartRecording.disabled = true;
      await api.startRecording('camera-first');
      alert('Recording started');
      btnStopRecording.disabled = false;
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording');
      btnStartRecording.disabled = false;
    }
  });
  
  btnStopRecording.addEventListener('click', async () => {
    try {
      btnStopRecording.disabled = true;
      await api.stopRecording();
      alert('Recording stopped');
      btnStartRecording.disabled = false;
      loadRecordings(); // Reload the list
    } catch (error) {
      console.error('Error stopping recording:', error);
      alert('Error stopping recording');
      btnStopRecording.disabled = false;
    }
  });
};

/**
 * Load the admin page
 */
const loadAdminPage = async () => {
  currentPage = 'admin';
  
  // Create admin page HTML
  const html = `
    <h1 class="mb-4">Admin Panel</h1>
    <div class="row">
      <div class="col-md-6">
        <div class="card admin-card">
          <div class="card-header admin-card-header">
            <h3>Stream Status</h3>
          </div>
          <div class="card-body admin-card-body">
            <div id="stream-health">Loading...</div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card admin-card">
          <div class="card-header admin-card-header">
            <h3>System Status</h3>
          </div>
          <div class="card-body admin-card-body">
            <p>Current Time: <span id="current-time"></span></p>
            <p>Uptime: <span id="uptime">N/A</span></p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-4">
      <button id="btn-logout" class="btn btn-secondary">Logout</button>
    </div>
  `;
  
  // Update the content
  mainContent.innerHTML = html;
  
  // Initialize UI elements
  const streamHealthEl = document.getElementById('stream-health');
  const currentTimeEl = document.getElementById('current-time');
  const uptimeEl = document.getElementById('uptime');
  const btnLogout = document.getElementById('btn-logout');
  
  // Update stream health
  const updateStreamHealth = async () => {
    try {
      const health = await api.getStreamHealth();
      
      if (health.running) {
        streamHealthEl.innerHTML = `
          <div class="alert alert-success">
            <p><strong>Status:</strong> ${health.status.message || 'Running'}</p>
            <p><strong>Uptime:</strong> ${formatDuration(health.uptime)}</p>
          </div>
        `;
      } else {
        streamHealthEl.innerHTML = `
          <div class="alert alert-warning">
            <p><strong>Status:</strong> ${health.status.message || 'Not running'}</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error fetching stream health:', error);
      streamHealthEl.innerHTML = `
        <div class="alert alert-danger">
          <p>Error fetching stream health</p>
        </div>
      `;
    }
  };
  
  // Update current time
  const updateCurrentTime = () => {
    currentTimeEl.textContent = new Date().toLocaleString();
  };
  
  // Initial updates
  await updateStreamHealth();
  updateCurrentTime();
  
  // Set up intervals
  const streamHealthInterval = setInterval(updateStreamHealth, 10000);
  const currentTimeInterval = setInterval(updateCurrentTime, 1000);
  
  // Add event listeners
  btnLogout.addEventListener('click', () => {
    api.setToken(null);
    navigateTo('/');
  });
  
  // Clean up on page change
  window.addEventListener('beforeunload', () => {
    clearInterval(streamHealthInterval);
    clearInterval(currentTimeInterval);
  });
};

/**
 * Load the login page
 */
const loadLoginPage = async (redirectTo = '/') => {
  currentPage = 'login';
  
  // Create login page HTML
  const html = `
    <div class="login-container">
      <h1 class="mb-4">Login</h1>
      <form id="login-form">
        <div class="mb-3">
          <label for="username" class="form-label">Username</label>
          <input type="text" class="form-control" id="username" required>
        </div>
        <div class="mb-3">
          <label for="password" class="form-label">Password</label>
          <input type="password" class="form-control" id="password" required>
        </div>
        <button type="submit" class="btn btn-primary w-100">Login</button>
        <p id="login-error" class="text-danger mt-2 hide"></p>
      </form>
    </div>
  `;
  
  // Update the content
  mainContent.innerHTML = html;
  
  // Initialize UI elements
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  
  // Add event listeners
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
      loginError.classList.add('hide');
      
      const response = await api.login(username, password);
      
      if (response.success) {
        api.setToken(response.token);
        navigateTo(redirectTo);
      } else {
        loginError.textContent = response.message || 'Login failed';
        loginError.classList.remove('hide');
      }
    } catch (error) {
      console.error('Login error:', error);
      loginError.textContent = error.message || 'Login failed';
      loginError.classList.remove('hide');
    }
  });
};

/**
 * Load an error page
 */
const loadErrorPage = (message) => {
  currentPage = 'error';
  
  const html = `
    <div class="text-center">
      <h1 class="text-danger">Error</h1>
      <p>${message}</p>
      <button class="btn btn-primary" onclick="window.location.href='/'">Go Home</button>
    </div>
  `;
  
  mainContent.innerHTML = html;
};

/**
 * Show loading indicator
 */
const showLoading = () => {
  if (loadingElement) {
    loadingElement.classList.remove('hide');
  }
};

/**
 * Hide loading indicator
 */
const hideLoading = () => {
  if (loadingElement) {
    loadingElement.classList.add('hide');
  }
};

/**
 * Show error message
 */
const showError = (message) => {
  mainContent.innerHTML = `
    <div class="alert alert-danger">
      ${message}
    </div>
  `;
};

/**
 * Format file size for display
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format duration for display
 */
const formatDuration = (ms) => {
  if (!ms) return 'N/A';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
};

// Initialize the application
document.addEventListener('DOMContentLoaded', init);