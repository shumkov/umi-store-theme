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
        // Restore scroll position after modal is hidden
        const scrollPos = this.savedScrollPosition;
        super.hide();
        if (scrollPos !== null) {
          setTimeout(() => {
            window.scrollTo(0, scrollPos);
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
