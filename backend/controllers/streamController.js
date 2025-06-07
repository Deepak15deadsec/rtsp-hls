const StreamService = require('../services/StreamService');

/**
 * Get the status of the current stream
 */
exports.getStreamStatus = (req, res) => {
  try {
    const streamService = StreamService.getInstance();
    const status = streamService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting stream status:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Start a new stream
 */
exports.startStream = (req, res) => {
  try {
    const { camera = 'camera-first' } = req.body;
    const streamService = StreamService.getInstance();
    
    // Check if stream is already running
    if (streamService.getStream()) {
      return res.status(400).json({ 
        error: 'Stream already running',
        status: streamService.getStatus()
      });
    }
    
    // Start the stream
    streamService.startStreamConversion(camera);
    
    res.json({ 
      message: 'Stream started', 
      status: streamService.getStatus() 
    });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Stop the current stream
 */
exports.stopStream = (req, res) => {
  try {
    const streamService = StreamService.getInstance();
    
    // Check if stream is running
    if (!streamService.getStream()) {
      return res.status(400).json({ error: 'No stream is running' });
    }
    
    // Stop the stream
    streamService.killStreamProcess();
    
    res.json({ message: 'Stream stopped' });
  } catch (error) {
    console.error('Error stopping stream:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get stream health information
 */
exports.getStreamHealth = (req, res) => {
  try {
    const streamService = StreamService.getInstance();
    const stream = streamService.getStream();
    
    if (!stream) {
      return res.json({ 
        running: false,
        status: streamService.getStatus()
      });
    }
    
    // Get basic health info
    res.json({
      running: true,
      status: streamService.getStatus(),
      uptime: stream._currentOutput ? Date.now() - stream._currentOutput.start : null
    });
  } catch (error) {
    console.error('Error getting stream health:', error);
    res.status(500).json({ error: error.message });
  }
}; 