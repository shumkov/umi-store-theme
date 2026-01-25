// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests for product image zoom functionality in the lightbox modal.
 *
 * These tests verify that:
 * 1. On mobile: clicking an image opens the lightbox scrolled to the click position
 * 2. On mobile: closing and reopening the lightbox doesn't show "jumping" (old position briefly visible)
 * 3. On desktop: clicking an image centers the view on the click position
 *
 * Prerequisites:
 * - SHOPIFY_PREVIEW_URL must be set to the Shopify preview URL
 * - The store must have a product with images
 */

test.describe('Product Image Zoom', () => {
  // Navigate to a product page before each test
  test.beforeEach(async ({ page }) => {
    // Try multiple paths to find a product page
    const collectionUrls = ['/collections/all', '/collections', '/'];
    let foundProduct = false;

    for (const url of collectionUrls) {
      if (foundProduct) break;

      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');

      // Try multiple selectors for product links
      const productSelectors = [
        '.card__heading a',
        '.full-unstyled-link[href*="/products/"]',
        'a[href*="/products/"]',
        '.product-card a',
      ];

      for (const selector of productSelectors) {
        const productLink = page.locator(selector).first();
        if (await productLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await productLink.click();
          await page.waitForLoadState('domcontentloaded');
          foundProduct = true;
          break;
        }
      }
    }

    // If still no product found, try direct products page
    if (!foundProduct) {
      await page.goto('/products');
      await page.waitForLoadState('domcontentloaded');
    }
  });

  test.describe('Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should open lightbox centered on click position', async ({ page }) => {
      // Find product image opener
      const imageOpener = page.locator('modal-opener button, .product__media-item img').first();
      await expect(imageOpener).toBeVisible({ timeout: 10000 });

      // Get the image element's bounding box
      const box = await imageOpener.boundingBox();
      if (!box) {
        test.skip(true, 'No product image found');
        return;
      }

      // Click at 75% from left and 75% from top (bottom-right area)
      const clickX = box.x + box.width * 0.75;
      const clickY = box.y + box.height * 0.75;

      await page.mouse.click(clickX, clickY);

      // Wait for modal to open
      const modal = page.locator('product-modal');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Wait for scroll position to be applied
      await page.waitForTimeout(200);

      // Get the scroll container
      const scrollContainer = page.locator('.product-media-modal__content');
      await expect(scrollContainer).toBeVisible();

      // Verify scroll position is not at top-left corner (0, 0)
      // This confirms the click position centering is working
      const scrollLeft = await scrollContainer.evaluate(el => el.scrollLeft);
      const scrollTop = await scrollContainer.evaluate(el => el.scrollTop);

      // On mobile with 300vw image, clicking at 75% should result in significant scroll
      // The exact values depend on image dimensions, but they shouldn't be zero
      expect(scrollLeft > 0 || scrollTop > 0).toBeTruthy();
    });

    test('should not show jumping when closing and reopening lightbox', async ({ page }) => {
      const imageOpener = page.locator('modal-opener button, .product__media-item img').first();
      await expect(imageOpener).toBeVisible({ timeout: 10000 });

      const box = await imageOpener.boundingBox();
      if (!box) {
        test.skip(true, 'No product image found');
        return;
      }

      // First click: open at bottom-right (75%, 75%)
      await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.75);

      const modal = page.locator('product-modal');
      await expect(modal).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(200);

      // Record first scroll position
      const scrollContainer = page.locator('.product-media-modal__content');
      const firstScrollLeft = await scrollContainer.evaluate(el => el.scrollLeft);
      const firstScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

      // Close the modal
      const closeButton = page.locator('.product-media-modal__toggle, [aria-label*="Close"]').first();
      await closeButton.click();
      await expect(modal).not.toBeVisible({ timeout: 5000 });

      // Wait a moment for DOM to settle
      await page.waitForTimeout(100);

      // Second click: open at top-left (25%, 25%)
      const newBox = await imageOpener.boundingBox();
      if (!newBox) return;

      // Set up observer to detect "jumping" - watch scroll position immediately after modal opens
      const scrollPositions = [];
      await page.evaluate(() => {
        window.__scrollObserver = new MutationObserver(() => {
          const container = document.querySelector('.product-media-modal__content');
          if (container) {
            // @ts-ignore
            window.__scrollPositions = window.__scrollPositions || [];
            // @ts-ignore
            window.__scrollPositions.push({
              left: container.scrollLeft,
              top: container.scrollTop,
              time: Date.now()
            });
          }
        });
        const modal = document.querySelector('product-modal');
        if (modal) {
          window.__scrollObserver.observe(modal, { attributes: true, childList: true, subtree: true });
        }
      });

      await page.mouse.click(newBox.x + newBox.width * 0.25, newBox.y + newBox.height * 0.25);
      await expect(modal).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(200);

      // Get second scroll position
      const secondScrollLeft = await scrollContainer.evaluate(el => el.scrollLeft);
      const secondScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

      // The scroll positions should be different since we clicked different positions
      // Importantly, it should NOT briefly show the first position then jump to second
      // We can verify this by checking the scroll is at the expected new position
      // (different from first click's position)
      const positionsAreDifferent =
        Math.abs(secondScrollLeft - firstScrollLeft) > 50 ||
        Math.abs(secondScrollTop - firstScrollTop) > 50;

      expect(positionsAreDifferent).toBeTruthy();

      // Check that scroll started at 0 (our fix) rather than at the old position
      // This is verified by the immediate reset we added
      const initialScrollPositions = await page.evaluate(() => {
        // @ts-ignore
        return window.__scrollPositions || [];
      });

      // If there are recorded positions, the first non-zero position should be close to final
      // (no intermediate "jumping" through old position)
      if (initialScrollPositions.length > 0) {
        const firstRecorded = initialScrollPositions[0];
        // First position should be either 0 (reset) or close to final position
        const isAtResetOrFinal =
          (firstRecorded.left === 0 && firstRecorded.top === 0) ||
          (Math.abs(firstRecorded.left - secondScrollLeft) < 100 &&
           Math.abs(firstRecorded.top - secondScrollTop) < 100);
        expect(isAtResetOrFinal).toBeTruthy();
      }
    });
  });

  test.describe('Desktop', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should open lightbox centered on click position', async ({ page }) => {
      // Find product image opener
      const imageOpener = page.locator('modal-opener button, .product__media-item img').first();
      await expect(imageOpener).toBeVisible({ timeout: 10000 });

      const box = await imageOpener.boundingBox();
      if (!box) {
        test.skip(true, 'No product image found');
        return;
      }

      // Click at 75% from left and 75% from top (bottom-right area)
      const clickX = box.x + box.width * 0.75;
      const clickY = box.y + box.height * 0.75;

      await page.mouse.click(clickX, clickY);

      // Wait for modal to open
      const modal = page.locator('product-modal');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Wait for scroll position to be applied
      await page.waitForTimeout(200);

      // Get the scroll container
      const scrollContainer = page.locator('.product-media-modal__content');
      await expect(scrollContainer).toBeVisible();

      // Verify scroll position reflects click position
      const scrollLeft = await scrollContainer.evaluate(el => el.scrollLeft);
      const scrollTop = await scrollContainer.evaluate(el => el.scrollTop);

      // On desktop, clicking at 75% should result in scroll that centers that point
      // The scroll should NOT be at the top (0) since we clicked in bottom-right area
      expect(scrollTop > 0 || scrollLeft > 0).toBeTruthy();
    });

    test('should center on different click positions', async ({ page }) => {
      const imageOpener = page.locator('modal-opener button, .product__media-item img').first();
      await expect(imageOpener).toBeVisible({ timeout: 10000 });

      const box = await imageOpener.boundingBox();
      if (!box) {
        test.skip(true, 'No product image found');
        return;
      }

      // First click: top-left (25%, 25%)
      await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);

      const modal = page.locator('product-modal');
      await expect(modal).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(200);

      const scrollContainer = page.locator('.product-media-modal__content');
      const topLeftScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

      // Close modal
      const closeButton = page.locator('.product-media-modal__toggle, [aria-label*="Close"]').first();
      await closeButton.click();
      await expect(modal).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(100);

      // Second click: bottom-right (75%, 75%)
      const newBox = await imageOpener.boundingBox();
      if (!newBox) return;

      await page.mouse.click(newBox.x + newBox.width * 0.75, newBox.y + newBox.height * 0.75);
      await expect(modal).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(200);

      const bottomRightScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

      // Bottom-right click should result in more scroll than top-left click
      expect(bottomRightScrollTop).toBeGreaterThan(topLeftScrollTop);
    });
  });

  test.describe('Pinch-to-zoom (Mobile)', () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

    test('should support pinch-to-zoom gesture', async ({ page }) => {
      const imageOpener = page.locator('modal-opener button, .product__media-item img').first();
      await expect(imageOpener).toBeVisible({ timeout: 10000 });

      const box = await imageOpener.boundingBox();
      if (!box) {
        test.skip(true, 'No product image found');
        return;
      }

      // Open lightbox
      await page.tap(imageOpener);

      const modal = page.locator('product-modal');
      await expect(modal).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(200);

      // Get the image in the modal
      const modalImage = page.locator('.product-media-modal__content img').first();
      await expect(modalImage).toBeVisible();

      // Get initial transform
      const initialTransform = await modalImage.evaluate(el => el.style.transform);

      // Simulate pinch-to-zoom using touch events
      const imageBox = await modalImage.boundingBox();
      if (!imageBox) return;

      const centerX = imageBox.x + imageBox.width / 2;
      const centerY = imageBox.y + imageBox.height / 2;

      // Simulate pinch-out gesture
      await page.evaluate(({ cx, cy }) => {
        const img = document.querySelector('.product-media-modal__content img');
        if (!img) return;

        // Create touch events for pinch gesture
        const createTouch = (x, y, id) => ({
          clientX: x,
          clientY: y,
          identifier: id,
          target: img,
          pageX: x,
          pageY: y,
          radiusX: 1,
          radiusY: 1,
          rotationAngle: 0,
          force: 1
        });

        // Pinch start - two fingers 50px apart
        const touchStart = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          // @ts-ignore
          touches: [
            createTouch(cx - 25, cy, 0),
            createTouch(cx + 25, cy, 1)
          ],
          // @ts-ignore
          targetTouches: [
            createTouch(cx - 25, cy, 0),
            createTouch(cx + 25, cy, 1)
          ],
          // @ts-ignore
          changedTouches: [
            createTouch(cx - 25, cy, 0),
            createTouch(cx + 25, cy, 1)
          ]
        });
        img.dispatchEvent(touchStart);

        // Pinch move - expand to 100px apart (2x zoom)
        const touchMove = new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          // @ts-ignore
          touches: [
            createTouch(cx - 50, cy, 0),
            createTouch(cx + 50, cy, 1)
          ],
          // @ts-ignore
          targetTouches: [
            createTouch(cx - 50, cy, 0),
            createTouch(cx + 50, cy, 1)
          ],
          // @ts-ignore
          changedTouches: [
            createTouch(cx - 50, cy, 0),
            createTouch(cx + 50, cy, 1)
          ]
        });
        img.dispatchEvent(touchMove);

        // Pinch end
        const touchEnd = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          // @ts-ignore
          targetTouches: [],
          // @ts-ignore
          changedTouches: [
            createTouch(cx - 50, cy, 0),
            createTouch(cx + 50, cy, 1)
          ]
        });
        img.dispatchEvent(touchEnd);
      }, { cx: centerX, cy: centerY });

      await page.waitForTimeout(100);

      // Check that transform was applied (zoom happened)
      const finalTransform = await modalImage.evaluate(el => el.style.transform);

      // After pinch-to-zoom, the image should have a scale transform
      expect(finalTransform).toContain('scale');
    });
  });

  test.describe('Mouse wheel zoom (Desktop)', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should support trackpad pinch-to-zoom via wheel event', async ({ page }) => {
      const imageOpener = page.locator('modal-opener button, .product__media-item img').first();
      await expect(imageOpener).toBeVisible({ timeout: 10000 });

      const box = await imageOpener.boundingBox();
      if (!box) {
        test.skip(true, 'No product image found');
        return;
      }

      // Open lightbox
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);

      const modal = page.locator('product-modal');
      await expect(modal).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(200);

      // Get the image in the modal
      const modalImage = page.locator('.product-media-modal__content img').first();
      await expect(modalImage).toBeVisible();

      const imageBox = await modalImage.boundingBox();
      if (!imageBox) return;

      const centerX = imageBox.x + imageBox.width / 2;
      const centerY = imageBox.y + imageBox.height / 2;

      // Simulate trackpad pinch-to-zoom (wheel event with ctrlKey)
      await page.evaluate(({ x, y }) => {
        const img = document.querySelector('.product-media-modal__content img');
        if (!img) return;

        // Trackpad pinch gestures send wheel events with ctrlKey: true
        const wheelEvent = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          deltaY: -100, // Negative = zoom in
          ctrlKey: true // This indicates trackpad pinch gesture
        });
        img.dispatchEvent(wheelEvent);
      }, { x: centerX, y: centerY });

      await page.waitForTimeout(100);

      // Check that transform was applied (zoom happened)
      const finalTransform = await modalImage.evaluate(el => el.style.transform);

      // After wheel zoom, the image should have a scale transform
      expect(finalTransform).toContain('scale');
    });
  });
});
