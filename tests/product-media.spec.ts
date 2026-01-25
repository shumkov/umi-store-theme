import { test, expect } from '@playwright/test';

test.describe('Product Media on Desktop', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a product page - adjust the path as needed for your store
    // You can set PRODUCT_PATH env var to test a specific product
    const productPath = process.env.PRODUCT_PATH || '/products/test-product';
    await page.goto(productPath);
    // Wait for media items to load
    await page.waitForSelector('.product__media-item', { timeout: 10000 });
  });

  test('media items should not exceed viewport height', async ({ page }) => {
    const viewportHeight = page.viewportSize()?.height ?? 800;

    const mediaItems = page.locator('.product__media-item');
    const count = await mediaItems.count();

    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const item = mediaItems.nth(i);
      const box = await item.boundingBox();

      if (box) {
        expect(
          box.height,
          `Media item ${i + 1} height (${box.height}px) should not exceed viewport height (${viewportHeight}px)`
        ).toBeLessThanOrEqual(viewportHeight);
      }
    }
  });

  test('gap between media items should be preserved', async ({ page }) => {
    const mediaItems = page.locator('.product__media-item:visible');
    const count = await mediaItems.count();

    if (count < 2) {
      test.skip(true, 'Need at least 2 media items to test gap');
      return;
    }

    // Get the expected gap from CSS variable
    const expectedGap = await page.evaluate(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      return parseFloat(rootStyles.getPropertyValue('--grid-desktop-vertical-spacing')) || 0;
    });

    // Get margin-bottom from the first media item
    const marginBottom = await mediaItems.first().evaluate((el) => {
      return parseFloat(getComputedStyle(el).marginBottom) || 0;
    });

    // The actual gap should be at least the grid spacing
    // (could be more due to grid row-gap + margin-bottom)
    expect(
      marginBottom,
      `Media item margin-bottom (${marginBottom}px) should equal grid spacing (${expectedGap}px)`
    ).toBeCloseTo(expectedGap, 0);

    // Verify visual gap between consecutive visible items
    const firstItem = mediaItems.first();
    const secondItem = mediaItems.nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();

    if (firstBox && secondBox) {
      // Calculate visual gap (top of second item - bottom of first item)
      const visualGap = secondBox.y - (firstBox.y + firstBox.height);

      expect(
        visualGap,
        `Visual gap between media items (${visualGap}px) should be at least ${expectedGap}px`
      ).toBeGreaterThanOrEqual(expectedGap - 1); // Allow 1px tolerance for rounding
    }
  });
});
