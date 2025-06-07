require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const streamRoutes = require('./routes/streamRoutes');
const recordingRoutes = require('./routes/recordingRoutes');
const authRoutes = require('./routes/authRoutes');
const config = require('./config/default');

// Ensure storage directories exist
const hlsDir = path.join(__dirname, '../storage/hls');
const recordingsDir = path.join(__dirname, '../storage/recordings');

if (!fs.existsSync(hlsDir)) {
  fs.mkdirSync(hlsDir, { recursive: true });
  console.log('Created HLS directory:', hlsDir);
}

if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
  console.log('Created recordings directory:', recordingsDir);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Add specific static route for HLS files
app.use('/hls', express.static(path.join(__dirname, '../storage/hls')));

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
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      if (ws.isAlive === false) {
        console.log('WebSocket connection terminated due to inactivity');
        clearInterval(pingInterval);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
});

module.exports = server; 