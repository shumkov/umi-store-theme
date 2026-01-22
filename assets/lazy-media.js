/**
 * Lazy Media Component
 * Loads videos only when they come into view using Intersection Observer.
 *
 * Loading flow:
 * 1. Poster image visible (bottom layer)
 * 2. Preloader shown on top of poster during loading
 * 3. Video shown on top when ready (hides poster & preloader)
 * 4. Play button shown if autoplay fails
 */
class LazyMedia extends HTMLElement {
  constructor() {
    super();
    this.video = null;
    this.isLoaded = false;
    this.observer = null;
    this.playButton = null;
    this.preloader = null;
    this.placeholder = null;
  }

  connectedCallback() {
    const mediaType = this.dataset.mediaType;

    if (mediaType === 'video') {
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

  /**
   * Shows preloader on top of poster
   */
  showPreloader() {
    if (this.preloader) return;

    this.preloader = document.createElement('div');
    this.preloader.className = 'lazy-media__preloader';
    this.preloader.innerHTML = `
      <div class="lazy-media__spinner">
        <svg xmlns="http://www.w3.org/2000/svg" class="spinner" viewBox="0 0 66 66">
          <circle stroke-width="6" cx="33" cy="33" r="30" fill="none" class="path"/>
        </svg>
      </div>
    `;

    // Hide the play icon while loading
    const playIcon = this.placeholder?.querySelector('.lazy-media__play-icon');
    if (playIcon) {
      playIcon.style.display = 'none';
    }

    this.placeholder?.appendChild(this.preloader);
  }

  /**
   * Hides preloader
   */
  hidePreloader() {
    if (this.preloader) {
      this.preloader.remove();
      this.preloader = null;
    }
  }

  /**
   * Attempts to autoplay the video and shows play button if it fails
   */
  tryAutoplay() {
    if (!this.video) return;

    this.video.play().then(() => {
      this.hidePlayButton();
    }).catch(() => {
      this.showPlayButton();
    });
  }

  /**
   * Creates and shows a play button overlay when autoplay fails
   */
  showPlayButton() {
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

  /**
   * Hides the play button overlay
   */
  hidePlayButton() {
    if (this.playButton) {
      this.playButton.style.display = 'none';
    }
  }

  loadVideo() {
    const template = this.querySelector('template[data-lazy-video]');
    this.placeholder = this.querySelector('.lazy-media__placeholder');

    if (!template || !this.placeholder) return;

    // Show preloader on top of poster
    this.showPreloader();

    // Clone the template content
    const videoElement = template.content.cloneNode(true).querySelector('video');
    if (!videoElement) return;

    // Set the src from data-src
    const src = videoElement.dataset.src;
    if (src) {
      videoElement.src = src;
      videoElement.removeAttribute('data-src');
    }

    this.video = videoElement;

    // Create wrapper for video
    const wrapper = document.createElement('div');
    wrapper.className = 'media media--transparent lazy-media__video-wrapper';
    wrapper.dataset.mediaId = this.placeholder.dataset.mediaId;
    wrapper.appendChild(videoElement);

    // Insert video wrapper BEFORE placeholder (so video is underneath)
    this.placeholder.insertAdjacentElement('beforebegin', wrapper);

    // When video is ready, hide poster to reveal video underneath
    const showVideo = () => {
      if (this.isLoaded) return;

      this.hidePreloader();
      // Hide placeholder to reveal video underneath
      this.placeholder.style.display = 'none';

      this.isLoaded = true;
      this.tryAutoplay();
    };

    // Use canplay event - fires when video can start playing
    videoElement.addEventListener('canplay', showVideo, { once: true });

    // Fallback timeout
    setTimeout(() => {
      if (!this.isLoaded) {
        showVideo();
      }
    }, 5000);
  }
}

// Register the custom element
if (!customElements.get('lazy-media')) {
  customElements.define('lazy-media', LazyMedia);
}
