if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
        this.clickPosition = null;
        this.savedScrollPosition = null;
        this.zoomState = new Map(); // Track zoom state per image
        this.isDragging = false;
        this.didDrag = false; // Track if actual drag movement occurred
        this.dragStart = { x: 0, y: 0 };
        this.scrollStart = { x: 0, y: 0 };
        this.currentWrapper = null;
        this.currentDragImg = null; // Track the image being dragged for cursor reset
        // Touch pinch-to-zoom state
        this.initialPinchDistance = null;
        this.initialPinchZoom = 1;
        this.currentTouchImg = null;
        this.currentTouchWrapper = null;
      }

      hide() {
        // Determine which image is currently visible in the lightbox
        const container = this.querySelector('[role="document"]');
        const mediaItems = this.querySelectorAll('[data-media-id]');
        let visibleMediaId = null;

        if (container && mediaItems.length > 0) {
          const scrollTop = container.scrollTop;
          const viewportCenter = scrollTop + container.clientHeight / 2;

          // Find the media item that's most visible (closest to viewport center)
          let closestItem = null;
          let closestDistance = Infinity;

          mediaItems.forEach(item => {
            const itemCenter = item.offsetTop + item.offsetHeight / 2;
            const distance = Math.abs(viewportCenter - itemCenter);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestItem = item;
            }
          });

          if (closestItem) {
            visibleMediaId = closestItem.getAttribute('data-media-id');
          }
        }

        // Reset all zoom states
        this.resetAllZoom();

        super.hide();

        // Scroll product page to the image that was visible in the lightbox
        if (visibleMediaId) {
          setTimeout(() => {
            // Find the corresponding image on the product page using media-gallery element
            // This selector works across all locales (aria-label is localized)
            const gallery = document.querySelector('media-gallery');
            if (gallery) {
              const productImage = gallery.querySelector(`[data-media-id$="-${visibleMediaId}"]`);
              if (productImage) {
                productImage.scrollIntoView({ behavior: 'instant', block: 'start' });
              }
            }
          }, 50);
        }

        this.savedScrollPosition = null;
      }

      show(opener, clickPosition = null) {
        // Save current scroll position
        this.savedScrollPosition = window.scrollY;
        this.clickPosition = clickPosition;
        super.show(opener);
        this.showActiveMedia();
        this.initZoomHandlers();
      }

      initZoomHandlers() {
        const container = this.querySelector('[role="document"]');
        if (!container || container.dataset.zoomInitialized) return;

        container.dataset.zoomInitialized = 'true';

        // Mouse wheel zoom (works on desktop and some touch devices with trackpads)
        container.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Mouse drag for panning (desktop)
        container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        container.addEventListener('mouseup', () => this.handleMouseUp());
        container.addEventListener('mouseleave', () => this.handleMouseUp());

        // Prevent click and pointerup events when dragging (to avoid closing lightbox)
        // ModalDialog uses pointerup to close media-modal, so we need to intercept it
        container.addEventListener('click', (e) => this.handleClick(e), true);
        container.addEventListener('pointerup', (e) => this.handlePointerUp(e), true);

        // Touch events for pinch-to-zoom (mobile)
        container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        container.addEventListener('touchend', (e) => this.handleTouchEnd(e));
      }

      handleWheel(e) {
        // Only zoom on trackpad pinch gesture (ctrlKey is set)
        // Regular wheel scrolling should scroll through images normally
        if (!e.ctrlKey) return;

        const img = e.target.closest('img');
        if (!img) return;

        const wrapper = img.closest('.product-media-modal__content');
        if (!wrapper) return;

        e.preventDefault();

        // Get or initialize zoom state for this image
        let state = this.zoomState.get(img);
        if (!state) {
          state = { zoom: 1, panX: 0, panY: 0 };
          this.zoomState.set(img, state);
        }

        // Trackpad pinch-to-zoom (finer control)
        const delta = -e.deltaY * 0.01;
        const newZoom = Math.max(1, Math.min(4, state.zoom + delta));

        if (newZoom === state.zoom) return;

        // Get mouse position relative to wrapper
        const rect = wrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate zoom point as percentage
        const percentX = (mouseX + wrapper.scrollLeft) / (wrapper.scrollWidth);
        const percentY = (mouseY + wrapper.scrollTop) / (wrapper.scrollHeight);

        state.zoom = newZoom;

        // Apply zoom transform
        img.style.transformOrigin = 'top left';
        img.style.transform = `scale(${newZoom})`;
        img.style.cursor = newZoom > 1 ? 'grab' : 'zoom-out';

        // Adjust scroll to zoom toward mouse position
        requestAnimationFrame(() => {
          const newScrollLeft = (wrapper.scrollWidth * percentX) - mouseX;
          const newScrollTop = (wrapper.scrollHeight * percentY) - mouseY;
          wrapper.scrollLeft = Math.max(0, newScrollLeft);
          wrapper.scrollTop = Math.max(0, newScrollTop);
        });
      }

      handleMouseDown(e) {
        const img = e.target.closest('img');
        if (!img) return;

        const state = this.zoomState.get(img);
        if (!state || state.zoom <= 1) return;

        const wrapper = img.closest('.product-media-modal__content');
        if (!wrapper) return;

        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.scrollStart = { x: wrapper.scrollLeft, y: wrapper.scrollTop };
        this.currentWrapper = wrapper;
        this.currentDragImg = img;
        img.style.cursor = 'grabbing';
        e.preventDefault();
      }

      handleMouseMove(e) {
        if (!this.isDragging || !this.currentWrapper) return;

        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;

        // Mark as actual drag if moved more than 5 pixels
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          this.didDrag = true;
        }

        this.currentWrapper.scrollLeft = this.scrollStart.x - dx;
        this.currentWrapper.scrollTop = this.scrollStart.y - dy;
      }

      handleClick(e) {
        // Prevent click events when dragging occurred
        if (this.didDrag) {
          e.preventDefault();
          e.stopPropagation();
        }
      }

      handlePointerUp(e) {
        // Prevent pointerup events when dragging occurred
        // This prevents ModalDialog from closing the modal on drag release
        if (this.didDrag) {
          e.stopPropagation();
          this.didDrag = false;
        }
      }

      handleMouseUp() {
        if (this.isDragging && this.currentDragImg) {
          const state = this.zoomState.get(this.currentDragImg);
          this.currentDragImg.style.cursor = state && state.zoom > 1 ? 'grab' : 'zoom-out';
        }
        this.isDragging = false;
        this.currentWrapper = null;
        this.currentDragImg = null;
      }

      // Touch handlers for pinch-to-zoom
      handleTouchStart(e) {
        const img = e.target.closest('img');
        if (!img) return;

        const wrapper = img.closest('.product-media-modal__content');
        if (!wrapper) return;

        if (e.touches.length === 2) {
          // Pinch start
          e.preventDefault();
          this.initialPinchDistance = this.getTouchDistance(e.touches);
          this.currentTouchImg = img;
          this.currentTouchWrapper = wrapper;

          // Get or initialize zoom state
          let state = this.zoomState.get(img);
          if (!state) {
            state = { zoom: 1, panX: 0, panY: 0 };
            this.zoomState.set(img, state);
          }
          this.initialPinchZoom = state.zoom;
        } else if (e.touches.length === 1) {
          // Single touch - check if zoomed for panning
          const state = this.zoomState.get(img);
          if (state && state.zoom > 1) {
            e.preventDefault(); // Prevent page scroll while panning zoomed image
            this.isDragging = true;
            this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            this.scrollStart = { x: wrapper.scrollLeft, y: wrapper.scrollTop };
            this.currentWrapper = wrapper;
          }
        }
      }

      handleTouchMove(e) {
        if (e.touches.length === 2 && this.initialPinchDistance !== null) {
          // Pinch zoom
          e.preventDefault();
          const currentDistance = this.getTouchDistance(e.touches);
          const scale = currentDistance / this.initialPinchDistance;
          const newZoom = Math.max(1, Math.min(4, this.initialPinchZoom * scale));

          const img = this.currentTouchImg;
          const wrapper = this.currentTouchWrapper;
          if (!img || !wrapper) return;

          let state = this.zoomState.get(img);
          if (!state) {
            state = { zoom: 1, panX: 0, panY: 0 };
            this.zoomState.set(img, state);
          }
          state.zoom = newZoom;

          // Apply zoom transform
          img.style.transformOrigin = 'top left';
          img.style.transform = `scale(${newZoom})`;
        } else if (e.touches.length === 1 && this.isDragging && this.currentWrapper) {
          // Single touch pan when zoomed
          e.preventDefault(); // Prevent page scroll while panning
          const dx = e.touches[0].clientX - this.dragStart.x;
          const dy = e.touches[0].clientY - this.dragStart.y;

          this.currentWrapper.scrollLeft = this.scrollStart.x - dx;
          this.currentWrapper.scrollTop = this.scrollStart.y - dy;
        }
      }

      handleTouchEnd(e) {
        if (e.touches.length < 2) {
          this.initialPinchDistance = null;
          this.currentTouchImg = null;
          this.currentTouchWrapper = null;
        }
        if (e.touches.length === 0) {
          this.isDragging = false;
          this.currentWrapper = null;
        }
      }

      getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
      }

      resetAllZoom() {
        this.zoomState.forEach((state, img) => {
          img.style.transform = '';
          img.style.transformOrigin = '';
          img.style.cursor = '';
        });
        this.zoomState.clear();
      }

      showActiveMedia() {
        this.querySelectorAll(
          `[data-media-id]:not([data-media-id="${this.openedBy.getAttribute('data-media-id')}"])`
        ).forEach((element) => {
          element.classList.remove('active');
        });
        const activeMedia = this.querySelector(`[data-media-id="${this.openedBy.getAttribute('data-media-id')}"]`);
        const activeMediaTemplate = activeMedia.querySelector('template');
        const activeMediaContent = activeMediaTemplate ? activeMediaTemplate.content : null;
        activeMedia.classList.add('active');

        // Scroll to the clicked image after a short delay to ensure modal is rendered
        setTimeout(() => {
          activeMedia.scrollIntoView({ behavior: 'instant', block: 'start' });
        }, 50);

        if (
          activeMedia.nodeName == 'DEFERRED-MEDIA' &&
          activeMediaContent &&
          (activeMediaContent.querySelector('.js-youtube') || activeMediaContent.querySelector('video'))
        )
          activeMedia.loadContent();
      }
    }
  );
}
