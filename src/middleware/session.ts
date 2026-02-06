/**
 * Session Middleware
 *
 * This middleware handles session management for the application:
 * - Parses session cookie from incoming requests
 * - Verifies cookie signature using Web Crypto API (HMAC-SHA256)
 * - Loads session data from SessionDurableObject
 * - Attaches session to request context for downstream use
 *
 * Security features:
 * - HttpOnly: Cookie not accessible via JavaScript
 * - Secure: Cookie only sent over HTTPS
 * - SameSite=Strict: Prevents CSRF attacks
 * - Signed cookies: Tamper-proof session IDs
 */

import type { SessionData } from '../durable-objects/SessionDurableObject';

/** Session cookie name */
export const SESSION_COOKIE_NAME = 'session';

/** Session cookie expiration in days */
export const SESSION_EXPIRATION_DAYS = 7;

/**
 * Encodes an ArrayBuffer to base64url string (URL-safe base64)
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  // Convert to base64 and make URL-safe
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a base64url string to ArrayBuffer
 */
function base64UrlDecode(str: string): ArrayBuffer {
  // Add back padding and convert from URL-safe
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(padding);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Creates an HMAC-SHA256 key from the secret using Web Crypto API
 */
async function getSigningKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Signs a value using HMAC-SHA256 with the provided secret
 * Uses Web Crypto API (crypto.subtle) for Cloudflare Workers compatibility
 *
 * @param value - The value to sign (e.g., session ID)
 * @param secret - The secret key for signing
 * @returns Base64url encoded signature
 */
export async function signValue(value: string, secret: string): Promise<string> {
  const key = await getSigningKey(secret);
  const encoder = new TextEncoder();
  const data = encoder.encode(value);

  const signature = await crypto.subtle.sign('HMAC', key, data);
  return base64UrlEncode(signature);
}

/**
 * Verifies a signed value using HMAC-SHA256
 * Uses Web Crypto API (crypto.subtle) for Cloudflare Workers compatibility
 *
 * @param value - The original value
 * @param signature - The base64url encoded signature to verify
 * @param secret - The secret key used for signing
 * @returns True if the signature is valid
 */
export async function verifySignature(
  value: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const key = await getSigningKey(secret);
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const signatureBuffer = base64UrlDecode(signature);

    return crypto.subtle.verify('HMAC', key, signatureBuffer, data);
  } catch {
    // Invalid signature format or verification failed
    return false;
  }
}

/**
 * Generates a cryptographically secure random session ID
 * Uses Web Crypto API for secure random generation
 */
export function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
}

/**
 * Creates a signed session cookie value
 * Format: sessionId.signature
 *
 * @param sessionId - The session identifier
 * @param secret - The secret key for signing
 * @returns Signed cookie value in format "sessionId.signature"
 */
export async function createSignedSessionValue(
  sessionId: string,
  secret: string
): Promise<string> {
  const signature = await signValue(sessionId, secret);
  return `${sessionId}.${signature}`;
}

/**
 * Parses and verifies a signed session cookie value
 *
 * @param cookieValue - The cookie value in format "sessionId.signature"
 * @param secret - The secret key used for signing
 * @returns The session ID if valid, null otherwise
 */
export async function parseSignedSessionValue(
  cookieValue: string,
  secret: string
): Promise<string | null> {
  const parts = cookieValue.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [sessionId, signature] = parts;
  if (!sessionId || !signature) {
    return null;
  }

  const isValid = await verifySignature(sessionId, signature, secret);
  if (!isValid) {
    return null;
  }

  return sessionId;
}

/**
 * Parses cookies from the Cookie header
 *
 * @param cookieHeader - The Cookie header value
 * @returns Object mapping cookie names to values
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const [name, ...valueParts] = pair.trim().split('=');
    if (name) {
      // Handle cookies with '=' in the value
      const value = valueParts.join('=');
      cookies[name.trim()] = value;
    }
  }

  return cookies;
}

/**
 * Gets a cookie value from the request
 *
 * @param request - The incoming request
 * @param name - The cookie name
 * @returns The cookie value or null if not found
 */
export function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  const cookies = parseCookies(cookieHeader);
  return cookies[name] || null;
}

/**
 * Cookie options for session cookies
 */
export interface CookieOptions {
  /** Max age in seconds */
  maxAge?: number;
  /** Expiration date */
  expires?: Date;
  /** Cookie path (default: /) */
  path?: string;
  /** Cookie domain */
  domain?: string;
  /** Secure flag - only send over HTTPS (default: true in production) */
  secure?: boolean;
  /** HttpOnly flag - not accessible via JavaScript (default: true) */
  httpOnly?: boolean;
  /** SameSite attribute (default: Strict) */
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Creates a Set-Cookie header value with secure defaults
 *
 * Security flags applied by default:
 * - HttpOnly: Prevents XSS attacks from accessing the cookie
 * - Secure: Only transmits cookie over HTTPS
 * - SameSite=Strict: Prevents CSRF attacks
 * - Path=/: Cookie available site-wide
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Additional cookie options
 * @returns The Set-Cookie header value
 */
export function createCookieHeader(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const {
    maxAge,
    expires,
    path = '/',
    domain,
    secure = true,
    httpOnly = true,
    sameSite = 'Strict',
  } = options;

  const parts: string[] = [`${name}=${value}`];

  if (maxAge !== undefined) {
    parts.push(`Max-Age=${maxAge}`);
  }

  if (expires) {
    parts.push(`Expires=${expires.toUTCString()}`);
  }

  if (path) {
    parts.push(`Path=${path}`);
  }

  if (domain) {
    parts.push(`Domain=${domain}`);
  }

  if (secure) {
    parts.push('Secure');
  }

  // HttpOnly flag - prevents JavaScript access to cookie
  if (httpOnly) {
    parts.push('HttpOnly');
  }

  if (sameSite) {
    parts.push(`SameSite=${sameSite}`);
  }

  return parts.join('; ');
}

/**
 * Creates a session cookie with secure defaults
 *
 * @param sessionId - The session identifier
 * @param secret - The secret key for signing
 * @param options - Additional cookie options
 * @returns The Set-Cookie header value
 */
export async function createSessionCookie(
  sessionId: string,
  secret: string,
  options: CookieOptions = {}
): Promise<string> {
  const signedValue = await createSignedSessionValue(sessionId, secret);

  // Default to 7 days expiration
  const maxAge = options.maxAge ?? SESSION_EXPIRATION_DAYS * 24 * 60 * 60;

  return createCookieHeader(SESSION_COOKIE_NAME, signedValue, {
    ...options,
    maxAge,
    // Ensure security flags are always set for session cookies
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
  });
}

/**
 * Creates a header to clear the session cookie
 *
 * @returns The Set-Cookie header value that clears the session
 */
export function createClearSessionCookie(): string {
  return createCookieHeader(SESSION_COOKIE_NAME, '', {
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
  });
}

/**
 * Environment bindings required by session middleware
 */
export interface SessionEnv {
  SESSIONS: DurableObjectNamespace;
  SESSION_COOKIE_SECRET: string;
}

/**
 * Session context added to the request
 */
export interface SessionContext {
  session: SessionData | null;
  sessionId: string | null;
}

/**
 * Loads session data from the SessionDurableObject
 *
 * @param sessionId - The session identifier
 * @param sessions - The SESSIONS Durable Object namespace
 * @returns Session data or null if not found/expired
 */
export async function loadSession(
  sessionId: string,
  sessions: DurableObjectNamespace
): Promise<SessionData | null> {
  try {
    // Get the Durable Object stub for this session
    // We use the session ID as the name to get a consistent DO instance
    const id = sessions.idFromName(sessionId);
    const stub = sessions.get(id);

    // Fetch session data from the DO
    const response = await stub.fetch(
      new Request(`https://sessions/?id=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
      })
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as SessionData | null;
  } catch {
    // Error loading session - return null to treat as no session
    return null;
  }
}

/**
 * Saves session data to the SessionDurableObject
 *
 * @param sessionId - The session identifier
 * @param data - The session data to store
 * @param sessions - The SESSIONS Durable Object namespace
 * @returns True if saved successfully
 */
export async function saveSession(
  sessionId: string,
  data: SessionData,
  sessions: DurableObjectNamespace
): Promise<boolean> {
  try {
    const id = sessions.idFromName(sessionId);
    const stub = sessions.get(id);

    const response = await stub.fetch(
      new Request(`https://sessions/?id=${encodeURIComponent(sessionId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Deletes session data from the SessionDurableObject
 *
 * @param sessionId - The session identifier
 * @param sessions - The SESSIONS Durable Object namespace
 * @returns True if deleted successfully
 */
export async function deleteSession(
  sessionId: string,
  sessions: DurableObjectNamespace
): Promise<boolean> {
  try {
    const id = sessions.idFromName(sessionId);
    const stub = sessions.get(id);

    const response = await stub.fetch(
      new Request(`https://sessions/?id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      })
    );

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Request context with session information
 */
export interface RequestContextWithSession {
  request: Request;
  env: SessionEnv;
  ctx: ExecutionContext;
  session: SessionData | null;
  sessionId: string | null;
}

/**
 * Session middleware for RedwoodSDK
 *
 * This middleware:
 * 1. Extracts the session cookie from the request
 * 2. Verifies the cookie signature using HMAC-SHA256
 * 3. Loads session data from the SessionDurableObject
 * 4. Attaches session to the request context
 *
 * Usage in defineApp:
 * ```ts
 * const app = defineApp([
 *   sessionMiddleware,
 *   // ... other middleware and routes
 * ]);
 * ```
 */
export async function sessionMiddleware({
  request,
  env,
  ctx,
}: {
  request: Request;
  env: SessionEnv;
  ctx: ExecutionContext;
}): Promise<RequestContextWithSession | undefined> {
  // Check for SESSION_COOKIE_SECRET
  if (!env.SESSION_COOKIE_SECRET) {
    // In development, warn about missing secret
    // In production, this should fail deployment
    return {
      request,
      env,
      ctx,
      session: null,
      sessionId: null,
    };
  }

  // Warn if secret is too short
  if (env.SESSION_COOKIE_SECRET.length < 32) {
    // Log warning server-side (do not expose to client)
    // Consider: Fail in production if secret is too weak
  }

  // Get session cookie
  const cookieValue = getCookie(request, SESSION_COOKIE_NAME);

  if (!cookieValue) {
    // No session cookie - continue without session
    return {
      request,
      env,
      ctx,
      session: null,
      sessionId: null,
    };
  }

  // Parse and verify the signed cookie
  const sessionId = await parseSignedSessionValue(
    cookieValue,
    env.SESSION_COOKIE_SECRET
  );

  if (!sessionId) {
    // Invalid or tampered cookie - continue without session
    return {
      request,
      env,
      ctx,
      session: null,
      sessionId: null,
    };
  }

  // Load session from Durable Object
  const session = await loadSession(sessionId, env.SESSIONS);

  return {
    request,
    env,
    ctx,
    session,
    sessionId,
  };
}

/**
 * Export all session-related utilities for use in auth server functions
 */
export {
  type SessionData,
};
