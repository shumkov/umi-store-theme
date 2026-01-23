/**
 * Lazy Media Component
 * Loads videos only when they come into view using Intersection Observer.
 * Uses native video poster for smooth loading experience.
 *
 * Flow:
 * 1. Video element with native poster (no src yet)
 * 2. When visible: set src, hide preloader when can play
 * 3. Autoplay, show play button if fails
 */
class LazyMedia extends HTMLElement {
  constructor() {
    super();
    this.video = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.observer = null;
    this.playButton = null;
    this.preloader = null;
  }

  connectedCallback() {
    const mediaType = this.dataset.mediaType;

    if (mediaType === 'video') {
      this.video = this.querySelector('video');
      this.preloader = this.querySelector('.lazy-media__preloader');
      this.initVideoObserver();
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

  hidePreloader() {
    if (this.preloader) {
      this.preloader.remove();
      this.preloader = null;
    }
  }

  tryAutoplay() {
    if (!this.video) return;

    this.video.play().then(() => {
      this.hidePlayButton();
    }).catch(() => {
      this.showPlayButton();
    });
  }

  showPlayButton() {
    // Hide preloader first
    this.hidePreloader();

    if (this.playButton) {
      this.playButton.style.display = 'flex';
      return;
    }

    this.playButton = document.createElement('button');
    this.playButton.className = 'lazy-media__video-play-button';
    this.playButton.setAttribute('aria-label', 'Play video');
    this.playButton.innerHTML = `
      <span class="svg-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" class="icon icon-play" viewBox="0 0 10 14">
          <path fill="currentColor" fill-rule="evenodd" d="M1.482.815A1 1 0 0 0 0 1.69v10.517a1 1 0 0 0 1.525.851L10.54 7.5a1 1 0 0 0-.043-1.728z" clip-rule="evenodd"/>
        </svg>
      </span>
    `;

    this.playButton.addEventListener('click', () => {
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

    this.video?.addEventListener('play', () => {
      this.hidePlayButton();
    });
  }

  hidePlayButton() {
    if (this.playButton) {
      this.playButton.style.display = 'none';
    }
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
