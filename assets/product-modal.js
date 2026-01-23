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

        super.hide();

        // Scroll product page to the image that was visible in the lightbox
        if (visibleMediaId) {
          setTimeout(() => {
            // Find the corresponding image on the product page
            // Product page images have IDs like "template--...--main-N" where N is the media ID
            const gallery = document.querySelector('[role="region"][aria-label="Gallery Viewer"]');
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
