/**
 * Infinite Scroll for Collection Pages
 * Uses Intersection Observer to load more products as user scrolls
 */
class InfiniteScroll extends HTMLElement {
  constructor() {
    super();
    this.productGrid = document.getElementById('product-grid');
    this.loading = false;
    this.observer = null;
    this.init();
  }

  init() {
    // Get pagination data from element attributes
    this.currentPage = parseInt(this.dataset.currentPage) || 1;
    this.totalPages = parseInt(this.dataset.totalPages) || 1;
    this.sectionId = this.dataset.sectionId;

    // Don't initialize if there's only one page
    if (this.totalPages <= 1) {
      this.remove();
      return;
    }

    this.setupObserver();
  }

  setupObserver() {
    const options = {
      root: null,
      rootMargin: '200px', // Start loading 200px before reaching the element
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !this.loading && this.currentPage < this.totalPages) {
          this.loadMore();
        }
      });
    }, options);

    this.observer.observe(this);
  }

  async loadMore() {
    if (this.loading || this.currentPage >= this.totalPages) return;

    this.loading = true;
    this.showLoader();

    const nextPage = this.currentPage + 1;

    try {
      // Build URL with current search params (for filters/sorting)
      const url = new URL(window.location.href);
      url.searchParams.set('page', nextPage);
      url.searchParams.set('section_id', this.sectionId);

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Get new products from the response
      const newProducts = doc.querySelectorAll('#product-grid > li');

      if (newProducts.length > 0) {
        // Append new products to the grid
        newProducts.forEach((product) => {
          // Remove scroll animation triggers for appended items
          product.querySelectorAll('.scroll-trigger').forEach((el) => {
            el.classList.add('scroll-trigger--cancel');
          });
          this.productGrid.appendChild(product);
        });

        // Update current page
        this.currentPage = nextPage;
        this.dataset.currentPage = nextPage;

        // Update URL without page reload (optional - for better UX)
        this.updateURL(nextPage);

        // Initialize any scroll animations for new content
        if (typeof initializeScrollAnimationTrigger === 'function') {
          initializeScrollAnimationTrigger();
        }
      }

      // Check if we've loaded all pages
      if (this.currentPage >= this.totalPages) {
        this.complete();
      }

    } catch (error) {
      console.error('Infinite scroll error:', error);
      this.showError();
    } finally {
      this.loading = false;
      this.hideLoader();
    }
  }

  showLoader() {
    this.classList.add('loading');
    const spinner = this.querySelector('.infinite-scroll__spinner');
    if (spinner) spinner.classList.remove('hidden');
  }

  hideLoader() {
    this.classList.remove('loading');
    const spinner = this.querySelector('.infinite-scroll__spinner');
    if (spinner) spinner.classList.add('hidden');
  }

  showError() {
    const errorEl = this.querySelector('.infinite-scroll__error');
    if (errorEl) {
      errorEl.classList.remove('hidden');
      // Add retry button functionality
      const retryBtn = errorEl.querySelector('.infinite-scroll__retry');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          errorEl.classList.add('hidden');
          this.loadMore();
        }, { once: true });
      }
    }
  }

  complete() {
    // Stop observing when all pages are loaded
    if (this.observer) {
      this.observer.disconnect();
    }
    this.classList.add('complete');

    const completeEl = this.querySelector('.infinite-scroll__complete');
    if (completeEl) completeEl.classList.remove('hidden');

    const spinner = this.querySelector('.infinite-scroll__spinner');
    if (spinner) spinner.classList.add('hidden');
  }

  updateURL(page) {
    const url = new URL(window.location.href);
    if (page > 1) {
      url.searchParams.set('page', page);
    } else {
      url.searchParams.delete('page');
    }
    // Use replaceState to update URL without adding to history
    history.replaceState({ page }, '', url.toString());
  }

  // Reset infinite scroll (called when filters change)
  reset() {
    this.currentPage = 1;
    this.dataset.currentPage = 1;
    this.loading = false;
    this.classList.remove('complete');

    const completeEl = this.querySelector('.infinite-scroll__complete');
    if (completeEl) completeEl.classList.add('hidden');

    const errorEl = this.querySelector('.infinite-scroll__error');
    if (errorEl) errorEl.classList.add('hidden');

    // Re-setup observer if it was disconnected
    if (!this.observer) {
      this.setupObserver();
    }
  }
}

customElements.define('infinite-scroll', InfiniteScroll);

// Hook into facets.js to reset infinite scroll when filters change
const originalRenderProductGridContainer = FacetFiltersForm.renderProductGridContainer;
FacetFiltersForm.renderProductGridContainer = function(html) {
  originalRenderProductGridContainer.call(this, html);

  // After rendering new content, reinitialize infinite scroll
  const infiniteScroll = document.querySelector('infinite-scroll');
  if (infiniteScroll) {
    // The infinite scroll element will be replaced, so we need to let the new one initialize
    const newInfiniteScroll = document.querySelector('infinite-scroll');
    if (newInfiniteScroll && newInfiniteScroll !== infiniteScroll) {
      // New element will auto-initialize via constructor
    }
  }
};
