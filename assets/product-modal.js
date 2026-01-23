if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
        this.clickPosition = null;
      }

      hide() {
        super.hide();
      }

      show(opener, clickPosition = null) {
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
          // Wait for image to be visible and get its dimensions
          requestAnimationFrame(() => {
            const imgWidth = activeMedia.offsetWidth;
            const imgHeight = activeMedia.offsetHeight;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            // Calculate scroll position to center the clicked point
            const scrollX = (imgWidth * this.clickPosition.clickX) - (containerWidth / 2);
            const scrollY = (imgHeight * this.clickPosition.clickY) - (containerHeight / 2);

            container.scrollLeft = Math.max(0, scrollX);
            container.scrollTop = Math.max(0, scrollY);
          });
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
