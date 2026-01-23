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
        } else if (this.video && this.isLoaded) {
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

    // Resume playback after exiting fullscreen (mobile browsers pause on exit)
    this.video.addEventListener('webkitendfullscreen', () => {
      this.video.play().catch(() => {});
    });
    this.video.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        this.video.play().catch(() => {});
      }
    });
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
      this.playButton.style.display = 'flex';
      return;
    }

    this.playButton = document.createElement('button');
    this.playButton.className = 'lazy-media__play-button';
    this.playButton.setAttribute('aria-label', 'Play video');
    this.playButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;

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
