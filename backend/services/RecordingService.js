const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const config = require('../config/default');

class RecordingService {
  constructor() {
    this.recordingProcess = null;
    this.ensureRecordingDirectory();
  }

  ensureRecordingDirectory() {
    const recordingDir = config.recordingDirectory.outputDirectory;
    if (!fs.existsSync(recordingDir)) {
      fs.mkdirSync(recordingDir, { recursive: true });
    }
  }

  startRecording(camera) {
    if (this.recordingProcess) {
      console.log('Recording already in progress');
      return { success: false, message: 'Recording already in progress' };
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFilename = `recording-${camera}-${timestamp}.mp4`;
      const outputPath = path.join(config.recordingDirectory.outputDirectory, outputFilename);
      
      const rtspUrl = camera === 'camera-first' ? 
        config.recorderFFmpegConfig.rtspUrl : 
        config.recorderFFmpegConfig.rtspUrlSecond;

      this.recordingProcess = ffmpeg(rtspUrl)
        .inputOptions(['-rtsp_transport', 'tcp'])
        .outputOptions([
          `-s ${config.recorderFFmpegConfig.size}`,
          '-c:v libx264',
          '-c:a aac',
          '-preset ultrafast',
          '-crf 28'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('Recording started with command:', commandLine);
        })
        .on('error', (err) => {
          console.error('Error during recording:', err);
          this.recordingProcess = null;
        })
        .on('end', () => {
          console.log('Recording completed successfully');
          this.recordingProcess = null;
        })
        .run();

      return { 
        success: true, 
        message: 'Recording started',
        filename: outputFilename
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return { success: false, message: error.message };
    }
  }

  stopRecording() {
    if (!this.recordingProcess) {
      return { success: false, message: 'No recording in progress' };
    }

    try {
      this.recordingProcess.kill('SIGKILL');
      this.recordingProcess = null;
      return { success: true, message: 'Recording stopped' };
    } catch (error) {
      console.error('Error stopping recording:', error);
      return { success: false, message: error.message };
    }
  }

  getRecordings() {
    try {
      const recordingsDir = config.recordingDirectory.outputDirectory;
      const files = fs.readdirSync(recordingsDir)
        .filter(file => file.endsWith('.mp4'))
        .map(file => {
          const stats = fs.statSync(path.join(recordingsDir, file));
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            path: `/recordings/${file}`
          };
        })
        .sort((a, b) => b.created - a.created); // Sort newest first
      
      return { success: true, recordings: files };
    } catch (error) {
      console.error('Error getting recordings:', error);
      return { success: false, message: error.message };
    }
  }

  deleteRecording(filename) {
    try {
      const filePath = path.join(config.recordingDirectory.outputDirectory, filename);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Recording not found' };
      }
      
      fs.unlinkSync(filePath);
      return { success: true, message: 'Recording deleted successfully' };
    } catch (error) {
      console.error('Error deleting recording:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = RecordingService; 