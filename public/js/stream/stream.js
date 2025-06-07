import Panel from '../panel/panel.js';
import { insertText, showElement, hideElement, CAMERA_NAME } from '../utils/utils.js';

export default class Stream extends Panel {
  constructor() {
    super();
    this.btnFullscreen = document.getElementById('btn-fullscrean');
    this.btnPlay = document.getElementById('btn-play');
    this.btnStop = document.getElementById('btn-stop');
    this.checkStreamOnStartPage();
    this.initEventListeners();
  }

  get radioValueStorage() {
    return localStorage.getItem('radioValue');
  }

  initEventListeners() {
    if (this.startStreamBtn) this.startStreamBtn.addEventListener('click', async () => this.checkStreamStatus());
    if (this.btnFullscreen) this.btnFullscreen.addEventListener('click', () => this.toggleFullScreen());
    if (this.btnPlay) this.btnPlay.addEventListener('click', () => this.playStopVideo());
    if (this.btnStop) this.btnStop.addEventListener('click', () => this.playStopVideo());
  }

  toggleFullScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.videoWrapper.requestFullscreen();
    }
  }

  playStopVideo() {
    if (this.video.paused) {
      this.video.play();
      hideElement([this.btnPlay]);
      showElement([this.btnStop]);
    } else {
      this.video.pause();
      hideElement([this.btnStop]);
      showElement([this.btnPlay]);
    }
  }

  async startRecording() {
    try {
      await fetch('/start-recording', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: this.radioValueStorage }),
      });
      showElement([this.recordingStatus]);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  showStream() {
    if (typeof Hls === 'undefined') {
      insertText(this.streamStatus, 'Hls is not supported');
      return;
    }
    // eslint-disable-next-line no-undef
    if (Hls.isSupported()) {
      // eslint-disable-next-line no-undef
      if (!this.hlsInstance) this.hlsInstance = new Hls({
        debug: false,
        // Low latency optimizations
        lowLatencyMode: true,
        // Network optimizations
        maxBufferSize: 5 * 1000 * 1000, // 5MB max buffer size
        maxBufferLength: 10, // 10 seconds max buffer
        maxMaxBufferLength: 30, // 30 seconds absolute max buffer
        liveSyncDurationCount: 3, // Use fewer segments for synchronization
        liveMaxLatencyDurationCount: 5, // Maximum latency allowed
        maxLiveSyncPlaybackRate: 1.5, // Allow playback speedup to catch up
        // Recovery strategies
        manifestLoadingMaxRetry: 8,
        manifestLoadingRetryDelay: 500, // Start with 500ms delay
        manifestLoadingMaxRetryTimeout: 8000, // Max 8s retry delay
        levelLoadingTimeOut: 8000,
        fragLoadingTimeOut: 20000,
        // Faster recovery on errors
        backBufferLength: 30, // 30 seconds of backward buffer for seeking
        appendErrorMaxRetry: 5,
        enableWorker: true, // Use web workers for better performance
        // Fast start
        startLevel: -1, // Auto select starting level
        startFragPrefetch: true, // Prefetch first fragment
      });

      if (this.endStreamBtn && this.videoWrapper) {
        showElement([this.endStreamBtn, this.videoWrapper]);
      }

      if (this.startStreamBtn) {
        hideElement([this.startStreamBtn]);
      }

      // Set video to muted to help with autoplay policies
      this.video.muted = true;
      
      this.hlsInstance.attachMedia(this.video);
      // eslint-disable-next-line no-undef
      this.hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
        this.hlsInstance.loadSource('/hls/stream.m3u8');
        
        // Add error handling for manifest loading
        this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn('Network error:', data.details);
            if (data.response && data.response.code === 404) {
              console.log('Stream file not found, will retry automatically');
            }
          } else if (data.fatal) {
            // Fatal errors require manual recovery
            switch(data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Fatal network error', data);
                // Try to recover network error
                this.hlsInstance.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error', data);
                // Try to recover media error
                this.hlsInstance.recoverMediaError();
                break;
              default:
                // Cannot recover other fatal errors
                console.error('Fatal error, cannot recover', data);
                this.destroyAndResetPlayer();
                this.showStream(); // Try to recreate the player
                break;
            }
          }
        });
        
        // Auto-play when media is loaded
        this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          this.video.play()
            .then(() => {
              // Video is playing, update UI
              hideElement([this.btnPlay]);
              showElement([this.btnStop]);
              
              // Start monitoring for stream stalls
              this.startStallMonitoring();
            })
            .catch(error => {
              console.warn('Auto-play failed:', error);
              // If autoplay fails (browser policy), show play button
              hideElement([this.btnStop]);
              showElement([this.btnPlay]);
            });
        });
      });
    }
  }

  // Add this method to destroy and reset the player
  destroyAndResetPlayer() {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }

    if (this.stallCheckInterval) {
      clearInterval(this.stallCheckInterval);
      this.stallCheckInterval = null;
    }
  }

  // Add stall monitoring to detect and recover from stalled playback
  startStallMonitoring() {
    if (this.stallCheckInterval) {
      clearInterval(this.stallCheckInterval);
    }

    let lastPosition = this.video.currentTime;
    let stallCount = 0;
    
    this.stallCheckInterval = setInterval(() => {
      // Skip check if video is paused
      if (this.video.paused) {
        lastPosition = this.video.currentTime;
        return;
      }
      
      // If position hasn't changed and video should be playing, we might be stalled
      if (this.video.currentTime === lastPosition && !this.video.paused && !this.video.ended) {
        stallCount++;
        console.log(`Possible stall detected (${stallCount}): Position unchanged at ${lastPosition}`);
        
        // After 3 consecutive stalls, try to recover
        if (stallCount >= 3) {
          console.log('Attempting to recover from stall');
          
          // Try seeking forward slightly
          this.video.currentTime += 0.1;
          
          // If still stalled after multiple attempts, reload the player
          if (stallCount >= 5) {
            console.log('Multiple stalls detected, reloading player');
            this.destroyAndResetPlayer();
            this.showStream();
            return;
          }
        }
      } else {
        // Reset stall counter if we're making progress
        stallCount = 0;
        lastPosition = this.video.currentTime;
      }
    }, 2000); // Check every 2 seconds
  }

  async checkStreamStatus() {
    let continuePolling = true;

    while (continuePolling) {
      try {
        const response = await fetch('/stream-status');
        const transcription = await response.json();

        if (transcription.found) {
          insertText(this.streamStatus, transcription.message);

          continuePolling = false;

          this.showStream();
          this.startRecording();
        } else if (transcription.found === false) {
          insertText(this.streamStatus, 'Ładowanie transmisji...');
          if (this.startStreamBtn) hideElement([this.startStreamBtn]);
        } else {
          insertText(this.streamStatus, 'Transmisja offline');
        }
      } catch (error) {
        console.error('Error fetching stream status:', error);
        insertText(this.streamStatus, 'Error checking status.');
        break; // Optionally stop polling in case of an error
      }

      // Wait for 2 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  async checkStreamOnStartPage() {
    try {
      const response = await fetch('/stream-status');
      const transcription = await response.json();

      if (transcription.found) {
        this.showStream();

        if (this.cameraName && this.radioValueStorage) {
          const cameraTxt = this.radioValueStorage == 'camera-first' ? CAMERA_NAME.camera1 : CAMERA_NAME.camera2;
          insertText(this.cameraName, cameraTxt);
        }

        if (this.chooseCameraBtn) {
          hideElement([this.chooseCameraBtn]);
        }

        showElement([this.videoWrapper]);
        insertText(this.streamStatus, 'Transmisja online');
        this.recordingStatus && showElement([this.recordingStatus]);
        return;
      }

      insertText(this.streamStatus, 'Transmisja offline');
    } catch (error) {
      console.error('Error fetching stream status:', error);
      insertText(this.streamStatus, 'Error checking status.');
    }
  }
}
