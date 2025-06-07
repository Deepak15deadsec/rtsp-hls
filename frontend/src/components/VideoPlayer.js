/**
 * VideoPlayer component for HLS playback
 */
class VideoPlayer {
  constructor(elementId, hlsUrl) {
    this.videoElement = document.getElementById(elementId);
    this.hlsUrl = hlsUrl || '/storage/hls/stream.m3u8';
    this.wrapper = document.getElementById('video-wrapper');
    this.btnPlay = document.getElementById('btn-play');
    this.btnStop = document.getElementById('btn-stop');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.hlsInstance = null;
    this.stallCheckInterval = null;
    
    this.init();
  }

  init() {
    if (!this.videoElement) {
      console.error('Video element not found');
      return;
    }

    // Initialize event listeners
    this.initEventListeners();
    
    // Check if HLS.js is supported
    if (!window.Hls) {
      console.error('HLS.js is not available');
      return;
    }
    
    if (Hls.isSupported()) {
      this.initializeHlsPlayer();
    } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari which has built-in HLS support
      this.videoElement.src = this.hlsUrl;
      this.videoElement.addEventListener('loadedmetadata', () => {
        this.playVideo();
      });
    } else {
      console.error('HLS is not supported in this browser');
    }
  }

  initEventListeners() {
    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => this.playVideo());
    }
    
    if (this.btnStop) {
      this.btnStop.addEventListener('click', () => this.pauseVideo());
    }
    
    if (this.btnFullscreen) {
      this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }

    this.videoElement.addEventListener('play', () => {
      if (this.btnPlay) this.btnPlay.classList.add('hide');
      if (this.btnStop) this.btnStop.classList.remove('hide');
    });

    this.videoElement.addEventListener('pause', () => {
      if (this.btnPlay) this.btnPlay.classList.remove('hide');
      if (this.btnStop) this.btnStop.classList.add('hide');
    });
  }

  initializeHlsPlayer() {
    // Destroy any existing instance
    this.destroyHlsInstance();

    // Create new instance with optimized configuration
    this.hlsInstance = new Hls({
      debug: false,
      lowLatencyMode: true,
      maxBufferSize: 5 * 1000 * 1000, // 5MB max buffer size
      maxBufferLength: 10, // 10 seconds max buffer
      maxMaxBufferLength: 30, // 30 seconds absolute max buffer
      liveSyncDurationCount: 3, // Use fewer segments for synchronization
      liveMaxLatencyDurationCount: 5, // Maximum latency allowed
      maxLiveSyncPlaybackRate: 1.5, // Allow playback speedup to catch up
      manifestLoadingMaxRetry: 8,
      manifestLoadingRetryDelay: 500, // Start with 500ms delay
      manifestLoadingMaxRetryTimeout: 8000, // Max 8s retry delay
      levelLoadingTimeOut: 8000,
      fragLoadingTimeOut: 20000,
      backBufferLength: 30, // 30 seconds of backward buffer for seeking
      appendErrorMaxRetry: 5,
      enableWorker: true, // Use web workers for better performance
      startLevel: -1, // Auto select starting level
      startFragPrefetch: true // Prefetch first fragment
    });

    this.hlsInstance.attachMedia(this.videoElement);
    
    this.hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
      console.log('Video and HLS.js are now bound together');
      this.hlsInstance.loadSource(this.hlsUrl);
      
      this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('Manifest loaded, available streams:', this.hlsInstance.levels);
        
        // Start playback automatically
        this.playVideo();
        
        // Start monitoring for stalls
        this.startStallMonitoring();
      });
      
      this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error', data);
              this.hlsInstance.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error', data);
              this.hlsInstance.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover', data);
              this.destroyAndResetPlayer();
              this.init();
              break;
          }
        }
      });
    });
  }

  playVideo() {
    const playPromise = this.videoElement.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Auto-play failed:', error);
      });
    }
  }

  pauseVideo() {
    this.videoElement.pause();
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (this.wrapper) {
      this.wrapper.requestFullscreen();
    }
  }

  startStallMonitoring() {
    if (this.stallCheckInterval) {
      clearInterval(this.stallCheckInterval);
    }

    let lastPosition = this.videoElement.currentTime;
    let stallCount = 0;
    
    this.stallCheckInterval = setInterval(() => {
      // Skip check if video is paused
      if (this.videoElement.paused) {
        lastPosition = this.videoElement.currentTime;
        return;
      }
      
      // If position hasn't changed and video should be playing, we might be stalled
      if (this.videoElement.currentTime === lastPosition && 
          !this.videoElement.paused && 
          !this.videoElement.ended) {
        stallCount++;
        console.log(`Possible stall detected (${stallCount}): Position unchanged at ${lastPosition}`);
        
        // After 3 consecutive stalls, try to recover
        if (stallCount >= 3) {
          console.log('Attempting to recover from stall');
          this.videoElement.currentTime += 0.1;
          
          // If still stalled after multiple attempts, reload the player
          if (stallCount >= 5) {
            console.log('Multiple stalls detected, reloading player');
            this.destroyAndResetPlayer();
            this.init();
            return;
          }
        }
      } else {
        // Reset stall counter if we're making progress
        stallCount = 0;
        lastPosition = this.videoElement.currentTime;
      }
    }, 2000);
  }

  destroyHlsInstance() {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
  }

  destroyAndResetPlayer() {
    this.destroyHlsInstance();
    
    if (this.stallCheckInterval) {
      clearInterval(this.stallCheckInterval);
      this.stallCheckInterval = null;
    }
    
    // Reset the video element
    this.videoElement.pause();
    this.videoElement.removeAttribute('src');
    this.videoElement.load();
  }

  updateStreamUrl(newUrl) {
    this.hlsUrl = newUrl;
    this.destroyAndResetPlayer();
    this.init();
  }
}

export default VideoPlayer;