// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests for product page mobile slider dots functionality.
 *
 * These tests verify that:
 * 1. On mobile: dots indicator is visible at the bottom of the image
 * 2. On mobile: correct number of dots matches media count
 * 3. On mobile: active dot is highlighted correctly
 * 4. On mobile: clicking a dot navigates to that slide
 * 5. On mobile: dot state updates when swiping/scrolling
 * 6. On mobile: images are full-width (no peek effect)
 * 7. On desktop/tablet: dots are hidden
 * 8. Dots use mix-blend-mode: difference for color inversion
 *
 * Prerequisites:
 * - SHOPIFY_PREVIEW_URL must be set to the Shopify preview URL
 * - The store must have a product with multiple media items
 */

test.describe('Product Mobile Slider Dots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products/halter-top-with-open-back');
    await page.waitForLoadState('domcontentloaded');

    // Wait for product page to load
    await page.locator('media-gallery').waitFor({ state: 'visible', timeout: 10000 });
  });

  test.describe('Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display dots indicator on mobile', async ({ page }) => {
      const dots = page.locator('.product__media-dots');

      // Dots should be visible on mobile
      await expect(dots).toBeVisible();

      // Check display is not none
      const display = await dots.evaluate(el => window.getComputedStyle(el).display);
      expect(display).toBe('flex');
    });

    test('should have correct number of dots matching media count', async ({ page }) => {
      // Count media items
      const mediaItems = page.locator('.product__media-list > .product__media-item');
      const mediaCount = await mediaItems.count();

      // Count dots
      const dots = page.locator('.product__media-dot');
      const dotsCount = await dots.count();

      // Should match
      expect(dotsCount).toBe(mediaCount);
      expect(dotsCount).toBeGreaterThan(1);
    });

    test('should position dots at bottom center of slider', async ({ page }) => {
      const dotsContainer = page.locator('.product__media-dots');
      const sliderComponent = page.locator('media-gallery slider-component').first();

      await expect(dotsContainer).toBeVisible();

      const dotsBox = await dotsContainer.boundingBox();
      const sliderBox = await sliderComponent.boundingBox();

      expect(dotsBox).not.toBeNull();
      expect(sliderBox).not.toBeNull();

      if (dotsBox && sliderBox) {
        // Dots should be positioned near the bottom of the slider
        const dotsBottom = dotsBox.y + dotsBox.height;
        const sliderBottom = sliderBox.y + sliderBox.height;
        expect(dotsBottom).toBeLessThanOrEqual(sliderBottom + 10);

        // Dots should be horizontally centered (within tolerance)
        const dotsCenterX = dotsBox.x + dotsBox.width / 2;
        const sliderCenterX = sliderBox.x + sliderBox.width / 2;
        expect(Math.abs(dotsCenterX - sliderCenterX)).toBeLessThan(50);
      }
    });

    test('should have first dot active by default', async ({ page }) => {
      const firstDot = page.locator('.product__media-dot').first();
      const hasActiveClass = await firstDot.evaluate(el => el.classList.contains('is-active'));

      expect(hasActiveClass).toBe(true);
    });

    test('should style active dot differently from inactive dots', async ({ page }) => {
      const activeDot = page.locator('.product__media-dot.is-active .product__media-dot-inner').first();
      const inactiveDot = page.locator('.product__media-dot:not(.is-active) .product__media-dot-inner').first();

      // Ensure both exist
      await expect(activeDot).toBeVisible();
      const hasInactiveDot = await inactiveDot.count() > 0;

      if (hasInactiveDot) {
        // Active dot should have higher opacity/brighter than inactive
        // Both use white-based colors, active is solid white, inactive is semi-transparent
        const activeBackground = await activeDot.evaluate(el => window.getComputedStyle(el).backgroundColor);
        const inactiveBackground = await inactiveDot.evaluate(el => window.getComputedStyle(el).backgroundColor);

        // Both should have background colors (not transparent)
        expect(activeBackground).not.toBe('rgba(0, 0, 0, 0)');
        expect(inactiveBackground).not.toBe('rgba(0, 0, 0, 0)');

        // Active should be more opaque (solid white vs semi-transparent)
        // Parse rgba values to compare alpha
        const activeMatch = activeBackground.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        const inactiveMatch = inactiveBackground.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);

        if (activeMatch && inactiveMatch) {
          const activeAlpha = activeMatch[4] ? parseFloat(activeMatch[4]) : 1;
          const inactiveAlpha = inactiveMatch[4] ? parseFloat(inactiveMatch[4]) : 1;
          expect(activeAlpha).toBeGreaterThan(inactiveAlpha);
        }
      }
    });

    test('should apply mix-blend-mode: difference for color inversion', async ({ page }) => {
      // Horizon theme approach: mix-blend-mode is on the container, not individual dots
      const dotsContainer = page.locator('.product__media-dots');
      await expect(dotsContainer).toBeVisible();

      const blendMode = await dotsContainer.evaluate(el => window.getComputedStyle(el).mixBlendMode);
      expect(blendMode).toBe('difference');
    });

    test('should navigate to slide when clicking a dot', async ({ page }) => {
      const slider = page.locator('.product__media-list');
      const dots = page.locator('.product__media-dot');
      const dotsCount = await dots.count();

      if (dotsCount < 2) {
        test.skip(true, 'Need at least 2 media items to test dot navigation');
        return;
      }

      // Get initial scroll position
      const initialScrollLeft = await slider.evaluate(el => el.scrollLeft);

      // Click on the second dot
      const secondDot = dots.nth(1);
      await secondDot.click();

      // Wait for scroll animation
      await page.waitForTimeout(400);

      // Scroll position should have changed
      const newScrollLeft = await slider.evaluate(el => el.scrollLeft);
      expect(newScrollLeft).toBeGreaterThan(initialScrollLeft);

      // Second dot should now be active
      const isSecondDotActive = await secondDot.evaluate(el => el.classList.contains('is-active'));
      expect(isSecondDotActive).toBe(true);

      // First dot should no longer be active
      const firstDot = dots.first();
      const isFirstDotActive = await firstDot.evaluate(el => el.classList.contains('is-active'));
      expect(isFirstDotActive).toBe(false);
    });

    test('should update active dot when scrolling/swiping', async ({ page }) => {
      const slider = page.locator('.product__media-list');
      const dots = page.locator('.product__media-dot');
      const dotsCount = await dots.count();

      if (dotsCount < 2) {
        test.skip(true, 'Need at least 2 media items to test scroll behavior');
        return;
      }

      // Get the second slide to calculate scroll position
      const slides = page.locator('.product__media-list > .slider__slide');
      const secondSlide = slides.nth(1);
      const secondSlideOffset = await secondSlide.evaluate(el => el.offsetLeft);

      // Scroll to the second slide
      await slider.evaluate((el, offset) => {
        el.scrollTo({ left: offset, behavior: 'instant' });
      }, secondSlideOffset);

      // Wait for slideChanged event to fire
      await page.waitForTimeout(300);

      // Second dot should now be active
      const secondDot = dots.nth(1);
      const isSecondDotActive = await secondDot.evaluate(el => el.classList.contains('is-active'));
      expect(isSecondDotActive).toBe(true);
    });

    test('should display images at full width (no peek effect)', async ({ page }) => {
      const viewport = page.viewportSize();
      if (!viewport) return;

      const firstSlide = page.locator('.product__media-list > .slider__slide').first();
      await expect(firstSlide).toBeVisible();

      const slideBox = await firstSlide.boundingBox();
      expect(slideBox).not.toBeNull();

      if (slideBox) {
        // Slide width should be close to viewport width (accounting for small margins)
        // The slide should be at least 90% of viewport width
        const widthRatio = slideBox.width / viewport.width;
        expect(widthRatio).toBeGreaterThan(0.9);
      }
    });

    test('should have dots accessible via keyboard', async ({ page }) => {
      const dots = page.locator('.product__media-dot');
      const dotsCount = await dots.count();

      if (dotsCount < 2) {
        test.skip(true, 'Need at least 2 media items');
        return;
      }

      // Dots should be buttons (focusable and clickable)
      const firstDot = dots.first();
      const tagName = await firstDot.evaluate(el => el.tagName.toLowerCase());
      expect(tagName).toBe('button');

      // Should have aria-label
      const ariaLabel = await firstDot.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });
  });

  test.describe('Desktop', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should hide dots indicator on desktop', async ({ page }) => {
      const dots = page.locator('.product__media-dots');

      // Dots should have display: none on desktop
      const display = await dots.evaluate(el => window.getComputedStyle(el).display);
      expect(display).toBe('none');
    });
  });

  test.describe('Tablet', () => {
    test.use({ viewport: { width: 800, height: 600 } });

    test('should hide dots indicator on tablet (750px+)', async ({ page }) => {
      const dots = page.locator('.product__media-dots');

      // Dots should have display: none on tablet
      const display = await dots.evaluate(el => window.getComputedStyle(el).display);
      expect(display).toBe('none');
    });
  });

  test.describe('Touch Interaction', () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

    test('should update dots when programmatically scrolling (simulating swipe)', async ({ page }) => {
      const slider = page.locator('.product__media-list');
      const dots = page.locator('.product__media-dot');
      const dotsCount = await dots.count();

      if (dotsCount < 2) {
        test.skip(true, 'Need at least 2 media items');
        return;
      }

      // Get the second slide offset
      const secondSlideOffset = await page.evaluate(() => {
        const slides = document.querySelectorAll('.product__media-list > .slider__slide');
        return slides[1] ? slides[1].offsetLeft : 0;
      });

      // Simulate a swipe by programmatically scrolling (this is what touch events ultimately do)
      await slider.evaluate((el, offset) => {
        el.scrollTo({ left: offset, behavior: 'smooth' });
      }, secondSlideOffset);

      // Wait for scroll animation and slideChanged event
      await page.waitForTimeout(600);

      // Check if active dot changed (second dot should be active)
      const secondDot = dots.nth(1);
      const isSecondDotActive = await secondDot.evaluate(el => el.classList.contains('is-active'));

      expect(isSecondDotActive).toBe(true);
    });
  });

  test.describe('Slider Component Integration', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should respond to slideChanged events from slider-component', async ({ page }) => {
      // Trigger slideChanged event programmatically
      const result = await page.evaluate(() => {
        const viewer = document.querySelector('slider-component[id^="GalleryViewer"]');
        const dots = document.querySelectorAll('.product__media-dot');

        if (!viewer || dots.length < 2) {
          return { error: 'Missing viewer or not enough dots' };
        }

        // Get initial active index
        const getActiveIndex = () => {
          for (let i = 0; i < dots.length; i++) {
            if (dots[i].classList.contains('is-active')) return i;
          }
          return -1;
        };

        const initialActive = getActiveIndex();

        // Dispatch slideChanged event
        viewer.dispatchEvent(new CustomEvent('slideChanged', {
          detail: {
            currentPage: 2,
            currentElement: document.querySelectorAll('.slider__slide')[1]
          }
        }));

        const newActive = getActiveIndex();

        return {
          initialActive,
          newActive,
          expectedActive: 1 // 0-indexed, so page 2 = index 1
        };
      });

      if (result.error) {
        test.skip(true, result.error);
        return;
      }

      expect(result.newActive).toBe(result.expectedActive);
    });

    test('should have scrollToSlideByIndex method on media-gallery', async ({ page }) => {
      const hasMethod = await page.evaluate(() => {
        const gallery = document.querySelector('media-gallery');
        return gallery && typeof gallery.scrollToSlideByIndex === 'function';
      });

      expect(hasMethod).toBe(true);
    });

    test('should scroll correctly when scrollToSlideByIndex is called', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gallery = document.querySelector('media-gallery');
        const slider = document.querySelector('.product__media-list');
        const slides = document.querySelectorAll('.product__media-list > .slider__slide');

        if (!gallery || !slider || slides.length < 2) {
          return { error: 'Missing elements' };
        }

        const initialScrollLeft = slider.scrollLeft;

        // Call the method directly
        if (gallery.scrollToSlideByIndex) {
          gallery.scrollToSlideByIndex(1);
        }

        // Can't check immediately due to smooth scroll, return initial state
        return {
          initialScrollLeft,
          slideCount: slides.length,
          hasMethod: typeof gallery.scrollToSlideByIndex === 'function'
        };
      });

      if (result.error) {
        test.skip(true, result.error);
        return;
      }

      expect(result.hasMethod).toBe(true);

      // Wait for scroll
      await page.waitForTimeout(400);

      // Verify scroll happened
      const newScrollLeft = await page.evaluate(() => {
        const slider = document.querySelector('.product__media-list');
        return slider ? slider.scrollLeft : 0;
      });

      expect(newScrollLeft).toBeGreaterThan(result.initialScrollLeft);
    });
  });

  test.describe('CSS Styling', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should have absolute positioning for dots overlay', async ({ page }) => {
      const dots = page.locator('.product__media-dots');
      const position = await dots.evaluate(el => window.getComputedStyle(el).position);

      expect(position).toBe('absolute');
    });

    test('should have slider-component as relative positioned parent', async ({ page }) => {
      const sliderComponent = page.locator('.product__media-wrapper slider-component').first();
      const position = await sliderComponent.evaluate(el => window.getComputedStyle(el).position);

      expect(position).toBe('relative');
    });

    test('should have smooth transition on dot state change', async ({ page }) => {
      const dotInner = page.locator('.product__media-dot-inner').first();
      const transition = await dotInner.evaluate(el => window.getComputedStyle(el).transition);

      // Should have transition for background-color (fill state change)
      expect(transition).toContain('background-color');
    });

    test('should have proper z-index to appear above images', async ({ page }) => {
      const dots = page.locator('.product__media-dots');
      const zIndex = await dots.evaluate(el => window.getComputedStyle(el).zIndex);

      // Should have z-index greater than default
      expect(parseInt(zIndex)).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Edge Cases', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should handle rapid dot clicks', async ({ page }) => {
      const dots = page.locator('.product__media-dot');
      const dotsCount = await dots.count();

      if (dotsCount < 3) {
        test.skip(true, 'Need at least 3 media items');
        return;
      }

      // Click dots rapidly
      await dots.nth(1).click();
      await dots.nth(2).click();
      await dots.nth(0).click();

      // Wait for scrolls to settle
      await page.waitForTimeout(500);

      // First dot should be active (last click)
      const firstDot = dots.first();
      const isFirstActive = await firstDot.evaluate(el => el.classList.contains('is-active'));
      expect(isFirstActive).toBe(true);
    });

    test('should handle clicking already active dot', async ({ page }) => {
      const slider = page.locator('.product__media-list');
      const firstDot = page.locator('.product__media-dot').first();

      // Get initial state
      const initialScrollLeft = await slider.evaluate(el => el.scrollLeft);

      // Click already active dot
      await firstDot.click();
      await page.waitForTimeout(200);

      // Scroll should stay at the same position
      const newScrollLeft = await slider.evaluate(el => el.scrollLeft);
      expect(newScrollLeft).toBe(initialScrollLeft);

      // Dot should still be active
      const isStillActive = await firstDot.evaluate(el => el.classList.contains('is-active'));
      expect(isStillActive).toBe(true);
    });
  });
});
