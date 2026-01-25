// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Shopify theme testing.
 * Tests require SHOPIFY_PREVIEW_URL environment variable to be set.
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: process.env.SHOPIFY_PREVIEW_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Desktop Safari',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari 13',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'Mobile Safari 15 Pro Max',
      use: { ...devices['iPhone 15 Pro Max'] },
    },
  ],
});
