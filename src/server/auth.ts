"use server";

/**
 * Authentication Server Functions
 *
 * These server functions handle user authentication:
 * - login(): Validates credentials, creates session, sets cookie
 * - logout(): Deletes session, clears cookie
 *
 * Server functions use the "use server" directive and return serializable data only.
 * They are called from client components via form actions or direct invocation.
 *
 * Security:
 * - Session cookies use HttpOnly, Secure, SameSite=Strict flags
 * - Credentials are validated server-side only
 * - Generic error messages prevent user enumeration
 * - No secrets or stack traces in responses
 */

import {
  generateSessionId,
  createSessionCookie,
  createClearSessionCookie,
  saveSession,
  deleteSession,
  SESSION_EXPIRATION_DAYS,
  type SessionEnv,
} from '../middleware/session';
import type { SessionData } from '../durable-objects/SessionDurableObject';

/**
 * Extended environment interface for auth
 * Includes optional demo user credentials from environment variables
 */
export interface AuthEnv extends SessionEnv {
  /** Demo user email (optional, for development/testing) */
  DEMO_USER_EMAIL?: string;
  /** Demo user password (optional, for development/testing) */
  DEMO_USER_PASSWORD?: string;
}

/**
 * Build demo users from environment variables
 * In production, replace with actual database lookup
 */
function getDemoUsers(env: AuthEnv): Record<string, { password: string; userId: string; name: string }> {
  const users: Record<string, { password: string; userId: string; name: string }> = {};

  // Add demo user from environment if configured
  if (env.DEMO_USER_EMAIL && env.DEMO_USER_PASSWORD) {
    users[env.DEMO_USER_EMAIL.toLowerCase()] = {
      password: env.DEMO_USER_PASSWORD,
      userId: 'user_demo',
      name: 'Demo User',
    };
  }

  return users;
}

/**
 * Login result - serializable data returned from login()
 */
export interface LoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
  /** Session cookie header value to set */
  sessionCookie?: string;
}

/**
 * Logout result - serializable data returned from logout()
 */
export interface LogoutResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
  /** Cookie header value to clear session */
  clearCookie?: string;
}

/**
 * Validates user credentials against demo users from environment
 * In production, replace with database lookup and secure password comparison
 *
 * @param email - User email
 * @param password - User password (plaintext for demo)
 * @param env - Environment with demo credentials
 * @returns User data if valid, null otherwise
 */
function validateCredentials(
  email: string,
  password: string,
  env: AuthEnv
): { userId: string; email: string; name: string } | null {
  const normalizedEmail = email.toLowerCase().trim();
  const demoUsers = getDemoUsers(env);
  const user = demoUsers[normalizedEmail];

  if (!user) {
    return null;
  }

  // Simple string comparison for demo
  // In production: use timing-safe comparison with hashed passwords
  if (user.password !== password) {
    return null;
  }

  return {
    userId: user.userId,
    email: normalizedEmail,
    name: user.name,
  };
}

/**
 * Login server function
 *
 * Validates credentials, creates a session in SessionDurableObject,
 * and returns the session cookie to be set by the client/middleware.
 *
 * Usage in form:
 * ```tsx
 * const [state, formAction] = useActionState(login, initialState);
 * <form action={formAction}>...</form>
 * ```
 *
 * @param prevState - Previous state (for useActionState)
 * @param formData - Form data with email and password
 * @param env - Environment bindings (SESSIONS, SESSION_COOKIE_SECRET)
 * @returns Login result with success status and session cookie
 */
export async function login(
  formData: FormData,
  env: AuthEnv
): Promise<LoginResult> {
  // Extract form fields
  const email = formData.get('email');
  const password = formData.get('password');
  const redirectTo = formData.get('redirect') as string | null;

  // Validate input types
  if (typeof email !== 'string' || typeof password !== 'string') {
    return {
      success: false,
      error: 'Invalid form data',
    };
  }

  // Validate email format (basic check)
  if (!email || !email.includes('@')) {
    return {
      success: false,
      error: 'Please enter a valid email address',
    };
  }

  // Validate password
  if (!password || password.length < 4) {
    return {
      success: false,
      error: 'Password must be at least 4 characters',
    };
  }

  // Validate credentials
  const user = validateCredentials(email, password, env);
  if (!user) {
    // Generic error message to prevent user enumeration
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  // Check for SESSION_COOKIE_SECRET
  if (!env.SESSION_COOKIE_SECRET) {
    return {
      success: false,
      error: 'Server configuration error',
    };
  }

  // Generate session ID
  const sessionId = generateSessionId();

  // Calculate session expiration
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

  // Create session data
  const sessionData: SessionData = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Save session to Durable Object
  const saved = await saveSession(sessionId, sessionData, env.SESSIONS);
  if (!saved) {
    return {
      success: false,
      error: 'Failed to create session',
    };
  }

  // Create signed session cookie
  const sessionCookie = await createSessionCookie(sessionId, env.SESSION_COOKIE_SECRET);

  return {
    success: true,
    redirectTo: redirectTo || '/app',
    sessionCookie,
  };
}

/**
 * Logout server function
 *
 * Deletes the session from SessionDurableObject and returns
 * the cookie header to clear the session cookie.
 *
 * Usage:
 * ```tsx
 * const result = await logout(sessionId, env);
 * // Set response headers with result.clearCookie
 * ```
 *
 * @param sessionId - The current session ID
 * @param env - Environment bindings (SESSIONS)
 * @returns Logout result with success status and clear cookie header
 */
export async function logout(
  sessionId: string | null,
  env: SessionEnv
): Promise<LogoutResult> {
  // If there's a session ID, delete it from the Durable Object
  if (sessionId) {
    try {
      await deleteSession(sessionId, env.SESSIONS);
    } catch {
      // Silently fail - user is logging out anyway
      // Don't expose errors that might leak information
    }
  }

  // Create the cookie header to clear the session
  const clearCookie = createClearSessionCookie();

  return {
    success: true,
    redirectTo: '/',
    clearCookie,
  };
}

/**
 * Login action for use with useActionState
 *
 * This is a wrapper around login() that matches the expected signature
 * for React 19's useActionState hook.
 *
 * @param prevState - Previous state
 * @param formData - Form data from submission
 * @param env - Environment bindings passed from context
 */
export async function loginAction(
  _prevState: LoginResult | null,
  formData: FormData,
  env: AuthEnv
): Promise<LoginResult> {
  return login(formData, env);
}

/**
 * Get demo user credentials for the login page
 * Only show in non-production environments
 *
 * @param env - Environment with demo credentials
 * @returns Array of demo credentials (empty if not configured)
 */
export function getDemoCredentials(env: AuthEnv): { email: string; password: string }[] {
  const demoUsers = getDemoUsers(env);
  return Object.entries(demoUsers).map(([email, data]) => ({
    email,
    password: data.password,
  }));
}
