/**
 * Middleware Tests
 *
 * Tests for session and auth middleware:
 * - sessionMiddleware: Loads session from valid cookie, returns null for invalid
 * - authInterceptor: Protects /app routes, redirects unauthenticated users to /login
 *
 * Security validations:
 * - Session cookies are verified using HMAC-SHA256
 * - Protected routes require valid session
 * - Redirect preserves original URL for post-login redirect
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sessionMiddleware,
  loadSession,
  saveSession,
  deleteSession,
  createSignedSessionValue,
  SESSION_COOKIE_NAME,
  type SessionEnv,
  type RequestContextWithSession,
} from '@/middleware/session';
import {
  authInterceptor,
  isProtectedRoute,
  createLoginRedirect,
  isAuthenticated,
  getAuthenticatedUser,
  requireAuth,
  PROTECTED_ROUTES,
  LOGIN_PATH,
} from '@/middleware/auth';
import type { SessionData } from '@/durable-objects/SessionDurableObject';
import {
  createMockRequest,
  TEST_SESSION_COOKIE_SECRET,
  TEST_USER,
} from './setup';

/**
 * Mock SessionDurableObject storage
 */
const mockStorage = new Map<string, unknown>();

/**
 * Create a mock SESSIONS Durable Object namespace
 */
function createMockSessionsNamespace() {
  return {
    idFromName: vi.fn((name: string) => ({ id: name })),
    get: vi.fn(() => ({
      fetch: vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('id');

        if (request.method === 'GET') {
          const data = mockStorage.get(sessionId || '');
          return new Response(JSON.stringify(data || null), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (request.method === 'PUT') {
          const data = await request.json();
          mockStorage.set(sessionId || '', data);
          return new Response(JSON.stringify({ ok: true }));
        }

        if (request.method === 'DELETE') {
          mockStorage.delete(sessionId || '');
          return new Response(JSON.stringify({ ok: true }));
        }

        return new Response('Method Not Allowed', { status: 405 });
      }),
    })),
  } as unknown as DurableObjectNamespace;
}

/**
 * Create a mock environment for testing
 */
function createMockEnv(): SessionEnv {
  return {
    SESSIONS: createMockSessionsNamespace(),
    SESSION_COOKIE_SECRET: TEST_SESSION_COOKIE_SECRET,
  };
}

/**
 * Create a mock ExecutionContext
 */
function createMockExecutionContext(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

/**
 * Create a valid session for testing
 */
function createValidSession(): SessionData {
  return {
    userId: TEST_USER.userId,
    email: TEST_USER.email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create an expired session for testing
 */
function createExpiredSession(): SessionData {
  return {
    userId: TEST_USER.userId,
    email: TEST_USER.email,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

describe('Session Middleware', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  describe('sessionMiddleware()', () => {
    describe('No Session Cookie', () => {
      it('should return context with null session when no cookie present', async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/');

        const result = await sessionMiddleware({ request, env, ctx });

        expect(result).toBeDefined();
        expect(result?.session).toBeNull();
        expect(result?.sessionId).toBeNull();
        expect(result?.request).toBe(request);
        expect(result?.env).toBe(env);
        expect(result?.ctx).toBe(ctx);
      });

      it('should return context with null session when cookie header is empty', async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/', {
          headers: { Cookie: '' },
        });

        const result = await sessionMiddleware({ request, env, ctx });

        expect(result?.session).toBeNull();
        expect(result?.sessionId).toBeNull();
      });
    });

    describe('Valid Session Cookie', () => {
      it('should load session from valid signed cookie', async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const sessionId = 'test-session-id';
        const session = createValidSession();

        // Store session in mock storage
        mockStorage.set(sessionId, session);

        // Create signed cookie value
        const signedValue = await createSignedSessionValue(
          sessionId,
          TEST_SESSION_COOKIE_SECRET
        );

        const request = createMockRequest('http://localhost/', {
          headers: { Cookie: `${SESSION_COOKIE_NAME}=${signedValue}` },
        });

        const result = await sessionMiddleware({ request, env, ctx });

        expect(result?.session).toBeDefined();
        expect(result?.session?.userId).toBe(TEST_USER.userId);
        expect(result?.session?.email).toBe(TEST_USER.email);
        expect(result?.sessionId).toBe(sessionId);
      });

      it('should preserve all session fields', async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const sessionId = 'test-session-with-fields';
        const session = createValidSession();

        mockStorage.set(sessionId, session);

        const signedValue = await createSignedSessionValue(
          sessionId,
          TEST_SESSION_COOKIE_SECRET
        );

        const request = createMockRequest('http://localhost/', {
          headers: { Cookie: `${SESSION_COOKIE_NAME}=${signedValue}` },
        });

        const result = await sessionMiddleware({ request, env, ctx });

        expect(result?.session?.createdAt).toBe(session.createdAt);
        expect(result?.session?.expiresAt).toBe(session.expiresAt);
      });
    });

    describe('Invalid Session Cookie', () => {
      it('should return null session for tampered cookie', async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const sessionId = 'test-session-id';
        const session = createValidSession();

        mockStorage.set(sessionId, session);

        // Create signed cookie value
        const signedValue = await createSignedSessionValue(
          sessionId,
          TEST_SESSION_COOKIE_SECRET
        );

        // Tamper with the value
        const tamperedValue = signedValue.replace(sessionId, 'tampered-id');

        const request = createMockRequest('http://localhost/', {
          headers: { Cookie: `${SESSION_COOKIE_NAME}=${tamperedValue}` },
        });

        const result = await sessionMiddleware({ request, env, ctx });

        expect(result?.session).toBeNull();
        expect(result?.sessionId).toBeNull();
      });

      it('should return null session for invalid cookie format', async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();

        const request = createMockRequest('http://localhost/', {
          headers: { Cookie: `${SESSION_COOKIE_NAME}=invalid-no-separator` },
        });

        const result = await sessionMiddleware({ request, env, ctx });

        expect(result?.session).toBeNull();
        expect(result?.sessionId).toBeNull();
      });

      it('should return null session for cookie signed with wrong secret', async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const sessionId = 'test-session-id';
        const session = createValidSession();

        mockStorage.set(sessionId, session);

        // Sign with wrong secret
        const wrongSecret = 'different-secret-key-at-least-32-chars';
        const signedValue = await createSignedSessionValue(sessionId, wrongSecret);

        const request = createMockRequest('http://localhost/', {
          headers: { Cookie: `${SESSION_COOKIE_NAME}=${signedValue}` },
        });

        const result = await sessionMiddleware({ request, env, ctx });

        expect(result?.session).toBeNull();
        expect(result?.sessionId).toBeNull();
      });

      it('should return null session when session not found in storage', async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const sessionId = 'nonexistent-session-id';

        // Create signed cookie but don't store session
        const signedValue = await createSignedSessionValue(
          sessionId,
          TEST_SESSION_COOKIE_SECRET
        );

        const request = createMockRequest('http://localhost/', {
          headers: { Cookie: `${SESSION_COOKIE_NAME}=${signedValue}` },
        });

        const result = await sessionMiddleware({ request, env, ctx });

        // Session ID is valid but session data is null
        expect(result?.sessionId).toBe(sessionId);
        expect(result?.session).toBeNull();
      });
    });

    describe('Missing Configuration', () => {
      it('should return null session when SESSION_COOKIE_SECRET is missing', async () => {
        const env = {
          SESSIONS: createMockSessionsNamespace(),
          SESSION_COOKIE_SECRET: '',
        };
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/');

        const result = await sessionMiddleware({ request, env, ctx });

        expect(result?.session).toBeNull();
        expect(result?.sessionId).toBeNull();
      });
    });

    describe('Multiple Cookies', () => {
      it('should extract session cookie from multiple cookies', async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const sessionId = 'test-session-multi';
        const session = createValidSession();

        mockStorage.set(sessionId, session);

        const signedValue = await createSignedSessionValue(
          sessionId,
          TEST_SESSION_COOKIE_SECRET
        );

        const request = createMockRequest('http://localhost/', {
          headers: {
            Cookie: `other=value; ${SESSION_COOKIE_NAME}=${signedValue}; another=data`,
          },
        });

        const result = await sessionMiddleware({ request, env, ctx });

        expect(result?.session).toBeDefined();
        expect(result?.sessionId).toBe(sessionId);
      });
    });
  });

  describe('loadSession()', () => {
    it('should load session from Durable Object', async () => {
      const sessions = createMockSessionsNamespace();
      const sessionId = 'load-session-test';
      const session = createValidSession();

      mockStorage.set(sessionId, session);

      const result = await loadSession(sessionId, sessions);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(session.userId);
      expect(result?.email).toBe(session.email);
    });

    it('should return null for nonexistent session', async () => {
      const sessions = createMockSessionsNamespace();

      const result = await loadSession('nonexistent', sessions);

      expect(result).toBeNull();
    });
  });

  describe('saveSession()', () => {
    it('should save session to Durable Object', async () => {
      const sessions = createMockSessionsNamespace();
      const sessionId = 'save-session-test';
      const session = createValidSession();

      const result = await saveSession(sessionId, session, sessions);

      expect(result).toBe(true);
      expect(mockStorage.get(sessionId)).toEqual(session);
    });

    it('should overwrite existing session', async () => {
      const sessions = createMockSessionsNamespace();
      const sessionId = 'save-overwrite-test';
      const oldSession = createValidSession();
      const newSession = {
        ...createValidSession(),
        email: 'updated@example.com',
      };

      mockStorage.set(sessionId, oldSession);

      await saveSession(sessionId, newSession, sessions);

      const stored = mockStorage.get(sessionId) as SessionData;
      expect(stored.email).toBe('updated@example.com');
    });
  });

  describe('deleteSession()', () => {
    it('should delete session from Durable Object', async () => {
      const sessions = createMockSessionsNamespace();
      const sessionId = 'delete-session-test';
      const session = createValidSession();

      mockStorage.set(sessionId, session);
      expect(mockStorage.has(sessionId)).toBe(true);

      const result = await deleteSession(sessionId, sessions);

      expect(result).toBe(true);
      expect(mockStorage.has(sessionId)).toBe(false);
    });

    it('should return true even if session does not exist', async () => {
      const sessions = createMockSessionsNamespace();

      const result = await deleteSession('nonexistent', sessions);

      expect(result).toBe(true);
    });
  });
});

describe('Auth Interceptor', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  describe('isProtectedRoute()', () => {
    it('should return true for /app route', () => {
      expect(isProtectedRoute('/app')).toBe(true);
    });

    it('should return true for /app/* subroutes', () => {
      expect(isProtectedRoute('/app/')).toBe(true);
      expect(isProtectedRoute('/app/notes')).toBe(true);
      expect(isProtectedRoute('/app/settings')).toBe(true);
      expect(isProtectedRoute('/app/notes/123')).toBe(true);
    });

    it('should return false for non-protected routes', () => {
      expect(isProtectedRoute('/')).toBe(false);
      expect(isProtectedRoute('/login')).toBe(false);
      expect(isProtectedRoute('/logout')).toBe(false);
      expect(isProtectedRoute('/ui')).toBe(false);
      expect(isProtectedRoute('/health')).toBe(false);
    });

    it('should return false for routes that start with /app but are different', () => {
      expect(isProtectedRoute('/application')).toBe(false);
      expect(isProtectedRoute('/apps')).toBe(false);
      expect(isProtectedRoute('/appdata')).toBe(false);
    });

    it('should contain /app in PROTECTED_ROUTES constant', () => {
      expect(PROTECTED_ROUTES).toContain('/app');
    });
  });

  describe('createLoginRedirect()', () => {
    it('should redirect to login page', () => {
      const response = createLoginRedirect('http://localhost/app');

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain(LOGIN_PATH);
    });

    it('should preserve original URL in redirect parameter', () => {
      const response = createLoginRedirect('http://localhost/app/notes');
      const location = response.headers.get('Location');

      expect(location).toContain('redirect=');
      expect(location).toContain('%2Fapp%2Fnotes');
    });

    it('should preserve query parameters in redirect', () => {
      const response = createLoginRedirect(
        'http://localhost/app/notes?filter=active'
      );
      const location = response.headers.get('Location');

      expect(location).toContain('redirect=');
      expect(location).toContain('%2Fapp%2Fnotes%3Ffilter%3Dactive');
    });

    it('should not include redirect param when already on login page', () => {
      const response = createLoginRedirect('http://localhost/login');
      const location = response.headers.get('Location');

      expect(location).not.toContain('redirect=');
    });

    it('should have LOGIN_PATH constant set to /login', () => {
      expect(LOGIN_PATH).toBe('/login');
    });
  });

  describe('authInterceptor()', () => {
    describe('Protected Routes Without Session', () => {
      it('should redirect /app without session to /login', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/app');

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session: null,
          sessionId: null,
        };

        const result = authInterceptor(context);

        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(Response);
        expect(result?.status).toBe(302);
        expect(result?.headers.get('Location')).toContain('/login');
      });

      it('should redirect /app/subroute without session to /login', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/app/notes');

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session: null,
          sessionId: null,
        };

        const result = authInterceptor(context);

        expect(result).toBeDefined();
        expect(result?.status).toBe(302);
        expect(result?.headers.get('Location')).toContain('/login');
        expect(result?.headers.get('Location')).toContain('redirect=');
      });

      it('should preserve original URL in redirect', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/app/settings?tab=profile');

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session: null,
          sessionId: null,
        };

        const result = authInterceptor(context);
        const location = result?.headers.get('Location') || '';

        expect(location).toContain('%2Fapp%2Fsettings%3Ftab%3Dprofile');
      });
    });

    describe('Protected Routes With Session', () => {
      it('should allow access to /app with valid session', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/app');
        const session = createValidSession();

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session,
          sessionId: 'valid-session-id',
        };

        const result = authInterceptor(context);

        expect(result).toBeUndefined();
      });

      it('should allow access to /app subroutes with valid session', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/app/notes/123');
        const session = createValidSession();

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session,
          sessionId: 'valid-session-id',
        };

        const result = authInterceptor(context);

        expect(result).toBeUndefined();
      });
    });

    describe('Protected Routes With Invalid Session', () => {
      it('should redirect when session is missing userId', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/app');

        const invalidSession: SessionData = {
          userId: '',
          email: TEST_USER.email,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session: invalidSession,
          sessionId: 'session-id',
        };

        const result = authInterceptor(context);

        expect(result).toBeDefined();
        expect(result?.status).toBe(302);
      });

      it('should redirect when session is missing email', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/app');

        const invalidSession: SessionData = {
          userId: TEST_USER.userId,
          email: '',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session: invalidSession,
          sessionId: 'session-id',
        };

        const result = authInterceptor(context);

        expect(result).toBeDefined();
        expect(result?.status).toBe(302);
      });

      it('should redirect when session is expired', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/app');
        const expiredSession = createExpiredSession();

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session: expiredSession,
          sessionId: 'expired-session-id',
        };

        const result = authInterceptor(context);

        expect(result).toBeDefined();
        expect(result?.status).toBe(302);
      });
    });

    describe('Non-Protected Routes', () => {
      it('should allow access to / without session', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/');

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session: null,
          sessionId: null,
        };

        const result = authInterceptor(context);

        expect(result).toBeUndefined();
      });

      it('should allow access to /login without session', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/login');

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session: null,
          sessionId: null,
        };

        const result = authInterceptor(context);

        expect(result).toBeUndefined();
      });

      it('should allow access to /ui without session', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/ui');

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session: null,
          sessionId: null,
        };

        const result = authInterceptor(context);

        expect(result).toBeUndefined();
      });

      it('should allow access to /health without session', () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();
        const request = createMockRequest('http://localhost/health');

        const context: RequestContextWithSession = {
          request,
          env,
          ctx,
          session: null,
          sessionId: null,
        };

        const result = authInterceptor(context);

        expect(result).toBeUndefined();
      });
    });
  });

  describe('isAuthenticated()', () => {
    it('should return true for context with session and sessionId', () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();
      const request = createMockRequest('http://localhost/app');
      const session = createValidSession();

      const context: RequestContextWithSession = {
        request,
        env,
        ctx,
        session,
        sessionId: 'valid-session-id',
      };

      expect(isAuthenticated(context)).toBe(true);
    });

    it('should return false for context with null session', () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();
      const request = createMockRequest('http://localhost/app');

      const context: RequestContextWithSession = {
        request,
        env,
        ctx,
        session: null,
        sessionId: 'session-id',
      };

      expect(isAuthenticated(context)).toBe(false);
    });

    it('should return false for context with null sessionId', () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();
      const request = createMockRequest('http://localhost/app');
      const session = createValidSession();

      const context: RequestContextWithSession = {
        request,
        env,
        ctx,
        session,
        sessionId: null,
      };

      expect(isAuthenticated(context)).toBe(false);
    });

    it('should return false for context with both null', () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();
      const request = createMockRequest('http://localhost/app');

      const context: RequestContextWithSession = {
        request,
        env,
        ctx,
        session: null,
        sessionId: null,
      };

      expect(isAuthenticated(context)).toBe(false);
    });
  });

  describe('getAuthenticatedUser()', () => {
    it('should return user info for authenticated context', () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();
      const request = createMockRequest('http://localhost/app');
      const session = createValidSession();

      const context: RequestContextWithSession = {
        request,
        env,
        ctx,
        session,
        sessionId: 'valid-session-id',
      };

      const user = getAuthenticatedUser(context);

      expect(user).toBeDefined();
      expect(user?.userId).toBe(TEST_USER.userId);
      expect(user?.email).toBe(TEST_USER.email);
    });

    it('should return null for unauthenticated context', () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();
      const request = createMockRequest('http://localhost/app');

      const context: RequestContextWithSession = {
        request,
        env,
        ctx,
        session: null,
        sessionId: null,
      };

      const user = getAuthenticatedUser(context);

      expect(user).toBeNull();
    });
  });

  describe('requireAuth()', () => {
    it('should call handler for authenticated context', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();
      const request = createMockRequest('http://localhost/app');
      const session = createValidSession();

      const context: RequestContextWithSession = {
        request,
        env,
        ctx,
        session,
        sessionId: 'valid-session-id',
      };

      const mockHandler = vi.fn(() => {
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const wrappedHandler = requireAuth(mockHandler);
      const response = await wrappedHandler(context);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ success: true });
    });

    it('should return 401 for unauthenticated context', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();
      const request = createMockRequest('http://localhost/app');

      const context: RequestContextWithSession = {
        request,
        env,
        ctx,
        session: null,
        sessionId: null,
      };

      const mockHandler = vi.fn(() => {
        return new Response(JSON.stringify({ success: true }));
      });

      const wrappedHandler = requireAuth(mockHandler);
      const response = await wrappedHandler(context);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return JSON content type for 401 response', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();
      const request = createMockRequest('http://localhost/app');

      const context: RequestContextWithSession = {
        request,
        env,
        ctx,
        session: null,
        sessionId: null,
      };

      const wrappedHandler = requireAuth(() => new Response('OK'));
      const response = await wrappedHandler(context);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });
});

describe('Session and Auth Integration', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  it('should allow authenticated user through full middleware pipeline', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();
    const sessionId = 'integration-test-session';
    const session = createValidSession();

    // Store session
    mockStorage.set(sessionId, session);

    // Create signed cookie
    const signedValue = await createSignedSessionValue(
      sessionId,
      TEST_SESSION_COOKIE_SECRET
    );

    // Simulate incoming request to protected route
    const request = createMockRequest('http://localhost/app', {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${signedValue}` },
    });

    // Run session middleware
    const sessionResult = await sessionMiddleware({ request, env, ctx });

    expect(sessionResult).toBeDefined();
    expect(sessionResult?.session).toBeDefined();
    expect(sessionResult?.sessionId).toBe(sessionId);

    // Run auth interceptor
    const authResult = authInterceptor(sessionResult!);

    // Should allow through (return undefined)
    expect(authResult).toBeUndefined();
  });

  it('should block unauthenticated user at auth interceptor', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    // Request to protected route without cookie
    const request = createMockRequest('http://localhost/app');

    // Run session middleware
    const sessionResult = await sessionMiddleware({ request, env, ctx });

    expect(sessionResult?.session).toBeNull();
    expect(sessionResult?.sessionId).toBeNull();

    // Run auth interceptor
    const authResult = authInterceptor(sessionResult!);

    // Should redirect to login
    expect(authResult).toBeDefined();
    expect(authResult?.status).toBe(302);
    expect(authResult?.headers.get('Location')).toContain('/login');
  });

  it('should allow unauthenticated user to access public routes', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    // Request to public route without cookie
    const request = createMockRequest('http://localhost/');

    // Run session middleware
    const sessionResult = await sessionMiddleware({ request, env, ctx });

    expect(sessionResult?.session).toBeNull();

    // Run auth interceptor
    const authResult = authInterceptor(sessionResult!);

    // Should allow through
    expect(authResult).toBeUndefined();
  });
});
