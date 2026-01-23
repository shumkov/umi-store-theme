/**
 * Lazy Media Component
 * Loads videos only when they come into view using Intersection Observer.
 * Uses native video poster for smooth loading experience.
 *
 * Flow:
 * 1. Video element with native poster and fallback img (no src yet)
 * 2. When visible: set src, hide preloader when can play
 * 3. Autoplay if possible, otherwise show play button
 * 4. Click anywhere to play, click playing video for fullscreen
 */
class LazyMedia extends HTMLElement {
  constructor() {
    super();
    this.video = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.observer = null;
    this.preloader = null;
    this.playButton = null;
    this.justExitedFullscreen = false;
    this._onFullscreenChange = this.onFullscreenChange.bind(this);
    this._wasFullscreen = false;
  }

  connectedCallback() {
    const mediaType = this.dataset.mediaType;

    if (mediaType === 'video') {
      this.video = this.querySelector('video');
      this.preloader = this.querySelector('.lazy-media__preloader');
      this.initVideoObserver();
      this.initVideoClickHandler();
    }
  }

  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
    }
    document.removeEventListener('fullscreenchange', this._onFullscreenChange);
  }

  initVideoObserver() {
    const options = {
      root: null,
      rootMargin: '300px 0px',
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!this.isLoaded) {
            this.loadVideo();
          } else if (this.video) {
            this.tryAutoplay();
          }
        } else if (this.video && this.isLoaded && !this.justExitedFullscreen) {
          this.video.pause();
        }
      });
    }, options);

    this.observer.observe(this);
  }

  initVideoClickHandler() {
    if (!this.video) return;

    // Click anywhere on video: paused -> play, playing -> fullscreen
    this.video.addEventListener('click', () => {
      if (this.video.paused) {
        this.video.play().then(() => {
          this.hidePlayButton();
        }).catch(() => {});
      } else {
        this.toggleFullscreen();
      }
    });

    // Hide play button when video starts playing
    this.video.addEventListener('play', () => {
      this.hidePlayButton();
    });

    // Show play button when video is paused (if loaded)
    this.video.addEventListener('pause', () => {
      if (this.isLoaded) {
        this.showPlayButton();
      }
    });

    // iOS Safari - resume playback after exiting fullscreen
    this.video.addEventListener('webkitendfullscreen', () => {
      this.justExitedFullscreen = true;
      setTimeout(() => {
        this.justExitedFullscreen = false;
      }, 500);
      this.video.play().catch(() => {
        this.showPlayButton();
      });
    });

    // Standard browsers - use bound handler for proper cleanup
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
  }

  onFullscreenChange() {
    // Track when THIS video enters fullscreen
    if (document.fullscreenElement === this.video) {
      this._wasFullscreen = true;
      return;
    }
    // Only resume if THIS video was in fullscreen
    if (this._wasFullscreen && !document.fullscreenElement) {
      this._wasFullscreen = false;
      this.justExitedFullscreen = true;
      setTimeout(() => {
        this.justExitedFullscreen = false;
      }, 500);
      this.video?.play().catch(() => {
        this.showPlayButton();
      });
    }
  }

  toggleFullscreen() {
    if (!this.video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (this.video.requestFullscreen) {
      this.video.requestFullscreen();
    } else if (this.video.webkitRequestFullscreen) {
      // Safari
      this.video.webkitRequestFullscreen();
    } else if (this.video.webkitEnterFullscreen) {
      // iOS Safari
      this.video.webkitEnterFullscreen();
    }
  }

  hidePreloader() {
    if (this.preloader) {
      this.preloader.remove();
      this.preloader = null;
    }
  }

  showPlayButton() {
    if (this.playButton) {
      this.playButton.style.display = 'block';
      return;
    }

    this.playButton = document.createElement('button');
    this.playButton.className = 'lazy-media__play-button';
    this.playButton.setAttribute('aria-label', 'Play video');
    // No innerHTML - CSS ::before/::after handle the icon

    this.playButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.video) {
        this.video.play().then(() => {
          this.hidePlayButton();
        }).catch(() => {});
      }
    });

    const wrapper = this.video?.parentElement;
    if (wrapper) {
      wrapper.appendChild(this.playButton);
    }
  }

  hidePlayButton() {
    if (this.playButton) {
      this.playButton.style.display = 'none';
    }
  }

  tryAutoplay() {
    if (!this.video) return;
    this.video.play().then(() => {
      this.hidePlayButton();
    }).catch(() => {
      // Autoplay failed - show play button
      this.showPlayButton();
    });
  }

  loadVideo() {
    if (!this.video || this.isLoading || this.isLoaded) return;

    this.isLoading = true;

    // Set src on source element (matches working video pattern)
    const source = this.video.querySelector('source[data-src]');
    if (source) {
      source.src = source.dataset.src;
      source.removeAttribute('data-src');
      this.video.load();
    }

    // Hide preloader and fallback img when video can play
    this.video.addEventListener('canplay', () => {
      this.isLoading = false;
      this.isLoaded = true;
      this.hidePreloader();
      // Remove fallback img inside video
      const fallbackImg = this.video.querySelector('img');
      if (fallbackImg) fallbackImg.remove();
      this.tryAutoplay();
    }, { once: true });

    // Handle load errors
    this.video.addEventListener('error', () => {
      this.isLoading = false;
      this.hidePreloader();
      this.showPlayButton();
    }, { once: true });
  }
}

// Register the custom element
if (!customElements.get('lazy-media')) {
  customElements.define('lazy-media', LazyMedia);
}
