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
          this.updateStatus(true, 'Transmisja online');
        } catch (err) {
          console.error('Error checking stream file:', err);
          // Continue checking
          return;
        }
      } else {
        console.log(`${hlsOutputFileName} not found in public/hls (attempt ${checkCount}/${maxChecks})`);
        this.updateStatus(false, 'Ładowanie tramsmisji');
        
        // Stop checking after maximum attempts
        if (checkCount >= maxChecks) {
          console.log('Maximum check attempts reached. Stream may not be available.');
          clearInterval(this.data.intervalId);
          this.updateStatus(false, 'Problem z transmisją');
          
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

    const streamProcess = ffmpeg(camUrl)
      .inputOptions([
        '-rtsp_transport tcp',
        '-re'
      ])
      .addOptions(config.ffmpegOptions)
      .videoCodec(config.codecs.video)
      .audioCodec(config.codecs.audio)
      .output(config.output)
      .on('end', () => {
        console.log('Stream conversion ended.');
        streamProcess.kill('SIGINT');
      })
      .on('error', (err) => {
        console.error('error:', err);
        streamProcess.kill('SIGINT');
        clearInterval(this.data.intervalId);
        console.log('Stream ended due to error:', err.message);
        
        // Attempt to restart the stream after a brief delay
        setTimeout(() => {
          console.log('Attempting to restart stream...');
          this.setStreamProcess(null);
          this.startStreamConversion(camera);
        }, 5000);
      })
      .on('start', (commandLine) => {
        console.log('Stream started', commandLine);
        this.checkFileStreamExists(config.outputDirectory, config.outputFile);
      });

    this.setStreamProcess(streamProcess);
  }

  startStreamConversion(camera) {
    if (this.data.streamProcess) return;

    this.validateDirectory();
    this.processFFmpegStream(ffmpegConfig, camera);
    this.data.streamProcess.run();

    return this.data.streamProcess;
  }

  killStreamProcess() {
    if (this.data.streamProcess) {
      this.data.streamProcess.kill('SIGINT');
      this.setStreamProcess(null);
      this.updateStatus(null, 'stream ended');
      this.clearInstance();
    }
  }
}

module.exports = Stream;
