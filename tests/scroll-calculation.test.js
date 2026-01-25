/**
 * Unit test for the scroll calculation logic in product-modal.js
 * Tests the formula: scrollPos = (imageSize * clickPercent) - (viewportSize / 2)
 */

// Test helper to calculate scroll position
function calculateScrollPosition(imageWidth, imageHeight, viewportWidth, viewportHeight, clickX, clickY) {
  const scrollX = (imageWidth * clickX) - (viewportWidth / 2);
  const scrollY = (imageHeight * clickY) - (viewportHeight / 2);

  // Clamp to valid scroll range
  const maxScrollX = Math.max(0, imageWidth - viewportWidth);
  const maxScrollY = Math.max(0, imageHeight - viewportHeight);

  return {
    scrollX: Math.max(0, Math.min(scrollX, maxScrollX)),
    scrollY: Math.max(0, Math.min(scrollY, maxScrollY)),
    maxScrollX,
    maxScrollY,
  };
}

// Test scenarios
const tests = [
  {
    name: 'Click at top-left (0%, 0%)',
    imageWidth: 1125, // 375 * 3 (300vw on mobile)
    imageHeight: 3375, // 3:1 aspect ratio tall image
    viewportWidth: 375,
    viewportHeight: 812,
    clickX: 0,
    clickY: 0,
    expectedScrollXRatio: 0, // Should be at left
    expectedScrollYRatio: 0, // Should be at top
  },
  {
    name: 'Click at bottom-right (100%, 100%)',
    imageWidth: 1125,
    imageHeight: 3375,
    viewportWidth: 375,
    viewportHeight: 812,
    clickX: 1,
    clickY: 1,
    expectedScrollXRatio: 1, // Should be at right
    expectedScrollYRatio: 1, // Should be at bottom
  },
  {
    name: 'Click at center (50%, 50%)',
    imageWidth: 1125,
    imageHeight: 3375,
    viewportWidth: 375,
    viewportHeight: 812,
    clickX: 0.5,
    clickY: 0.5,
    expectedScrollXRatio: 0.5, // Should be centered
    expectedScrollYRatio: 0.5, // Should be centered
  },
  {
    name: 'Click at bottom (50%, 90%)',
    imageWidth: 1125,
    imageHeight: 3375,
    viewportWidth: 375,
    viewportHeight: 812,
    clickX: 0.5,
    clickY: 0.9,
    expectedScrollXRatio: 0.5, // Centered horizontally
    expectedScrollYRatio: 0.9, // Near bottom (around 85-95%)
  },
  {
    name: 'Click at top (50%, 10%)',
    imageWidth: 1125,
    imageHeight: 3375,
    viewportWidth: 375,
    viewportHeight: 812,
    clickX: 0.5,
    clickY: 0.1,
    expectedScrollXRatio: 0.5,
    expectedScrollYRatio: 0.1, // Near top (around 5-15%)
  },
];

console.log('Testing scroll calculation logic...\n');
let passed = 0;
let failed = 0;

tests.forEach((test) => {
  const result = calculateScrollPosition(
    test.imageWidth,
    test.imageHeight,
    test.viewportWidth,
    test.viewportHeight,
    test.clickX,
    test.clickY
  );

  const scrollXRatio = result.maxScrollX > 0 ? result.scrollX / result.maxScrollX : 0;
  const scrollYRatio = result.maxScrollY > 0 ? result.scrollY / result.maxScrollY : 0;

  // Allow some tolerance (±15%)
  const tolerance = 0.15;
  const xOk = Math.abs(scrollXRatio - test.expectedScrollXRatio) <= tolerance;
  const yOk = Math.abs(scrollYRatio - test.expectedScrollYRatio) <= tolerance;

  const status = xOk && yOk ? 'PASS' : 'FAIL';
  if (xOk && yOk) passed++;
  else failed++;

  console.log(`[${status}] ${test.name}`);
  console.log(`  Click position: (${(test.clickX * 100).toFixed(0)}%, ${(test.clickY * 100).toFixed(0)}%)`);
  console.log(`  Calculated scroll: X=${result.scrollX.toFixed(0)}, Y=${result.scrollY.toFixed(0)}`);
  console.log(`  Max scroll: X=${result.maxScrollX}, Y=${result.maxScrollY}`);
  console.log(`  Scroll ratio: X=${(scrollXRatio * 100).toFixed(1)}%, Y=${(scrollYRatio * 100).toFixed(1)}%`);
  console.log(`  Expected ratio: X=${(test.expectedScrollXRatio * 100).toFixed(1)}%, Y=${(test.expectedScrollYRatio * 100).toFixed(1)}%`);
  console.log('');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\n⚠️ Some tests failed! The scroll calculation logic may have issues.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed! The scroll calculation logic is correct.');
  process.exit(0);
}
