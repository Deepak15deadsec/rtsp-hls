const ffmpeg = require('fluent-ffmpeg');
const { ffmpegConfig, streamDirectory } = require('./config/config.js');
const { checkDirectoryExists, cleanDirectory, createDirectory, findFile } = require('./helpers/index.js');
const { clearInterval } = require('timers');

class Stream {
  data = {
    streamProcess: null,
    clients: [],
    intervalId: null,
    streamfileStatus: {
      found: null,
      message: null,
    },
  };
  static instance = null;

  constructor() {
  }

  static getInstance() {
    if (!Stream.instance) {
      Stream.instance = new Stream();
    }
    return Stream.instance;
  }

  clearInstance() {
    Stream.instance = null;
  }

  setStreamProcess(processState) {
    this.data.streamProcess = processState;
  }

  getStream() {
    return this.data.streamProcess;
  }

  updateStatus(found, message) {
    this.data.streamfileStatus.found = found;
    this.data.streamfileStatus.message = message;
  }

  getStatus() {
    return this.data.streamfileStatus;
  }

  validateDirectory() {
    const hlsOutputDir = streamDirectory.hls.output.dir;
    const isHlsDirectory = checkDirectoryExists(hlsOutputDir);

    if (isHlsDirectory) {
      cleanDirectory(hlsOutputDir);
    } else {
      createDirectory(hlsOutputDir);
    }
  }

  checkFileStreamExists(hlsOutputDir, hlsOutputFileName) {
    const checkingTime = 1000;
    let checkCount = 0;
    const maxChecks = 60; // Limit checks to 60 attempts (60 seconds)

    // Check if codecs are defined in the configuration
    if (!ffmpegConfig.codecs || !ffmpegConfig.codecs.video || !ffmpegConfig.codecs.audio) {
      console.error('Error: Missing required codecs in ffmpeg configuration.');
      this.updateStatus(false, 'Codec error, stream cannot start');
      return;
    }

    this.data.intervalId = setInterval(async () => {
      checkCount++;
      const fileStreamExists = await findFile(hlsOutputDir, hlsOutputFileName);

      if (fileStreamExists) {
        console.log(`${hlsOutputFileName} found in public/hls`);
        
        // Additional check - verify the file has content
        try {
          const fs = require('fs');
          const path = require('path');
          const filePath = path.join(hlsOutputDir, hlsOutputFileName);
          const stats = fs.statSync(filePath);
          
          if (stats.size === 0) {
            console.log(`${hlsOutputFileName} exists but is empty, waiting for content...`);
            return;
          }
          
          // Check if we have at least one ts segment file
          const files = fs.readdirSync(hlsOutputDir);
          const tsFiles = files.filter(file => file.endsWith('.ts'));
          
          if (tsFiles.length === 0) {
            console.log(`No .ts segment files found yet, waiting...`);
            return;
          }
          
          console.log(`Stream is ready with ${tsFiles.length} segments`);
          clearInterval(this.data.intervalId);
          this.updateStatus(true, 'Stream online');
        } catch (err) {
          console.error('Error checking stream file:', err);
          // Continue checking
          return;
        }
      } else {
        console.log(`${hlsOutputFileName} not found in public/hls (attempt ${checkCount}/${maxChecks})`);
        this.updateStatus(false, 'Loading stream...');
        
        // Stop checking after maximum attempts
        if (checkCount >= maxChecks) {
          console.log('Maximum check attempts reached. Stream may not be available.');
          clearInterval(this.data.intervalId);
          this.updateStatus(false, 'Stream error');
          
          // Try restarting the stream
          if (this.data.streamProcess) {
            console.log('Attempting to restart stream conversion...');
            this.killStreamProcess();
            setTimeout(() => {
              this.startStreamConversion('camera-first');
            }, 2000);
          }
        }
      }
    }, checkingTime);
  }

  processFFmpegStream(config, camera) {
    const camUrl = camera == 'camera-first' ? config.rtspUrl : config.rtspUrlSecond;

    // Add a retry mechanism for stream initialization
    const maxRetries = 5;
    let retryCount = 0;
    
    const initStream = () => {
      console.log(`Initializing stream (attempt ${retryCount + 1}/${maxRetries})`);
      
      const streamProcess = ffmpeg(camUrl)
        .inputOptions([
          '-rtsp_transport tcp',
          '-re',                   // Read input at native frame rate
          '-fflags nobuffer',      // Reduce input buffering for lower latency
          '-flags low_delay',      // Enable low delay flags
          '-strict experimental',  // Allow experimental codecs
          '-thread_queue_size 512' // Increase thread queue size to avoid "Thread message queue blocking"
        ])
        .addOptions(config.ffmpegOptions)
        .videoCodec(config.codecs.video)
        .audioCodec(config.codecs.audio)
        .output(config.output)
        .on('end', () => {
          console.log('Stream conversion ended.');
          streamProcess.kill('SIGINT');
          
          // Auto-restart on normal end if not manually killed
          if (this.data.streamProcess) {
            console.log('Stream ended normally, restarting...');
            setTimeout(() => {
              this.setStreamProcess(null);
              this.startStreamConversion(camera);
            }, 2000);
          }
        })
        .on('error', (err) => {
          console.error('error:', err);
          streamProcess.kill('SIGINT');
          clearInterval(this.data.intervalId);
          console.log('Stream ended due to error:', err.message);
          
          // Attempt to restart the stream after a brief delay with exponential backoff
          if (retryCount < maxRetries) {
            retryCount++;
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff with 30s max
            console.log(`Attempting to restart stream in ${backoffDelay/1000}s (retry ${retryCount}/${maxRetries})...`);
            
            setTimeout(() => {
              this.setStreamProcess(null);
              initStream();
            }, backoffDelay);
          } else {
            console.log('Maximum retry attempts reached. Stream failed to start.');
            this.updateStatus(false, 'Stream failed after maximum retries');
          }
        })
        .on('start', (commandLine) => {
          console.log('Stream started', commandLine);
          retryCount = 0; // Reset retry counter on successful start
          this.checkFileStreamExists(config.outputDirectory, config.outputFile);
        })
        .on('stderr', (stderrLine) => {
          // Only log serious errors or specific patterns to avoid console flooding
          if (stderrLine.includes('Error') || 
              stderrLine.includes('error') || 
              stderrLine.includes('failed') ||
              stderrLine.includes('Invalid') ||
              stderrLine.includes('No such')) {
            console.log('FFmpeg: ' + stderrLine);
          }
        });

      this.setStreamProcess(streamProcess);
      return streamProcess;
    };
    
    return initStream();
  }

  startStreamHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Check stream health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      if (!this.data.streamProcess) return;
      
      try {
        const fs = require('fs');
        const path = require('path');
        const hlsOutputDir = streamDirectory.hls.output.dir;
        const segmentFiles = fs.readdirSync(hlsOutputDir).filter(file => file.endsWith('.ts'));
        
        // Check if new segments are being created
        if (segmentFiles.length > 0) {
          const newestSegment = segmentFiles
            .map(file => ({
              name: file,
              time: fs.statSync(path.join(hlsOutputDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time)[0];
          
          const now = Date.now();
          const segmentAge = (now - newestSegment.time) / 1000; // in seconds
          
          if (segmentAge > 10) { // If no new segments in last 10 seconds
            console.log(`Stream may be stuck. Last segment ${newestSegment.name} is ${segmentAge.toFixed(1)}s old`);
            
            // Restart the stream
            this.killStreamProcess();
            setTimeout(() => {
              this.startStreamConversion('camera-first');
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Error in stream health check:', err);
      }
    }, 30000);
  }

  startStreamConversion(camera) {
    if (this.data.streamProcess) return;

    this.validateDirectory();
    const process = this.processFFmpegStream(ffmpegConfig, camera);
    process.run();
    this.startStreamHealthCheck();

    return this.data.streamProcess;
  }

  killStreamProcess() {
    if (this.data.streamProcess) {
      this.data.streamProcess.kill('SIGINT');
      this.setStreamProcess(null);
      this.updateStatus(null, 'stream ended');
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      this.clearInstance();
    }
  }
}

module.exports = Stream;
