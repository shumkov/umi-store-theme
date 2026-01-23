if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
        this.clickPosition = null;
        this.savedScrollPosition = null;
      }

      hide() {
        // Restore scroll position when closing
        if (this.savedScrollPosition !== null) {
          window.scrollTo(0, this.savedScrollPosition);
          this.savedScrollPosition = null;
        }
        super.hide();
      }

      show(opener, clickPosition = null) {
        // Save current scroll position
        this.savedScrollPosition = window.scrollY;
        this.clickPosition = clickPosition;
        super.show(opener);
        this.showActiveMedia();
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

        const container = this.querySelector('[role="document"]');

        // Scroll to clicked position if available
        if (this.clickPosition && activeMedia.tagName === 'IMG') {
          // Wait for image to load and be visible
          const scrollToClick = () => {
            const imgWidth = activeMedia.offsetWidth || activeMedia.naturalWidth;
            const imgHeight = activeMedia.offsetHeight || activeMedia.naturalHeight;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            // Calculate scroll position to center the clicked point
            const scrollX = (imgWidth * this.clickPosition.clickX) - (containerWidth / 2);
            const scrollY = (imgHeight * this.clickPosition.clickY) - (containerHeight / 2);

            container.scrollLeft = Math.max(0, scrollX);
            container.scrollTop = Math.max(0, scrollY);
          };

          if (activeMedia.complete) {
            requestAnimationFrame(scrollToClick);
          } else {
            activeMedia.addEventListener('load', scrollToClick, { once: true });
          }
        } else {
          activeMedia.scrollIntoView();
          container.scrollLeft = (activeMedia.width - container.clientWidth) / 2;
        }

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
