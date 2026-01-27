if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
          hoverThumbnails: this.querySelector('.product__hover-thumbnails'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');
        this.desktopMql = window.matchMedia('(min-width: 990px)');

        // Initialize hover thumbnails for desktop
        this.initHoverThumbnails();

        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
        });
        if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
      }

      initHoverThumbnails() {
        if (!this.elements.hoverThumbnails) return;

        // Add click handlers to hover thumbnails
        this.elements.hoverThumbnails.querySelectorAll('[data-media-target]').forEach((item) => {
          item.querySelector('button').addEventListener('click', (e) => {
            e.preventDefault();
            this.scrollToMedia(item.dataset.mediaTarget);
          });
        });

        // Update hover thumbnails active state on scroll (for stacked layout)
        if (this.desktopMql.matches) {
          this.initScrollObserver();
        }
      }

      initScrollObserver() {
        if (!this.elements.viewer) return;

        // Only select direct children of media list to avoid nested elements with data-media-id
        const mediaItems = this.elements.viewer.querySelectorAll('.product__media-list > [data-media-id]');
        if (mediaItems.length === 0) return;

        // Flag to pause observer during programmatic scrolling
        this.isScrollingToMedia = false;

        const observerOptions = {
          root: null,
          rootMargin: '-30% 0px -30% 0px',
          threshold: 0,
        };

        this.scrollObserver = new IntersectionObserver((entries) => {
          // Skip updates during programmatic scrolling to avoid glitchy border jumps
          if (this.isScrollingToMedia) return;

          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const mediaId = entry.target.dataset.mediaId;
              this.setActiveHoverThumbnail(mediaId);
            }
          });
        }, observerOptions);

        mediaItems.forEach((item) => {
          this.scrollObserver.observe(item);
        });

        // Constrain thumbnails to media list boundary
        this.initBoundaryConstraint();
      }

      initBoundaryConstraint() {
        if (!this.elements.hoverThumbnails || !this.elements.viewer) return;

        const mediaList = this.elements.viewer.querySelector('.product__media-list');
        if (!mediaList) return;

        this.boundaryUpdateHandler = () => {
          const mediaListRect = mediaList.getBoundingClientRect();
          const thumbnailsHeight = this.elements.hoverThumbnails.offsetHeight;
          const viewportHeight = window.innerHeight;

          // Calculate where the bottom of centered thumbnails would be
          const centeredTop = (viewportHeight - thumbnailsHeight) / 2;
          const centeredBottom = centeredTop + thumbnailsHeight;

          // If media list bottom is above where thumbnails bottom would be, constrain
          if (mediaListRect.bottom < centeredBottom) {
            // Calculate top position so thumbnails bottom aligns with media list bottom
            const constrainedTop = mediaListRect.bottom - thumbnailsHeight;
            this.elements.hoverThumbnails.style.top = constrainedTop + 'px';
            this.elements.hoverThumbnails.style.transform = 'none';
            this.elements.hoverThumbnails.classList.add('is-constrained');
          } else {
            // Use normal fixed centered positioning
            this.elements.hoverThumbnails.style.top = '50%';
            this.elements.hoverThumbnails.style.transform = 'translateY(-50%)';
            this.elements.hoverThumbnails.classList.remove('is-constrained');
          }
        };

        window.addEventListener('scroll', this.boundaryUpdateHandler, { passive: true });
        window.addEventListener('resize', this.boundaryUpdateHandler, { passive: true });
        this.boundaryUpdateHandler();
      }

      disconnectedCallback() {
        if (this.scrollObserver) {
          this.scrollObserver.disconnect();
        }
        if (this.boundaryUpdateHandler) {
          window.removeEventListener('scroll', this.boundaryUpdateHandler);
          window.removeEventListener('resize', this.boundaryUpdateHandler);
        }
      }

      scrollToMedia(mediaId) {
        const targetMedia = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`);
        if (!targetMedia) return;

        // Pause observer during programmatic scrolling to avoid glitchy border jumps
        this.isScrollingToMedia = true;

        // Set active thumbnail immediately before scrolling
        this.setActiveHoverThumbnail(mediaId);

        const top = targetMedia.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top, behavior: 'smooth' });

        // Re-enable observer after scroll completes (estimate smooth scroll duration)
        setTimeout(() => {
          this.isScrollingToMedia = false;
        }, 600);
      }

      setActiveHoverThumbnail(mediaId) {
        if (!this.elements.hoverThumbnails) return;

        const allThumbnails = this.elements.hoverThumbnails.querySelectorAll('.product__hover-thumbnail-item');
        allThumbnails.forEach((item) => {
          item.classList.remove('is-active');
        });

        let activeItem = this.elements.hoverThumbnails.querySelector(`[data-media-target="${mediaId}"]`);

        // Fallback: if no match found, set first thumbnail as active
        if (!activeItem && allThumbnails.length > 0) {
          activeItem = allThumbnails[0];
        }

        if (activeItem) {
          activeItem.classList.add('is-active');
        }
      }

      onSlideChanged(event) {
        const mediaId = event.detail.currentElement.dataset.mediaId;
        const thumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        this.setActiveThumbnail(thumbnail);
        this.setActiveHoverThumbnail(mediaId);
      }

      setActiveMedia(mediaId, prepend) {
        const activeMedia =
          this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
          this.elements.viewer.querySelector('[data-media-id]');
        if (!activeMedia) {
          return;
        }
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia?.classList?.add('is-active');

        if (prepend) {
          activeMedia.parentElement.firstChild !== activeMedia && activeMedia.parentElement.prepend(activeMedia);

          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            activeThumbnail.parentElement.firstChild !== activeThumbnail && activeThumbnail.parentElement.prepend(activeThumbnail);
          }

          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        this.preventStickyHeader();
        window.setTimeout(() => {
          if (!this.mql.matches || this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
          }
          const activeMediaRect = activeMedia.getBoundingClientRect();
          // Don't scroll if the image is already in view
          if (activeMediaRect.top > -0.5) return;
          const top = activeMediaRect.top + window.scrollY;
          window.scrollTo({ top: top, behavior: 'smooth' });
        });
        this.playActiveMedia(activeMedia);

        // Update hover thumbnails active state
        this.setActiveHoverThumbnail(mediaId);

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }
    }
  );
}
