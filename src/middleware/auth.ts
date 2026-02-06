/**
 * Auth Interceptor Middleware
 *
 * This middleware protects routes that require authentication:
 * - Intercepts requests to /app/* routes
 * - Checks for valid session from session middleware
 * - Redirects unauthenticated users to /login
 * - Allows authenticated users to proceed
 *
 * This interceptor must run AFTER sessionMiddleware in the middleware pipeline
 * to have access to session information.
 *
 * Usage in defineApp:
 * ```ts
 * const app = defineApp([
 *   sessionMiddleware,  // First: Load session
 *   authInterceptor,    // Second: Check auth for protected routes
 *   render(Document, routes),
 * ]);
 * ```
 */

import type { RequestContextWithSession } from './session';
import type { SessionData } from '../durable-objects/SessionDurableObject';

/**
 * Protected route prefixes
 * All routes starting with these paths require authentication
 */
export const PROTECTED_ROUTES = ['/app'] as const;

/**
 * Login page path for redirects
 */
export const LOGIN_PATH = '/login';

/**
 * Checks if a URL path requires authentication
 *
 * @param pathname - The URL pathname to check
 * @returns True if the path requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Creates a redirect response to the login page
 * Preserves the original URL as a query parameter for post-login redirect
 *
 * @param originalUrl - The original request URL (for redirect after login)
 * @returns A redirect Response to the login page
 */
export function createLoginRedirect(originalUrl: string): Response {
  const url = new URL(originalUrl);
  const loginUrl = new URL(LOGIN_PATH, url.origin);

  // Store the original path for redirect after login
  // Only store if it's different from the login page itself
  if (url.pathname !== LOGIN_PATH) {
    loginUrl.searchParams.set('redirect', url.pathname + url.search);
  }

  return Response.redirect(loginUrl.toString(), 302);
}

/**
 * Extended request context with authenticated session
 * This type is available after the auth interceptor for protected routes
 */
export interface AuthenticatedContext extends RequestContextWithSession {
  session: SessionData;
  sessionId: string;
}

/**
 * Type guard to check if context has authenticated session
 */
export function isAuthenticated(
  context: RequestContextWithSession
): context is AuthenticatedContext {
  return context.session !== null && context.sessionId !== null;
}

/**
 * Auth interceptor middleware for RedwoodSDK
 *
 * This middleware:
 * 1. Checks if the request URL matches a protected route pattern
 * 2. If protected, verifies session exists from session middleware
 * 3. If no session, returns a redirect to /login
 * 4. If session exists, allows the request to proceed
 *
 * Security considerations:
 * - Always runs after sessionMiddleware to have session data
 * - Uses 302 redirect (temporary) for login redirects
 * - Preserves original URL for post-login redirect
 * - Does not expose why authentication failed (security through obscurity)
 *
 * @param context - Request context with session from sessionMiddleware
 * @returns undefined to continue, or Response to intercept
 */
export function authInterceptor(
  context: RequestContextWithSession
): Response | undefined {
  const { request, session } = context;

  // Parse the request URL
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Check if this is a protected route
  if (!isProtectedRoute(pathname)) {
    // Not a protected route - allow request to proceed
    return undefined;
  }

  // This is a protected route - check for valid session
  if (!session) {
    // No valid session - redirect to login
    return createLoginRedirect(request.url);
  }

  // Session exists - check if it's still valid
  // The session middleware already verified the signature and loaded the session
  // We just need to ensure the session has required fields

  if (!session.userId || !session.email) {
    // Invalid session data - redirect to login
    return createLoginRedirect(request.url);
  }

  // Check if session has expired
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    // Session expired - redirect to login
    return createLoginRedirect(request.url);
  }

  // Valid session exists - allow request to proceed
  // The route handler can access the session from context
  return undefined;
}

/**
 * Helper to get authenticated user from context
 * Use this in route handlers for protected routes
 *
 * @param context - Request context with session
 * @returns User info or null if not authenticated
 */
export function getAuthenticatedUser(
  context: RequestContextWithSession
): { userId: string; email: string } | null {
  if (!context.session) {
    return null;
  }

  return {
    userId: context.session.userId,
    email: context.session.email,
  };
}

/**
 * Higher-order function to require authentication for a route handler
 * Returns 401 Unauthorized if not authenticated instead of redirect
 * Useful for API routes that shouldn't redirect
 *
 * @param handler - The route handler to wrap
 * @returns Wrapped handler that checks authentication
 */
export function requireAuth<T extends RequestContextWithSession>(
  handler: (context: AuthenticatedContext) => Response | Promise<Response>
): (context: T) => Response | Promise<Response> {
  return async (context: T): Promise<Response> => {
    if (!isAuthenticated(context as unknown as RequestContextWithSession)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return handler(context as unknown as AuthenticatedContext);
  };
}
