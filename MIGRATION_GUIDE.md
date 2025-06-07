# Migration Guide: Current Structure to Recommended Structure

## Step 1: Create the New Directory Structure

```bash
# Create main directories
mkdir -p backend/{config,controllers,middleware,models,routes,services,utils}
mkdir -p frontend/public/{images,styles}
mkdir -p frontend/src/{components,pages,utils}
mkdir -p storage/{hls,recordings}
```

## Step 2: Move and Refactor Backend Files

### Move Core Files
1. Move `src/RTSPStreamer.js` to `backend/services/RTSPStreamer.js`
2. Move `src/StreamService.js` to `backend/services/StreamService.js`
3. Move `src/Recorder.js` to `backend/services/RecordingService.js`
4. Move `src/config/config.js` to `backend/config/default.js`

### Create Controllers
Extract controller logic from your routes:

```javascript
// backend/controllers/streamController.js
const StreamService = require('../services/StreamService');

exports.getStream = async (req, res) => {
  try {
    const streamId = req.params.id;
    const stream = await StreamService.getStream(streamId);
    res.json(stream);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.startStream = async (req, res) => {
  try {
    const { rtspUrl, name } = req.body;
    const stream = await StreamService.startStream(rtspUrl, name);
    res.json(stream);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Additional controller methods...
```

### Refactor Routes
Update your routes to use the controllers:

```javascript
// backend/routes/streamRoutes.js
const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');

router.get('/:id', streamController.getStream);
router.post('/', streamController.startStream);
router.delete('/:id', streamController.stopStream);
// Additional routes...

module.exports = router;
```

### Create Server Entry Point
Create a new server.js file:

```javascript
// backend/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const streamRoutes = require('./routes/streamRoutes');
const recordingRoutes = require('./routes/recordingRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Routes
app.use('/api/streams', streamRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/auth', authRoutes);

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// WebSocket setup
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  console.log('WebSocket connection opened');
  
  // WebSocket handlers
});

module.exports = server;
```

## Step 3: Move and Refactor Frontend Files

### Organize Static Assets
1. Move CSS files to `frontend/public/styles/`
2. Move image files to `frontend/public/images/`

### Create Component Structure
Break down your frontend JavaScript into components:

```javascript
// frontend/src/components/VideoPlayer.js
class VideoPlayer {
  constructor(elementId, hlsUrl) {
    this.player = document.getElementById(elementId);
    this.hlsUrl = hlsUrl;
    this.init();
  }
  
  init() {
    // Player initialization logic
  }
  
  // Additional methods
}

export default VideoPlayer;
```

### Create API Client
Centralize API calls:

```javascript
// frontend/src/utils/api.js
const API_URL = '/api';

export const fetchStream = async (id) => {
  const response = await fetch(`${API_URL}/streams/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stream');
  }
  return response.json();
};

export const startStream = async (rtspUrl, name) => {
  const response = await fetch(`${API_URL}/streams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rtspUrl, name }),
  });
  if (!response.ok) {
    throw new Error('Failed to start stream');
  }
  return response.json();
};

// Additional API methods
```

### Create Main Entry Point
Create an entry point for your frontend application:

```javascript
// frontend/src/index.js
import { initializeStreams } from './pages/Stream.js';
import { setupAuth } from './utils/auth.js';

document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  
  // Initialize the appropriate page based on URL
  const path = window.location.pathname;
  if (path === '/stream') {
    initializeStreams();
  } else if (path === '/login') {
    // Initialize login page
  }
});
```

## Step 4: Update Package Configuration

### Backend package.json
```json
{
  "name": "rtsp-to-hls-backend",
  "version": "1.0.0",
  "description": "RTSP to HLS streaming server backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "dotenv": "^10.0.0",
    "express": "^4.17.1",
    "ws": "^8.2.3"
    // Additional dependencies
  }
}
```

### Frontend package.json (if using a build system)
```json
{
  "name": "rtsp-to-hls-frontend",
  "version": "1.0.0",
  "description": "RTSP to HLS streaming client frontend",
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch"
  },
  "dependencies": {
    // Frontend dependencies
  },
  "devDependencies": {
    "webpack": "^5.58.1",
    "webpack-cli": "^4.9.0"
    // Additional dev dependencies
  }
}
```

## Step 5: Update Environment Configuration

Create environment-specific config files:

```javascript
// backend/config/development.js
module.exports = {
  logLevel: 'debug',
  // Development-specific settings
};

// backend/config/production.js
module.exports = {
  logLevel: 'error',
  // Production-specific settings
};
```

## Step 6: Testing and Deployment

1. Test each component after migration
2. Update deployment scripts
3. Update documentation with new structure

## Step 7: Incremental Migration

Consider migrating one module at a time to minimize disruption:
1. Start with the Stream module
2. Then migrate the Recording module
3. Finally, implement Authentication

This phased approach allows you to maintain a working application throughout the migration process. 