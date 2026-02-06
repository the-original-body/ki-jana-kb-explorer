/**
 * Worker Entry Point - RedwoodSDK Application
 *
 * This file is the main entry point for the Cloudflare Worker.
 * It configures the RedwoodSDK application with:
 * - Middleware (session loading, authentication)
 * - React Server Components rendering
 * - Routes (landing, UI showcase, auth, app, health, 404)
 *
 * @see https://developers.cloudflare.com/workers/
 */

import { defineApp, ErrorResponse } from 'rwsdk/worker';
import { route, render } from 'rwsdk/router';
import { env } from 'cloudflare:workers';

// Re-export Durable Objects for Cloudflare to instantiate
// This is required for wrangler to find the DO class
export { SessionDurableObject } from './durable-objects/SessionDurableObject';

// Import Document component
import { Document } from './AppDocument';

// Import middleware
// import { sessionMiddleware } from './middleware/session';
// import { authInterceptor } from './middleware/auth';
import {
  cloudflareAccessMiddleware,
  type AccessUser,
  type CloudflareAccessEnv,
} from './middleware/cloudflare-access';

// Import routes (React Server Components)
import HomePage from './routes/index';
import UIShowcasePage from './routes/ui';
import LoginPage from './routes/login';
import { logoutHandler } from './routes/logout';
import AppPage from './routes/app';
import { healthHandler } from './routes/health';
import NotFoundPage from './routes/404';

// Server functions are available but not used in demo mode
// import { login } from './server/auth';

/**
 * Environment bindings type definition
 * These are configured in wrangler.jsonc per environment
 */
export interface Env extends CloudflareAccessEnv {
  /** Durable Object binding for session storage */
  SESSIONS: DurableObjectNamespace;
  /** Static assets binding */
  ASSETS: Fetcher;
  /** Environment identifier (preview, staging, production) */
  ENVIRONMENT: string;
  /** Secret for signing session cookies (set via wrangler secret) */
  SESSION_COOKIE_SECRET: string;
}

/**
 * Request context type for middleware
 */
export interface RequestContext {
  env: Env;
  ctx: ExecutionContext;
  request: Request;
  session?: {
    userId: string;
    email: string;
  } | null;
  /** Cloudflare Access authenticated user (if request came through Access) */
  accessUser?: AccessUser | null;
}


// HomePage is now imported from ./routes/index
// NotFoundPage is now imported from ./routes/404

/**
 * Cloudflare Access middleware wrapper for rwsdk
 *
 * Validates the Cf-Access-Jwt-Assertion header if present.
 * If validation fails, returns 401 error.
 * If no header (local dev), continues without setting accessUser.
 */
async function accessMiddleware({
  request,
  ctx,
}: {
  request: Request;
  ctx: { accessUser?: AccessUser | null };
}) {
  try {
    // Access env from cloudflare:workers module (rwsdk pattern)
    const { accessUser } = await cloudflareAccessMiddleware(request, env as Env);
    // Attach accessUser to context for downstream use
    ctx.accessUser = accessUser;
    // Continue to next middleware/route (return nothing)
  } catch (error) {
    // Access validation failed - return 401
    console.error('Cloudflare Access authentication failed:', error);
    return new Response(
      JSON.stringify({ error: 'Access denied: Invalid authentication' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Main application configuration using RedwoodSDK defineApp
 *
 * The defineApp function sets up:
 * - Middleware pipeline (session, auth)
 * - Document wrapper for HTML rendering
 * - Route definitions with React Server Components
 * - Error handling and 404 fallback
 */
const app = defineApp([
  // Cloudflare Access authentication (validates JWT if present)
  accessMiddleware,

  // Additional middleware can be added here:
  // sessionMiddleware,
  // authInterceptor,

  // Render configuration with Document component
  render(Document, [
    // Route definitions
    // Landing page
    route('/', HomePage),

    // Health check endpoint (returns JSON)
    route('/health', function () {
      return healthHandler();
    }),

    // UI component showcase
    route('/ui', UIShowcasePage),

    // Authentication routes
    route('/login', LoginPage),

    route('/logout', logoutHandler),

    // Protected app area (Notes application)
    route('/app', AppPage),


    // 404 Not Found - catch-all route for unmatched paths
    // This renders the NotFoundPage component with the Document wrapper
    route('*', NotFoundPage),
  ]),

  // Fallback 404 handler for any routes not caught above
  // This handles edge cases where the render() pipeline doesn't match
  () => {
    return new ErrorResponse(404, 'Not Found');
  },
]);

/**
 * Export the default handler for Cloudflare Workers
 * This is the main entry point that Cloudflare calls for each request
 */
export default app;
