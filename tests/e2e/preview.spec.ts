/**
 * Preview Deployment E2E Tests
 *
 * End-to-end tests that run against preview deployments.
 * These tests validate that the deployed preview environment works correctly
 * before changes are merged to main/production.
 *
 * Usage:
 * - CI: Runs automatically after `wrangler versions upload` with PREVIEW_URL set
 * - Local: Set PREVIEW_URL env var or tests will run against local dev server
 *
 * @see playwright.config.ts for configuration
 */

import { test, expect } from "@playwright/test";

/**
 * Health endpoint response type
 */
interface HealthResponse {
  ok: boolean;
  env: string;
  gitSha: string;
  buildTime: string;
}

test.describe("Preview Deployment Health Check", () => {
  test("health endpoint returns 200 status", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.status()).toBe(200);
  });

  test("health endpoint returns valid JSON structure", async ({ request }) => {
    const response = await request.get("/health");
    const body = (await response.json()) as HealthResponse;

    expect(body).toHaveProperty("ok");
    expect(body).toHaveProperty("env");
    expect(body).toHaveProperty("gitSha");
    expect(body).toHaveProperty("buildTime");
  });

  test("health endpoint reports healthy status", async ({ request }) => {
    const response = await request.get("/health");
    const body = (await response.json()) as HealthResponse;

    expect(body.ok).toBe(true);
  });

  test("health endpoint returns correct content-type", async ({ request }) => {
    const response = await request.get("/health");
    const contentType = response.headers()["content-type"];

    expect(contentType).toBe("application/json");
  });

  test("health endpoint returns environment info", async ({ request }) => {
    const response = await request.get("/health");
    const body = (await response.json()) as HealthResponse;

    // Environment should be a non-empty string
    expect(typeof body.env).toBe("string");
    expect(body.env.length).toBeGreaterThan(0);
  });
});

test.describe("Preview Deployment Application Loading", () => {
  test("home page loads successfully", async ({ page }) => {
    const response = await page.goto("/");

    // Should get a successful response
    expect(response?.status()).toBeLessThan(400);
  });

  test("home page has correct title", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to be fully loaded
    await page.waitForLoadState("domcontentloaded");

    // Page should have a title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("home page renders without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    // Collect console errors
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out known acceptable errors (e.g., favicon 404)
    const criticalErrors = consoleErrors.filter(
      (error) => !error.includes("favicon") && !error.includes("404")
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test("home page renders visible content", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Page body should have content
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Body should have some text content
    const bodyText = await body.textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });
});

test.describe("Preview Deployment Error Handling", () => {
  test("404 page returns proper status for non-existent routes", async ({
    request,
  }) => {
    const response = await request.get("/this-route-does-not-exist-" + Date.now());

    // Should return 404 for non-existent routes
    expect(response.status()).toBe(404);
  });
});

test.describe("Preview Deployment Performance", () => {
  test("home page loads within acceptable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const loadTime = Date.now() - startTime;

    // Page should load within 10 seconds (accounting for cold starts)
    expect(loadTime).toBeLessThan(10000);
  });

  test("health endpoint responds quickly", async ({ request }) => {
    const startTime = Date.now();

    await request.get("/health");

    const responseTime = Date.now() - startTime;

    // Health endpoint should respond within 5 seconds (accounting for cold starts)
    expect(responseTime).toBeLessThan(5000);
  });
});

test.describe("Preview Deployment Security Headers", () => {
  test("health endpoint includes cache control headers", async ({ request }) => {
    const response = await request.get("/health");
    const cacheControl = response.headers()["cache-control"];

    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain("no-store");
  });
});
