/**
 * Lazy Media Component
 * Loads videos only when they come into view using Intersection Observer.
 * Videos autoplay when visible and pause when scrolled out of view.
 * Shows a play button if autoplay fails (e.g., due to browser restrictions).
 */
class LazyMedia extends HTMLElement {
  constructor() {
    super();
    this.video = null;
    this.isLoaded = false;
    this.observer = null;
    this.playButton = null;
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
    // Options for the observer - preload video 300px before it enters viewport
    const options = {
      root: null,
      rootMargin: '300px 0px', // Start loading 300px before entering viewport for smoother experience
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

    // Create play button
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

    // Add click handler
    this.playButton.addEventListener('click', () => {
      if (this.video) {
        this.video.play().then(() => {
          this.hidePlayButton();
        }).catch(() => {});
      }
    });

    // Insert play button into the video wrapper
    const wrapper = this.video?.parentElement;
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.appendChild(this.playButton);
    }

    // Hide play button when video starts playing (e.g., user clicks on video itself)
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
    const placeholder = this.querySelector('.lazy-media__placeholder');

    if (!template || !placeholder) return;

    // Clone the template content
    const videoElement = template.content.cloneNode(true).querySelector('video');

    if (!videoElement) return;

    // Set the src from data-src
    const src = videoElement.dataset.src;
    if (src) {
      videoElement.src = src;
      videoElement.removeAttribute('data-src');
    }

    // Create a wrapper div for the video
    const wrapper = document.createElement('div');
    wrapper.className = 'media media--transparent';
    wrapper.dataset.mediaId = placeholder.dataset.mediaId;

    // Initially hide the video until it's ready to prevent gray loading artifact
    videoElement.style.opacity = '0';
    wrapper.appendChild(videoElement);

    // Insert video wrapper after placeholder (keep placeholder visible for now)
    placeholder.after(wrapper);

    this.video = videoElement;

    // Wait for video to have loaded enough data before showing it
    const showVideo = () => {
      videoElement.style.opacity = '1';
      placeholder.remove();
      this.isLoaded = true;
      this.tryAutoplay();
    };

    // Use loadeddata event to ensure video has frames ready before showing
    if (videoElement.readyState >= 2) {
      // Video already has enough data
      showVideo();
    } else {
      videoElement.addEventListener('loadeddata', showVideo, { once: true });
      // Fallback timeout in case loadeddata doesn't fire
      setTimeout(() => {
        if (!this.isLoaded) {
          showVideo();
        }
      }, 2000);
    }
  }
}

// Register the custom element
if (!customElements.get('lazy-media')) {
  customElements.define('lazy-media', LazyMedia);
}
