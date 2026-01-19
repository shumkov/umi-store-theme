/**
 * Infinite Scroll Custom Element
 *
 * Uses IntersectionObserver + Section Rendering API for efficient infinite scroll.
 * - SEO-friendly: Real pagination links in DOM, no URL changes during scroll
 * - No-JS friendly: Falls back to standard pagination
 * - Browser history: Saves state to sessionStorage, restores on back navigation
 *
 * Usage:
 * <infinite-scroll data-section-id="main-collection" data-container="#product-grid">
 *   <a href="/collections/all?page=2">Load more</a>
 *   <div class="infinite-scroll__spinner">...</div>
 * </infinite-scroll>
 */

class InfiniteScroll extends HTMLElement {
  constructor() {
    super();
    this.observer = null;
    this.loading = false;
    this.sectionId = this.dataset.sectionId;
    this.containerSelector = this.dataset.container || '#product-grid';
    this.paginationId = this.id || 'InfiniteScroll';
    this.currentPage = 1;
    this.loadedHtml = [];
  }

  connectedCallback() {
    this.storageKey = `infiniteScroll_${window.location.pathname}`;

    // Save scroll position on scroll for restoration after back navigation
    this.saveScrollPosition = this.saveScrollPosition.bind(this);
    window.addEventListener('scroll', this.saveScrollPosition, { passive: true });

    // Restore scroll position and loaded pages if coming back
    this.restoreState();
  }

  saveScrollPosition() {
    // Only save state if we have loaded additional pages
    if (!this.loadedHtml || this.loadedHtml.length === 0) return;

    // Debounce: only save every 100ms
    if (this.scrollSaveTimeout) return;
    this.scrollSaveTimeout = setTimeout(() => {
      const state = {
        scrollY: window.scrollY,
        currentPage: this.currentPage,
        loadedHtml: this.loadedHtml,
        paginationHtml: this.innerHTML,
      };
      sessionStorage.setItem(this.storageKey, JSON.stringify(state));
      this.scrollSaveTimeout = null;
    }, 100);
  }

  /**
   * Restore scroll position and loaded pages from sessionStorage
   * This handles back button navigation from product pages
   */
  restoreState() {
    // Check if this is a back/forward navigation
    const navType = performance.getEntriesByType('navigation')[0]?.type;
    const isBackNavigation = navType === 'back_forward';

    const savedState = sessionStorage.getItem(this.storageKey);

    if (savedState && isBackNavigation) {
      try {
        const state = JSON.parse(savedState);

        // Only restore if we have loaded additional pages
        if (state.loadedHtml && state.loadedHtml.length > 0 && state.paginationHtml) {
          const container = document.querySelector(this.containerSelector);
          if (container) {
            // Append previously loaded pages
            container.insertAdjacentHTML('beforeend', state.loadedHtml.join(''));

            // Cancel scroll animations
            container.querySelectorAll('.scroll-trigger').forEach((el) => {
              el.classList.add('scroll-trigger--cancel');
            });

            // Restore pagination state (so it points to correct next page)
            this.innerHTML = state.paginationHtml;

            this.currentPage = state.currentPage;
            this.loadedHtml = state.loadedHtml;

            // Restore scroll position after DOM update
            requestAnimationFrame(() => {
              window.scrollTo(0, state.scrollY);
            });
          }
        }
      } catch (e) {
        console.error('Failed to restore infinite scroll state:', e);
      }
    } else {
      // Fresh page load - clear any old state
      sessionStorage.removeItem(this.storageKey);
    }

    this.initialize();
  }

  disconnectedCallback() {
    this.destroy();
  }

  initialize() {
    // Clean up any existing observer
    this.destroy();

    const nextLink = this.querySelector('a');
    if (!nextLink) return; // No more pages

    // Set up IntersectionObserver with 300px offset
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.loading) {
            this.loadMore();
          }
        });
      },
      {
        rootMargin: '0px 0px 300px 0px', // Trigger 300px before element is visible
      }
    );

    this.observer.observe(this);
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  async loadMore() {
    const nextLink = this.querySelector('a');
    if (!nextLink || this.loading) return;

    this.loading = true;
    this.classList.add('loading');

    try {
      const nextUrl = new URL(nextLink.href);

      // Add section_id for Section Rendering API (fetches only section, not full page)
      nextUrl.searchParams.set('section_id', this.sectionId);

      const response = await fetch(nextUrl.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract new products from fetched section
      const newContainer = doc.querySelector(this.containerSelector);
      const currentContainer = document.querySelector(this.containerSelector);

      if (newContainer && currentContainer) {
        // Append new product items
        const newItems = newContainer.innerHTML;
        currentContainer.insertAdjacentHTML('beforeend', newItems);

        // Save loaded HTML for session restoration
        if (!this.loadedHtml) this.loadedHtml = [];
        this.loadedHtml.push(newItems);

        // Cancel scroll animations for newly added items
        currentContainer.querySelectorAll('.scroll-trigger').forEach((el) => {
          el.classList.add('scroll-trigger--cancel');
        });
      }

      // Update pagination element with new content
      const newPagination = doc.getElementById(this.paginationId);
      if (newPagination) {
        this.innerHTML = newPagination.innerHTML;
      }

      // Update current page (no URL change for SEO)
      this.currentPage++;

      // Re-initialize observer for next page (if there is one)
      this.loading = false;
      this.classList.remove('loading');
      this.initialize();

      // Trigger callback for any listeners (e.g., scroll animations)
      if (typeof initializeScrollAnimationTrigger === 'function') {
        initializeScrollAnimationTrigger();
      }
    } catch (error) {
      console.error('Infinite scroll error:', error);
      this.loading = false;
      this.classList.remove('loading');
      // On error, the link remains clickable as fallback
    }
  }

  /**
   * Reinitialize after filter/sort changes
   * Called by facets.js after updating the product grid
   */
  reinitialize() {
    this.currentPage = 1;
    this.loadedHtml = [];
    this.loading = false;
    this.classList.remove('loading');
    // Clear saved state when filters change
    sessionStorage.removeItem(this.storageKey);
    this.initialize();
  }
}

customElements.define('infinite-scroll', InfiniteScroll);
