/**
 * Infinite Scroll for Collection Pages
 * Uses Intersection Observer to load more products as user scrolls
 * Supports scroll position restoration on back/forward navigation
 */
class InfiniteScroll extends HTMLElement {
  constructor() {
    super();
    this.productGrid = document.getElementById('product-grid');
    this.loading = false;
    this.observer = null;
    this.storageKey = `infinite-scroll-${window.location.pathname}`;
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

    // Mark as JS-enabled to hide pagination (SEO: pagination stays in DOM)
    this.classList.add('js-enabled');

    // Check if we need to restore state from back/forward navigation
    this.restoreStateIfNeeded();

    // Save state before user leaves the page
    this.setupBeforeUnload();

    this.setupObserver();
  }

  setupBeforeUnload() {
    // Save scroll position and page state when leaving
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });

    // Also save when clicking on links (for SPA-like navigation)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && !link.href.startsWith('javascript:')) {
        this.saveState();
      }
    });

    // Handle visibility change (mobile tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveState();
      }
    });
  }

  saveState() {
    const state = {
      page: this.currentPage,
      scrollY: window.scrollY,
      timestamp: Date.now(),
      search: window.location.search // Include filters/sorting
    };
    sessionStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  async restoreStateIfNeeded() {
    const savedState = sessionStorage.getItem(this.storageKey);
    if (!savedState) return;

    try {
      const state = JSON.parse(savedState);

      // Only restore if:
      // 1. State is less than 30 minutes old
      // 2. Filters/sorting match (same search params)
      // 3. We're navigating back (not a fresh page load)
      const isRecent = Date.now() - state.timestamp < 30 * 60 * 1000;
      const sameFilters = state.search === window.location.search;
      const isBackNavigation = this.isBackNavigation();

      if (isRecent && sameFilters && isBackNavigation && state.page > 1) {
        // Disable observer during restoration
        this.loading = true;
        this.showLoader();

        // Load all pages up to the saved page
        await this.loadPagesUpTo(state.page);

        // Restore scroll position after a brief delay to allow DOM to settle
        requestAnimationFrame(() => {
          window.scrollTo(0, state.scrollY);
          this.loading = false;
          this.hideLoader();
        });
      }
    } catch (e) {
      console.error('Failed to restore infinite scroll state:', e);
      sessionStorage.removeItem(this.storageKey);
    }
  }

  isBackNavigation() {
    // Check if this is a back/forward navigation using Performance API
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      return navEntries[0].type === 'back_forward';
    }

    // Fallback: check if page was loaded from bfcache
    if (window.performance && window.performance.navigation) {
      return window.performance.navigation.type === 2; // TYPE_BACK_FORWARD
    }

    return false;
  }

  async loadPagesUpTo(targetPage) {
    // Load pages sequentially from current to target
    for (let page = 2; page <= targetPage && page <= this.totalPages; page++) {
      await this.loadPage(page, false); // Don't update URL during restoration
    }
  }

  async loadPage(page, updateUrl = true) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('page', page);
      url.searchParams.set('section_id', this.sectionId);

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const newProducts = doc.querySelectorAll('#product-grid > li');

      if (newProducts.length > 0) {
        newProducts.forEach((product) => {
          product.querySelectorAll('.scroll-trigger').forEach((el) => {
            el.classList.add('scroll-trigger--cancel');
          });
          this.productGrid.appendChild(product);
        });

        this.currentPage = page;
        this.dataset.currentPage = page;

        if (updateUrl) {
          this.updateURL(page);
        }

        if (typeof initializeScrollAnimationTrigger === 'function') {
          initializeScrollAnimationTrigger();
        }
      }

      if (this.currentPage >= this.totalPages) {
        this.complete();
      }

      return true;
    } catch (error) {
      console.error('Infinite scroll error:', error);
      return false;
    }
  }

  setupObserver() {
    const options = {
      root: null,
      rootMargin: '200px',
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
    const success = await this.loadPage(nextPage, true);

    if (!success) {
      this.showError();
    }

    this.loading = false;
    this.hideLoader();
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
    history.replaceState({ page }, '', url.toString());
  }

  reset() {
    this.currentPage = 1;
    this.dataset.currentPage = 1;
    this.loading = false;
    this.classList.remove('complete');

    // Clear saved state when filters change
    sessionStorage.removeItem(this.storageKey);

    const completeEl = this.querySelector('.infinite-scroll__complete');
    if (completeEl) completeEl.classList.add('hidden');

    const errorEl = this.querySelector('.infinite-scroll__error');
    if (errorEl) errorEl.classList.add('hidden');

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

  const infiniteScroll = document.querySelector('infinite-scroll');
  if (infiniteScroll) {
    const newInfiniteScroll = document.querySelector('infinite-scroll');
    if (newInfiniteScroll && newInfiniteScroll !== infiniteScroll) {
      // New element will auto-initialize via constructor
    }
  }
};
