/**
 * Vitest Test Setup
 *
 * This file runs before each test file and sets up the testing environment
 * for Cloudflare Workers with @cloudflare/vitest-pool-workers.
 *
 * @see https://developers.cloudflare.com/workers/testing/vitest-integration/
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test utilities and setup
beforeAll(() => {
  // Setup code that runs once before all tests in a file
});

afterAll(() => {
  // Cleanup code that runs once after all tests in a file
});

beforeEach(() => {
  // Setup code that runs before each test
});

afterEach(() => {
  // Cleanup code that runs after each test
});

// Export test utilities that can be imported in test files
export const TEST_SESSION_COOKIE_SECRET =
  "test-secret-key-at-least-32-characters-long";

export const TEST_USER = {
  email: "demo@example.com",
  password: "demo1234",
  userId: "test-user-id",
};

export const TEST_ADMIN = {
  email: "admin@example.com",
  password: "admin1234",
  userId: "test-admin-id",
};

/**
 * Create a mock Request object for testing
 */
export function createMockRequest(
  url: string,
  options?: RequestInit
): Request {
  return new Request(url, {
    method: "GET",
    ...options,
  });
}

/**
 * Create a mock FormData object for testing form submissions
 */
export function createMockFormData(
  data: Record<string, string>
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
}

/**
 * Parse JSON response safely
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse JSON response: ${text}`);
  }
}

/**
 * Extract cookies from response headers
 */
export function extractCookies(
  response: Response
): Map<string, string> {
  const cookies = new Map<string, string>();
  // Use standard Headers API - getAll is not standard, so we get the single value
  const setCookieHeader = response.headers.get("Set-Cookie");
  const setCookieHeaders = setCookieHeader ? [setCookieHeader] : [];

  for (const header of setCookieHeaders) {
    if (header) {
      const [cookie] = header.split(";");
      const [name, value] = cookie?.split("=") ?? [];
      if (name && value !== undefined) {
        cookies.set(name.trim(), value.trim());
      }
    }
  }

  return cookies;
}

/**
 * Create a cookie header string from a map of cookies
 */
export function createCookieHeader(
  cookies: Map<string, string> | Record<string, string>
): string {
  const cookieMap =
    cookies instanceof Map ? cookies : new Map(Object.entries(cookies));
  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}
