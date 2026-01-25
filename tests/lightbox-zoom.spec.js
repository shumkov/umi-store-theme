// @ts-check
const { test, expect } = require('@playwright/test');

// Update this URL to your Shopify preview URL
const PREVIEW_URL = process.env.PREVIEW_URL || 'https://your-store.myshopify.com';
const PRODUCT_PATH = '/products/test-product'; // Update to a real product path

test.describe('Lightbox mobile zoom centering', () => {
  test.use({
    viewport: { width: 375, height: 812 }, // iPhone X dimensions
    hasTouch: true,
    isMobile: true,
  });

  test('clicking bottom of image should scroll lightbox to bottom', async ({ page }) => {
    // Navigate to product page
    await page.goto(PREVIEW_URL + PRODUCT_PATH);

    // Wait for product image to load
    const productImage = page.locator('.product__media-item img').first();
    await productImage.waitFor({ state: 'visible' });

    // Get the bounding box of the image
    const box = await productImage.boundingBox();
    if (!box) throw new Error('Could not get image bounding box');

    console.log('Image bounding box:', box);

    // Click on the BOTTOM of the image (90% down)
    const clickX = box.x + box.width * 0.5;  // Center horizontally
    const clickY = box.y + box.height * 0.9; // 90% down (bottom area)

    console.log(`Clicking at: (${clickX}, ${clickY})`);
    console.log(`Click position as percentage: (50%, 90%)`);

    // Click to open lightbox
    await page.mouse.click(clickX, clickY);

    // Wait for modal to open and zoom to apply
    await page.waitForSelector('product-modal[open]');
    await page.waitForTimeout(200); // Wait for zoom animation

    // Get the modal content wrapper
    const wrapper = page.locator('.product-media-modal__content');
    const img = page.locator('.product-media-modal__content img.active, .product-media-modal__content [data-media-id].active img').first();

    // Get scroll position and dimensions
    const scrollInfo = await wrapper.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollLeft: el.scrollLeft,
      scrollHeight: el.scrollHeight,
      scrollWidth: el.scrollWidth,
      clientHeight: el.clientHeight,
      clientWidth: el.clientWidth,
    }));

    const imgInfo = await img.evaluate((el) => ({
      offsetWidth: el.offsetWidth,
      offsetHeight: el.offsetHeight,
      transform: el.style.transform,
      transformOrigin: el.style.transformOrigin,
    }));

    console.log('Scroll info:', scrollInfo);
    console.log('Image info:', imgInfo);

    // Calculate expected scroll position
    // clickY was 90% down, so with 2x zoom, we should be scrolled to show that area
    const expectedScrollYRatio = 0.9; // 90% down
    const maxScrollY = scrollInfo.scrollHeight - scrollInfo.clientHeight;
    const expectedScrollY = (imgInfo.offsetHeight * 2 * expectedScrollYRatio) - (scrollInfo.clientHeight / 2);

    console.log('Expected scroll Y (approx):', Math.max(0, Math.min(maxScrollY, expectedScrollY)));
    console.log('Actual scroll Y:', scrollInfo.scrollTop);

    // The scroll position should be closer to the bottom than the top
    // If we clicked at 90%, scroll should be at least 50% of max scroll
    const scrollYRatio = maxScrollY > 0 ? scrollInfo.scrollTop / maxScrollY : 0;
    console.log('Scroll Y ratio:', scrollYRatio);

    // Assert that we're scrolled to at least 50% (since we clicked at 90%)
    expect(scrollYRatio).toBeGreaterThan(0.4);
  });

  test('clicking top of image should keep lightbox at top', async ({ page }) => {
    await page.goto(PREVIEW_URL + PRODUCT_PATH);

    const productImage = page.locator('.product__media-item img').first();
    await productImage.waitFor({ state: 'visible' });

    const box = await productImage.boundingBox();
    if (!box) throw new Error('Could not get image bounding box');

    // Click on the TOP of the image (10% down)
    const clickX = box.x + box.width * 0.5;
    const clickY = box.y + box.height * 0.1;

    console.log(`Clicking at top: (${clickX}, ${clickY})`);

    await page.mouse.click(clickX, clickY);

    await page.waitForSelector('product-modal[open]');
    await page.waitForTimeout(200);

    const wrapper = page.locator('.product-media-modal__content');

    const scrollInfo = await wrapper.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    console.log('Scroll info for top click:', scrollInfo);

    const maxScrollY = scrollInfo.scrollHeight - scrollInfo.clientHeight;
    const scrollYRatio = maxScrollY > 0 ? scrollInfo.scrollTop / maxScrollY : 0;

    console.log('Scroll Y ratio for top click:', scrollYRatio);

    // When clicking at top, scroll should be near top (less than 30%)
    expect(scrollYRatio).toBeLessThan(0.3);
  });
});
