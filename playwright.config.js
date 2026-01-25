// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Shopify theme testing.
 * Tests require SHOPIFY_PREVIEW_URL environment variable to be set.
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 2 : 0,
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
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Desktop Safari',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
});
