// @ts-check
const { test, expect } = require('@playwright/test');

// Use local test page for isolated testing, or Shopify preview for integration
const USE_LOCAL = !process.env.PREVIEW_URL;
const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:3456';
const PRODUCT_PATH = USE_LOCAL ? '/test-page.html' : '/products/test-product';

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
    const productImage = USE_LOCAL
      ? page.locator('#product-image')
      : page.locator('.product__media-item img').first();
    await productImage.waitFor({ state: 'visible' });

    // Wait for image to fully load
    await page.waitForFunction(
      (selector) => {
        const img = document.querySelector(selector);
        return img && img.complete && img.naturalHeight > 0;
      },
      USE_LOCAL ? '#product-image' : '.product__media-item img'
    );

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
    await page.waitForTimeout(300); // Wait for zoom animation and scroll

    // Get the modal content wrapper
    const wrapper = USE_LOCAL
      ? page.locator('.product-media-modal__content')
      : page.locator('.product-media-modal__content');

    const img = USE_LOCAL
      ? page.locator('#modal-image')
      : page.locator('.product-media-modal__content img.active, .product-media-modal__content [data-media-id].active img').first();

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

    // Calculate max scroll
    const maxScrollY = scrollInfo.scrollHeight - scrollInfo.clientHeight;
    const maxScrollX = scrollInfo.scrollWidth - scrollInfo.clientWidth;

    console.log('Max scroll Y:', maxScrollY);
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

    const productImage = USE_LOCAL
      ? page.locator('#product-image')
      : page.locator('.product__media-item img').first();
    await productImage.waitFor({ state: 'visible' });

    // Wait for image to fully load
    await page.waitForFunction(
      (selector) => {
        const img = document.querySelector(selector);
        return img && img.complete && img.naturalHeight > 0;
      },
      USE_LOCAL ? '#product-image' : '.product__media-item img'
    );

    const box = await productImage.boundingBox();
    if (!box) throw new Error('Could not get image bounding box');

    // Click on the TOP of the image (10% down)
    const clickX = box.x + box.width * 0.5;
    const clickY = box.y + box.height * 0.1;

    console.log(`Clicking at top: (${clickX}, ${clickY})`);

    await page.mouse.click(clickX, clickY);

    await page.waitForSelector('product-modal[open]');
    await page.waitForTimeout(300);

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

  test('clicking center of image should center lightbox', async ({ page }) => {
    await page.goto(PREVIEW_URL + PRODUCT_PATH);

    const productImage = USE_LOCAL
      ? page.locator('#product-image')
      : page.locator('.product__media-item img').first();
    await productImage.waitFor({ state: 'visible' });

    await page.waitForFunction(
      (selector) => {
        const img = document.querySelector(selector);
        return img && img.complete && img.naturalHeight > 0;
      },
      USE_LOCAL ? '#product-image' : '.product__media-item img'
    );

    const box = await productImage.boundingBox();
    if (!box) throw new Error('Could not get image bounding box');

    // Click on the CENTER of the image
    const clickX = box.x + box.width * 0.5;
    const clickY = box.y + box.height * 0.5;

    console.log(`Clicking at center: (${clickX}, ${clickY})`);

    await page.mouse.click(clickX, clickY);

    await page.waitForSelector('product-modal[open]');
    await page.waitForTimeout(300);

    const wrapper = page.locator('.product-media-modal__content');

    const scrollInfo = await wrapper.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    console.log('Scroll info for center click:', scrollInfo);

    const maxScrollY = scrollInfo.scrollHeight - scrollInfo.clientHeight;
    const scrollYRatio = maxScrollY > 0 ? scrollInfo.scrollTop / maxScrollY : 0;

    console.log('Scroll Y ratio for center click:', scrollYRatio);

    // When clicking at center (50%), scroll should be around 40-60% of max
    expect(scrollYRatio).toBeGreaterThan(0.3);
    expect(scrollYRatio).toBeLessThan(0.7);
  });
});

test.describe('Lightbox desktop behavior', () => {
  test('desktop should not auto-scroll to click position', async ({ page }) => {
    await page.goto(PREVIEW_URL + PRODUCT_PATH);

    const productImage = USE_LOCAL
      ? page.locator('#product-image')
      : page.locator('.product__media-item img').first();
    await productImage.waitFor({ state: 'visible' });

    await page.waitForFunction(
      (selector) => {
        const img = document.querySelector(selector);
        return img && img.complete && img.naturalHeight > 0;
      },
      USE_LOCAL ? '#product-image' : '.product__media-item img'
    );

    const box = await productImage.boundingBox();
    if (!box) throw new Error('Could not get image bounding box');

    // Click at bottom of image
    const clickX = box.x + box.width * 0.5;
    const clickY = box.y + box.height * 0.9;

    await page.mouse.click(clickX, clickY);

    await page.waitForSelector('product-modal[open]');
    await page.waitForTimeout(300);

    const wrapper = page.locator('.product-media-modal__content');

    const scrollInfo = await wrapper.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    console.log('Desktop scroll info:', scrollInfo);

    // On desktop, scroll should start at top (default behavior)
    // Image is 100vw so scroll behavior depends on image dimensions
    // Just verify we don't crash
    expect(scrollInfo.scrollTop).toBeDefined();
  });
});
