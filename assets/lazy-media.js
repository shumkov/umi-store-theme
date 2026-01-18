/**
 * Lazy Media Component
 * Loads videos only when they come into view using Intersection Observer.
 * Videos autoplay when visible and pause when scrolled out of view.
 */
class LazyMedia extends HTMLElement {
  constructor() {
    super();
    this.video = null;
    this.isLoaded = false;
    this.observer = null;
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
            this.video.play().catch(() => {});
          }
        } else if (this.video && this.isLoaded) {
          this.video.pause();
        }
      });
    }, options);

    this.observer.observe(this);
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
    wrapper.appendChild(videoElement);

    // Replace placeholder with the video
    placeholder.replaceWith(wrapper);

    this.video = videoElement;
    this.isLoaded = true;

    // Start playing
    this.video.play().catch(() => {});
  }
}

// Register the custom element
if (!customElements.get('lazy-media')) {
  customElements.define('lazy-media', LazyMedia);
}
