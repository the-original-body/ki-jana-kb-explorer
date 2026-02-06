import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Vitest configuration for Cloudflare Workers
 *
 * Uses standard Vitest with edge runtime environment for testing
 * Cloudflare Workers compatible code.
 *
 * Note: @cloudflare/vitest-pool-workers is optional and may not be available.
 * This configuration works with standard Vitest while maintaining
 * compatibility with Workers runtime patterns.
 *
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  test: {
    // Test file patterns
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],

    // Exclude patterns
    exclude: [
      "node_modules",
      "dist",
      ".wrangler",
      "**/*.d.ts",
    ],

    // Use node environment for testing
    // Note: For full Workers runtime compatibility, use @cloudflare/vitest-pool-workers when available
    environment: "node",

    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Test timeout
    testTimeout: 30000,

    // Hook timeout
    hookTimeout: 30000,

    // Reporter configuration
    reporters: ["verbose"],

    // Coverage configuration
    coverage: {
      // Use v8 for coverage (faster than istanbul)
      provider: "v8",

      // Files to include in coverage
      include: ["src/**/*.ts", "src/**/*.tsx"],

      // Files to exclude from coverage
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/*.d.ts",
        "src/types/**",
      ],

      // Coverage thresholds
      thresholds: {
        // Minimum 70% coverage as per spec requirements
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },

      // Output formats
      reporter: ["text", "html", "lcov"],

      // Coverage output directory
      reportsDirectory: "./coverage",
    },

    // Setup files to run before tests
    setupFiles: ["./tests/setup.ts"],

    // Watch mode configuration
    watch: false,

    // Retry failed tests
    retry: 0,

    // Sequence configuration
    sequence: {
      // Shuffle tests for better isolation detection
      shuffle: false,
    },
  },

  // Path alias resolution (matches tsconfig.json and vite.config.ts)
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },

  // Define global constants for tests
  // ⚠️  These placeholder constants (__BUILD_TIME__, __GIT_SHA__) match the names
  //     used in vite.config.ts and are required for tests. DO NOT manually edit.
  define: {
    __BUILD_TIME__: JSON.stringify("2024-01-01T00:00:00.000Z"),
    __GIT_SHA__: JSON.stringify("test-sha"),
  },
});
