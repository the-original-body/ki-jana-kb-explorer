/**
 * Worker Entry Point - ki-jana-kb-explorer Application
 *
 * This file is the main entry point for the Cloudflare Worker.
 * Zero-Auth public access configuration for KB analytics explorer.
 *
 * @see https://developers.cloudflare.com/workers/
 */

import { defineApp, ErrorResponse } from 'rwsdk/worker';
import { route, render } from 'rwsdk/router';

// Import Document component
import { Document } from './AppDocument';

// Import routes (React Server Components)
import HomePage from './routes/index';
import UIShowcasePage from './routes/ui';
import AppPage from './routes/app';
import { healthHandler } from './routes/health';
import NotFoundPage from './routes/404';

/**
 * Environment bindings type definition
 * These are configured in wrangler.jsonc per environment
 */
export interface Env {
  /** Static assets binding */
  ASSETS: Fetcher;
  /** Environment identifier (preview, staging, production) */
  ENVIRONMENT: string;
}

/**
 * Request context type for middleware
 */
export interface RequestContext {
  env: Env;
  ctx: ExecutionContext;
  request: Request;
}

/**
 * Main application configuration using RedwoodSDK defineApp
 *
 * Zero-Auth configuration - no authentication middleware.
 * Public access to all routes.
 */
const app = defineApp([
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

    // KB Analytics Explorer (main app)
    route('/app', AppPage),

    // 404 Not Found - catch-all route for unmatched paths
    route('*', NotFoundPage),
  ]),

  // Fallback 404 handler for any routes not caught above
  () => {
    return new ErrorResponse(404, 'Not Found');
  },
]);

/**
 * Export the default handler for Cloudflare Workers
 */
export default app;
