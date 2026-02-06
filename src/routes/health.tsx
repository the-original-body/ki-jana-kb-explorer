/**
 * Health Check Endpoint (/health)
 *
 * Returns JSON with application status information:
 * - ok: boolean indicating healthy state
 * - env: current environment (preview, staging, production)
 * - gitSha: Git commit SHA (populated at build time)
 * - buildTime: ISO timestamp of build (populated at build time)
 *
 * This is not a React component but a handler function that returns JSON.
 * Used for monitoring, load balancer health checks, and debugging deployments.
 */

// Declare build-time constants (defined in vite.config.ts)
// ⚠️  These placeholder constants are automatically populated during build.
//     DO NOT manually edit or rename these declarations.
declare const __GIT_SHA__: string;
declare const __BUILD_TIME__: string;

/**
 * Health check response structure
 */
export interface HealthResponse {
  ok: boolean;
  env: string;
  gitSha: string;
  buildTime: string;
}

/**
 * Health check handler - rwsdk compatible
 *
 * Returns JSON with application status. This endpoint is useful for:
 * - Load balancer health checks
 * - Monitoring systems (e.g., uptime monitors)
 * - Verifying deployments (checking gitSha matches expected commit)
 * - Debugging environment configuration
 *
 * @returns Response with JSON body
 *
 * @example
 * // Response format:
 * // {
 * //   "ok": true,
 * //   "env": "production",
 * //   "gitSha": "abc1234...",
 * //   "buildTime": "2024-01-15T10:30:00.000Z"
 * // }
 */
export function healthHandler(): Response {
  // Access environment from global Env type (defined by rwsdk/wrangler)
  // In dev mode, we use 'development' as the default
  // ⚠️  __ENV_ENVIRONMENT__ is a runtime placeholder injected by the Workers runtime.
  //     DO NOT manually edit this constant name.
  const environment =
    typeof globalThis !== 'undefined' &&
    (globalThis as Record<string, unknown>).__ENV_ENVIRONMENT__
      ? String((globalThis as Record<string, unknown>).__ENV_ENVIRONMENT__)
      : 'development';

  const response: HealthResponse = {
    ok: true,
    env: environment,
    gitSha: typeof __GIT_SHA__ !== 'undefined' ? __GIT_SHA__ : 'unknown',
    buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'unknown',
  };

  return Response.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Default export for route compatibility
 * This allows the handler to be used directly as a route handler
 */
export default healthHandler;
