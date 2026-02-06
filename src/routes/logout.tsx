/**
 * Logout Route Handler
 *
 * Server-side handler that:
 * 1. Clears the session cookie
 * 2. Returns a redirect response to the landing page
 *
 * This route does not render any UI - it's a pure server-side handler.
 *
 * @see src/server/auth.ts - logout function implementation (for production use)
 * @see src/middleware/session.ts - session cookie utilities
 */

// Full implementation imports (for production mode with Durable Objects)
// import { logout } from '../server/auth';
// import { getCookie, parseSignedSessionValue, SESSION_COOKIE_NAME } from '../middleware/session';

/**
 * Logout handler function for the /logout route
 *
 * Usage in worker.tsx:
 * ```tsx
 * import { logoutHandler } from './routes/logout';
 * route('/logout', logoutHandler),
 * ```
 *
 * Demo mode implementation - clears session cookie without DO storage
 * Full implementation would verify and delete session from Durable Object
 *
 * @param context - Request context from rwsdk
 * @returns Redirect response to landing page with session cookie cleared
 */
export async function logoutHandler(): Promise<Response> {
  // Clear the session cookie (demo mode - doesn't require env)
  const clearCookie = 'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';

  // Redirect to landing page
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': clearCookie,
    },
  });
}

/**
 * Default export for route() compatibility
 * Can be used directly in the routes array
 */
export default logoutHandler;
