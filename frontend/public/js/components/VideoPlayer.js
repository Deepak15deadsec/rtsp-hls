/**
 * Video Player Component
 * Handles HLS video playback with hls.js
 */
export default class VideoPlayer {
  constructor(videoElementId, hlsSource) {
    this.videoElement = document.getElementById(videoElementId);
    this.hlsSource = hlsSource;
    this.hls = null;
    
    this.init();
  }
  
  /**
   * Initialize the video player
   */
  init() {
    if (!this.videoElement) {
      console.error('Video element not found');
      return;
    }
    
    // Check if HLS is supported natively
    if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      this.videoElement.src = this.hlsSource;
      this.setupEventListeners();
    } else if (Hls.isSupported()) {
      // Use hls.js for browsers that don't support HLS natively
      this.hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30
      });
      
      this.hls.loadSource(this.hlsSource);
      this.hls.attachMedia(this.videoElement);
      this.setupHlsEventListeners();
      this.setupEventListeners();
    } else {
      console.error('HLS is not supported in this browser');
    }
  }
  
  /**
   * Set up video element event listeners
   */
  setupEventListeners() {
    const videoElement = this.videoElement;
    const btnPlay = document.getElementById('btn-play');
    const btnStop = document.getElementById('btn-stop');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (videoElement.paused) {
          videoElement.play();
          btnPlay.classList.add('hide');
          btnStop.classList.remove('hide');
        }
      });
    }
    
    if (btnStop) {
      btnStop.addEventListener('click', () => {
        videoElement.pause();
        btnStop.classList.add('hide');
        btnPlay.classList.remove('hide');
      });
    }
    
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (videoElement.requestFullscreen) {
          videoElement.requestFullscreen();
        } else if (videoElement.webkitRequestFullscreen) {
          videoElement.webkitRequestFullscreen();
        } else if (videoElement.msRequestFullscreen) {
          videoElement.msRequestFullscreen();
        }
      });
    }
    
    videoElement.addEventListener('play', () => {
      if (btnPlay && btnStop) {
        btnPlay.classList.add('hide');
        btnStop.classList.remove('hide');
      }
    });
    
    videoElement.addEventListener('pause', () => {
      if (btnPlay && btnStop) {
        btnStop.classList.add('hide');
        btnPlay.classList.remove('hide');
      }
    });
    
    videoElement.addEventListener('error', (e) => {
      console.error('Video error:', e);
    });
  }
  
  /**
   * Set up HLS.js specific event listeners
   */
  setupHlsEventListeners() {
    if (!this.hls) return;
    
    this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      console.log('HLS: Media attached');
    });
    
    this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      console.log('HLS: Manifest parsed, found ' + data.levels.length + ' quality level');
      this.videoElement.play();
    });
    
    this.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch(data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('HLS: Fatal network error', data);
            this.hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('HLS: Fatal media error', data);
            this.hls.recoverMediaError();
            break;
          default:
            console.error('HLS: Fatal error', data);
            this.destroy();
            break;
        }
      }
    });
  }
  
  /**
   * Play the video
   */
  play() {
    if (this.videoElement) {
      this.videoElement.play();
    }
  }
  
  /**
   * Pause the video
   */
  pause() {
    if (this.videoElement) {
      this.videoElement.pause();
    }
  }
  
  /**
   * Destroy the player and clean up resources
   */
  destroy() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
} 