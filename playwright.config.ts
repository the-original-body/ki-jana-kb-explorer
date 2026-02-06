import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration for Cloudflare Workers
 *
 * Configured for testing preview deployments via CI/CD pipeline.
 * Uses PREVIEW_URL environment variable to target deployed preview instances.
 *
 * Usage:
 * - Local: Set PREVIEW_URL environment variable to preview deployment URL
 * - CI: PREVIEW_URL is set automatically by deploy.yml after wrangler versions upload
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory containing E2E test files
  testDir: "./tests/e2e",

  // Test file patterns
  testMatch: "**/*.spec.ts",

  // Fail the build on CI if test.only is left in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI for stability
  retries: process.env.CI ? 2 : 0,

  // Run tests in parallel - limit workers on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report" }], ["github"]]
    : [["html", { outputFolder: "playwright-report" }]],

  // Shared settings for all projects
  use: {
    // Base URL for navigation - uses PREVIEW_URL from CI environment
    // Falls back to local dev server for local testing
    baseURL: process.env.PREVIEW_URL || "http://localhost:5173",

    // Collect trace on first retry for debugging failures
    trace: "on-first-retry",

    // Screenshot on failure for debugging
    screenshot: "only-on-failure",

    // Video on failure for debugging
    video: "on-first-retry",

    // Navigation timeout for Cloudflare Workers cold starts
    navigationTimeout: 30000,

    // Action timeout
    actionTimeout: 15000,
  },

  // Global test timeout
  timeout: 60000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },

  // Configure browser projects
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Mobile viewports for responsive testing
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },

    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  // Output directory for test artifacts
  outputDir: "test-results",

  // Run local dev server before tests (only when PREVIEW_URL is not set)
  // In CI, tests run against the deployed preview URL
  ...(process.env.PREVIEW_URL
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:5173",
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }),
});
