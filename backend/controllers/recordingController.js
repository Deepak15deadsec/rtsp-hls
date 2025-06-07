const RecordingService = require('../services/RecordingService');
const recordingService = new RecordingService();

/**
 * Start a recording
 */
exports.startRecording = (req, res) => {
  try {
    const { camera = 'camera-first' } = req.body;
    const result = recordingService.startRecording(camera);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    res.json({ 
      message: result.message,
      filename: result.filename
    });
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Stop the current recording
 */
exports.stopRecording = (req, res) => {
  try {
    const result = recordingService.stopRecording();
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    res.json({ message: result.message });
  } catch (error) {
    console.error('Error stopping recording:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get list of all recordings
 */
exports.getRecordings = (req, res) => {
  try {
    const result = recordingService.getRecordings();
    
    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }
    
    res.json({ recordings: result.recordings });
  } catch (error) {
    console.error('Error getting recordings:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a recording
 */
exports.deleteRecording = (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    
    const result = recordingService.deleteRecording(filename);
    
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    
    res.json({ message: result.message });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ error: error.message });
  }
}; 