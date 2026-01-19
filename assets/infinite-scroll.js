/**
 * Infinite Scroll Custom Element
 * Uses IntersectionObserver + Shopify Section Rendering API
 * Re-initializes automatically when filters/sorting update the grid
 * Preserves scroll position on back/forward navigation
 */

class InfiniteScroll extends HTMLElement {
  constructor() {
    super();
    this.observer = null;
    this.loading = false;
    this.storageKey = `infinite-scroll:${window.location.pathname}`;
  }

  connectedCallback() {
    this.container = document.getElementById(this.dataset.container);
    this.nextLink = this.querySelector('a');
    this.spinner = this.querySelector('.infinite-scroll__spinner');
    this.completeMessage = this.querySelector('.infinite-scroll__complete');
    this.sectionId = this.dataset.sectionId;

    // Disable browser's automatic scroll restoration - we handle it manually
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // Check if returning via back/forward navigation
    this.restoreState();

    if (!this.container) {
      return;
    }

    // Save scroll position before leaving the page
    window.addEventListener('beforeunload', this.saveState.bind(this));
    window.addEventListener('pagehide', this.saveState.bind(this));

    if (!this.nextLink) {
      return;
    }

    this.initObserver();
  }

  disconnectedCallback() {
    this.destroyObserver();
    window.removeEventListener('beforeunload', this.saveState.bind(this));
    window.removeEventListener('pagehide', this.saveState.bind(this));
  }

  saveState() {
    // Only save if we've loaded additional pages
    if (!this.container) return;

    const state = {
      scrollY: window.scrollY,
      html: this.container.innerHTML,
      nextUrl: this.nextLink?.href || null,
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      // Storage full or unavailable - silently fail
    }
  }

  restoreState() {
    // Restore on back/forward navigation OR page reload
    const navEntry = performance.getEntriesByType('navigation')[0];
    const navType = navEntry?.type;
    const isBackForward = navType === 'back_forward';
    const isReload = navType === 'reload';

    if (!isBackForward && !isReload) {
      // Fresh navigation - clear old state
      sessionStorage.removeItem(this.storageKey);
      return;
    }

    try {
      const saved = sessionStorage.getItem(this.storageKey);
      if (!saved) return;

      const state = JSON.parse(saved);

      // Don't restore if state is older than 30 minutes
      if (Date.now() - state.timestamp > 30 * 60 * 1000) {
        sessionStorage.removeItem(this.storageKey);
        return;
      }

      // Restore the grid content
      if (this.container && state.html) {
        this.container.innerHTML = state.html;
      }

      // Restore the next link
      if (state.nextUrl && this.nextLink) {
        this.nextLink.href = state.nextUrl;
      } else if (!state.nextUrl) {
        // No more pages - show complete message
        this.showComplete();
      }

      // Restore scroll position - wait for images to load for accurate positioning
      this.restoreScrollPosition(state.scrollY);

      // Keep state for potential refresh, but clear on next fresh navigation
    } catch (e) {
      // Parse error or other issue - silently fail
    }
  }

  restoreScrollPosition(targetY) {
    // Try to scroll immediately
    window.scrollTo(0, targetY);

    // Wait for images to load and try again
    const images = this.container?.querySelectorAll('img') || [];
    let loadedCount = 0;
    const totalImages = images.length;

    if (totalImages === 0) {
      // No images, just do a delayed scroll to be safe
      setTimeout(() => window.scrollTo(0, targetY), 100);
      return;
    }

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        // All images loaded, scroll to position
        window.scrollTo(0, targetY);
      }
    };

    images.forEach((img) => {
      if (img.complete) {
        checkAllLoaded();
      } else {
        img.addEventListener('load', checkAllLoaded, { once: true });
        img.addEventListener('error', checkAllLoaded, { once: true });
      }
    });

    // Fallback: scroll after timeout even if images haven't loaded
    setTimeout(() => window.scrollTo(0, targetY), 500);
  }

  initObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.loading) {
            this.loadNextPage();
          }
        });
      },
      {
        rootMargin: '300px',
        threshold: 0,
      }
    );

    this.observer.observe(this);
  }

  destroyObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  async loadNextPage() {
    if (this.loading || !this.nextLink) return;

    this.loading = true;
    this.showSpinner();

    try {
      const nextUrl = new URL(this.nextLink.href);
      // Use Section Rendering API - fetch only the section, not the full page
      nextUrl.searchParams.set('section_id', this.sectionId);

      const response = await fetch(nextUrl.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Extract new products from the response
      const newContainer = doc.getElementById(this.dataset.container);
      if (newContainer) {
        // Append new products to existing grid
        const newItems = newContainer.querySelectorAll(':scope > *');
        newItems.forEach((item) => {
          // Clone to avoid moving the node
          this.container.appendChild(item.cloneNode(true));
        });

        // Trigger scroll animations if available
        if (typeof initializeScrollAnimationTrigger === 'function') {
          initializeScrollAnimationTrigger();
        }
      }

      // Check for next pagination link in the response
      const newPagination = doc.querySelector('infinite-scroll');
      const newNextLink = newPagination?.querySelector('a');

      if (newNextLink) {
        // Update the next link for subsequent loads
        this.nextLink.href = newNextLink.href;
        this.loading = false;
      } else {
        // No more pages
        this.showComplete();
        this.destroyObserver();
      }
    } catch (error) {
      console.error('Infinite scroll error:', error);
      this.loading = false;
      // On error, show the link so users can click manually
      this.nextLink.classList.remove('visually-hidden');
      this.hideSpinner();
    }
  }

  showSpinner() {
    if (this.spinner) this.spinner.style.display = 'flex';
    if (this.completeMessage) this.completeMessage.style.display = 'none';
  }

  hideSpinner() {
    if (this.spinner) this.spinner.style.display = 'none';
  }

  showComplete() {
    this.hideSpinner();
    if (this.nextLink) this.nextLink.style.display = 'none';
    if (this.completeMessage) {
      this.completeMessage.style.display = 'block';
    } else {
      // Create complete message if not present
      const message = document.createElement('p');
      message.className = 'infinite-scroll__complete';
      message.textContent = this.dataset.completeText || 'No more products';
      this.appendChild(message);
    }
  }
}

customElements.define('infinite-scroll', InfiniteScroll);
