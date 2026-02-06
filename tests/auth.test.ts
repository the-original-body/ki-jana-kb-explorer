/**
 * Authentication Flow Tests
 *
 * Tests for authentication server functions:
 * - login(): Validates credentials and creates session
 * - logout(): Deletes session and returns clear cookie
 * - getDemoCredentials(): Returns demo user info
 *
 * Security validations:
 * - Valid credentials create session with cookie
 * - Invalid credentials return error without session
 * - Session cookies have HttpOnly, Secure, SameSite=Strict flags
 * - Generic error messages prevent user enumeration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  login,
  logout,
  getDemoCredentials,
} from '@/server/auth';
import {
  signValue,
  verifySignature,
  generateSessionId,
  createSessionCookie,
  createClearSessionCookie,
  parseCookies,
  getCookie,
  createCookieHeader,
  parseSignedSessionValue,
  createSignedSessionValue,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRATION_DAYS,
} from '@/middleware/session';
import {
  createMockRequest,
  createMockFormData,
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
function createMockEnv() {
  return {
    SESSIONS: createMockSessionsNamespace(),
    SESSION_COOKIE_SECRET: TEST_SESSION_COOKIE_SECRET,
    DEMO_USER_EMAIL: TEST_USER.email,
    DEMO_USER_PASSWORD: TEST_USER.password,
  };
}

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    mockStorage.clear();
    vi.clearAllMocks();
  });

  describe('login()', () => {
    describe('Valid Credentials', () => {
      it('should return success for valid demo user credentials', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: TEST_USER.email,
          password: TEST_USER.password,
        });

        const result = await login(formData, env);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.sessionCookie).toBeDefined();
        expect(result.redirectTo).toBe('/app');
      });

      it('should return success for valid demo user credentials', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: TEST_USER.email,
          password: TEST_USER.password,
        });

        const result = await login(formData, env);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.sessionCookie).toBeDefined();
      });

      it('should create session cookie with security flags', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: TEST_USER.email,
          password: TEST_USER.password,
        });

        const result = await login(formData, env);

        expect(result.sessionCookie).toContain('HttpOnly');
        expect(result.sessionCookie).toContain('Secure');
        expect(result.sessionCookie).toContain('SameSite=Strict');
      });

      it('should handle case-insensitive email', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: TEST_USER.email.toUpperCase(),
          password: TEST_USER.password,
        });

        const result = await login(formData, env);

        expect(result.success).toBe(true);
      });

      it('should trim whitespace from email', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: `  ${TEST_USER.email}  `,
          password: TEST_USER.password,
        });

        const result = await login(formData, env);

        expect(result.success).toBe(true);
      });

      it('should use custom redirect URL if provided', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: TEST_USER.email,
          password: TEST_USER.password,
          redirect: '/dashboard',
        });

        const result = await login(formData, env);

        expect(result.success).toBe(true);
        expect(result.redirectTo).toBe('/dashboard');
      });

      it('should store session in Durable Object', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: TEST_USER.email,
          password: TEST_USER.password,
        });

        await login(formData, env);

        // Verify session was stored
        expect(mockStorage.size).toBe(1);
        const storedSession = Array.from(mockStorage.values())[0] as Record<string, unknown>;
        expect(storedSession.email).toBe(TEST_USER.email);
        expect(storedSession.userId).toBeDefined();
        expect(storedSession.createdAt).toBeDefined();
        expect(storedSession.expiresAt).toBeDefined();
      });
    });

    describe('Invalid Credentials', () => {
      it('should return error for wrong password', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: TEST_USER.email,
          password: 'wrongpassword',
        });

        const result = await login(formData, env);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid email or password');
        expect(result.sessionCookie).toBeUndefined();
      });

      it('should return error for non-existent user', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        });

        const result = await login(formData, env);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid email or password');
        expect(result.sessionCookie).toBeUndefined();
      });

      it('should return same error message for wrong email and password (prevent enumeration)', async () => {
        const env = createMockEnv();
        const wrongPasswordData = createMockFormData({
          email: TEST_USER.email,
          password: 'wrongpassword',
        });
        const wrongEmailData = createMockFormData({
          email: 'nonexistent@example.com',
          password: TEST_USER.password,
        });

        const wrongPasswordResult = await login(wrongPasswordData, env);
        const wrongEmailResult = await login(wrongEmailData, env);

        // Both should have the same generic error message
        expect(wrongPasswordResult.error).toBe(wrongEmailResult.error);
        expect(wrongPasswordResult.error).toBe('Invalid email or password');
      });
    });

    describe('Input Validation', () => {
      it('should return error for missing email', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          password: TEST_USER.password,
        });

        const result = await login(formData, env);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should return error for missing password', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: TEST_USER.email,
        });

        const result = await login(formData, env);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should return error for invalid email format', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: 'invalidemail',
          password: TEST_USER.password,
        });

        const result = await login(formData, env);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Please enter a valid email address');
      });

      it('should return error for password too short', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: TEST_USER.email,
          password: '123',
        });

        const result = await login(formData, env);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Password must be at least 4 characters');
      });

      it('should return error for empty email', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: '',
          password: TEST_USER.password,
        });

        const result = await login(formData, env);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Please enter a valid email address');
      });

      it('should return error for empty password', async () => {
        const env = createMockEnv();
        const formData = createMockFormData({
          email: TEST_USER.email,
          password: '',
        });

        const result = await login(formData, env);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Password must be at least 4 characters');
      });
    });

    describe('Server Configuration', () => {
      it('should return error when SESSION_COOKIE_SECRET is missing', async () => {
        const env = {
          SESSIONS: createMockSessionsNamespace(),
          SESSION_COOKIE_SECRET: '',
          DEMO_USER_EMAIL: TEST_USER.email,
          DEMO_USER_PASSWORD: TEST_USER.password,
        };
        const formData = createMockFormData({
          email: TEST_USER.email,
          password: TEST_USER.password,
        });

        const result = await login(formData, env);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Server configuration error');
      });
    });
  });

  describe('logout()', () => {
    it('should return success with clear cookie', async () => {
      const env = createMockEnv();
      const sessionId = 'test-session-id';

      // First, store a session
      mockStorage.set(sessionId, {
        userId: 'user_1',
        email: TEST_USER.email,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const result = await logout(sessionId, env);

      expect(result.success).toBe(true);
      expect(result.clearCookie).toBeDefined();
      expect(result.redirectTo).toBe('/');
    });

    it('should delete session from Durable Object', async () => {
      const env = createMockEnv();
      const sessionId = 'test-session-id';

      // First, store a session
      mockStorage.set(sessionId, {
        userId: 'user_1',
        email: TEST_USER.email,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(mockStorage.has(sessionId)).toBe(true);

      await logout(sessionId, env);

      expect(mockStorage.has(sessionId)).toBe(false);
    });

    it('should return clear cookie with Max-Age=0', async () => {
      const env = createMockEnv();
      const result = await logout('test-session-id', env);

      expect(result.clearCookie).toContain('Max-Age=0');
    });

    it('should return clear cookie with security flags', async () => {
      const env = createMockEnv();
      const result = await logout('test-session-id', env);

      expect(result.clearCookie).toContain('HttpOnly');
      expect(result.clearCookie).toContain('Secure');
      expect(result.clearCookie).toContain('SameSite=Strict');
    });

    it('should handle null sessionId gracefully', async () => {
      const env = createMockEnv();
      const result = await logout(null, env);

      expect(result.success).toBe(true);
      expect(result.clearCookie).toBeDefined();
      expect(result.redirectTo).toBe('/');
    });

    it('should succeed even if session does not exist', async () => {
      const env = createMockEnv();
      const result = await logout('nonexistent-session', env);

      expect(result.success).toBe(true);
      expect(result.clearCookie).toBeDefined();
    });
  });

  describe('getDemoCredentials()', () => {
    it('should return array of demo credentials when env is configured', () => {
      const env = createMockEnv();
      const credentials = getDemoCredentials(env);

      expect(Array.isArray(credentials)).toBe(true);
      expect(credentials.length).toBeGreaterThan(0);
    });

    it('should include demo user credentials from env', () => {
      const env = createMockEnv();
      const credentials = getDemoCredentials(env);

      const demoUser = credentials.find((c) => c.email === TEST_USER.email);
      expect(demoUser).toBeDefined();
      expect(demoUser?.password).toBe(TEST_USER.password);
    });

    it('should return empty array when env credentials not configured', () => {
      const env = {
        SESSIONS: createMockSessionsNamespace(),
        SESSION_COOKIE_SECRET: TEST_SESSION_COOKIE_SECRET,
        // No DEMO_USER_EMAIL or DEMO_USER_PASSWORD
      };
      const credentials = getDemoCredentials(env);

      expect(Array.isArray(credentials)).toBe(true);
      expect(credentials.length).toBe(0);
    });

    it('should return credentials with email and password fields', () => {
      const env = createMockEnv();
      const credentials = getDemoCredentials(env);

      for (const cred of credentials) {
        expect(cred).toHaveProperty('email');
        expect(cred).toHaveProperty('password');
        expect(typeof cred.email).toBe('string');
        expect(typeof cred.password).toBe('string');
      }
    });
  });
});

describe('Session Cookie Utilities', () => {
  describe('signValue() and verifySignature()', () => {
    it('should sign and verify a value', async () => {
      const value = 'test-session-id';
      const signature = await signValue(value, TEST_SESSION_COOKIE_SECRET);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');

      const isValid = await verifySignature(value, signature, TEST_SESSION_COOKIE_SECRET);
      expect(isValid).toBe(true);
    });

    it('should reject tampered signature', async () => {
      const value = 'test-session-id';
      const signature = await signValue(value, TEST_SESSION_COOKIE_SECRET);

      // Tamper with the signature
      const tamperedSignature = signature.slice(0, -1) + 'X';

      const isValid = await verifySignature(value, tamperedSignature, TEST_SESSION_COOKIE_SECRET);
      expect(isValid).toBe(false);
    });

    it('should reject tampered value', async () => {
      const value = 'test-session-id';
      const signature = await signValue(value, TEST_SESSION_COOKIE_SECRET);

      const isValid = await verifySignature('tampered-value', signature, TEST_SESSION_COOKIE_SECRET);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', async () => {
      const value = 'test-session-id';
      const signature = await signValue(value, TEST_SESSION_COOKIE_SECRET);

      const isValid = await verifySignature(value, signature, 'wrong-secret-key-at-least-32-characters');
      expect(isValid).toBe(false);
    });
  });

  describe('generateSessionId()', () => {
    it('should generate a session ID', () => {
      const sessionId = generateSessionId();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should generate unique session IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(100);
    });
  });

  describe('createSignedSessionValue() and parseSignedSessionValue()', () => {
    it('should create and parse signed session value', async () => {
      const sessionId = 'test-session-id';
      const signedValue = await createSignedSessionValue(sessionId, TEST_SESSION_COOKIE_SECRET);

      expect(signedValue).toContain(sessionId);
      expect(signedValue).toContain('.');

      const parsedId = await parseSignedSessionValue(signedValue, TEST_SESSION_COOKIE_SECRET);
      expect(parsedId).toBe(sessionId);
    });

    it('should return null for invalid signed value format', async () => {
      const parsedId = await parseSignedSessionValue('no-separator', TEST_SESSION_COOKIE_SECRET);
      expect(parsedId).toBeNull();
    });

    it('should return null for tampered value', async () => {
      const sessionId = 'test-session-id';
      const signedValue = await createSignedSessionValue(sessionId, TEST_SESSION_COOKIE_SECRET);

      // Tamper with the session ID
      const tamperedValue = signedValue.replace(sessionId, 'tampered-id');

      const parsedId = await parseSignedSessionValue(tamperedValue, TEST_SESSION_COOKIE_SECRET);
      expect(parsedId).toBeNull();
    });
  });

  describe('createSessionCookie()', () => {
    it('should create cookie with session name', async () => {
      const sessionId = 'test-session-id';
      const cookie = await createSessionCookie(sessionId, TEST_SESSION_COOKIE_SECRET);

      expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    });

    it('should include security flags', async () => {
      const sessionId = 'test-session-id';
      const cookie = await createSessionCookie(sessionId, TEST_SESSION_COOKIE_SECRET);

      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('should include Max-Age', async () => {
      const sessionId = 'test-session-id';
      const cookie = await createSessionCookie(sessionId, TEST_SESSION_COOKIE_SECRET);

      expect(cookie).toContain('Max-Age=');
    });

    it('should include Path=/', async () => {
      const sessionId = 'test-session-id';
      const cookie = await createSessionCookie(sessionId, TEST_SESSION_COOKIE_SECRET);

      expect(cookie).toContain('Path=/');
    });
  });

  describe('createClearSessionCookie()', () => {
    it('should create cookie with Max-Age=0', () => {
      const cookie = createClearSessionCookie();

      expect(cookie).toContain('Max-Age=0');
    });

    it('should include security flags', () => {
      const cookie = createClearSessionCookie();

      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('should have empty value', () => {
      const cookie = createClearSessionCookie();

      expect(cookie).toContain(`${SESSION_COOKIE_NAME}=;`);
    });
  });

  describe('parseCookies()', () => {
    it('should parse single cookie', () => {
      const cookies = parseCookies('name=value');

      expect(cookies.name).toBe('value');
    });

    it('should parse multiple cookies', () => {
      const cookies = parseCookies('name1=value1; name2=value2; name3=value3');

      expect(cookies.name1).toBe('value1');
      expect(cookies.name2).toBe('value2');
      expect(cookies.name3).toBe('value3');
    });

    it('should handle cookies with = in value', () => {
      const cookies = parseCookies('name=value=with=equals');

      expect(cookies.name).toBe('value=with=equals');
    });

    it('should return empty object for null header', () => {
      const cookies = parseCookies(null);

      expect(cookies).toEqual({});
    });

    it('should return empty object for empty header', () => {
      const cookies = parseCookies('');

      expect(cookies).toEqual({});
    });
  });

  describe('getCookie()', () => {
    it('should get cookie from request', () => {
      const request = createMockRequest('http://localhost/test', {
        headers: { Cookie: 'session=abc123; other=value' },
      });

      const value = getCookie(request, 'session');

      expect(value).toBe('abc123');
    });

    it('should return null for missing cookie', () => {
      const request = createMockRequest('http://localhost/test', {
        headers: { Cookie: 'other=value' },
      });

      const value = getCookie(request, 'session');

      expect(value).toBeNull();
    });

    it('should return null when no Cookie header', () => {
      const request = createMockRequest('http://localhost/test');

      const value = getCookie(request, 'session');

      expect(value).toBeNull();
    });
  });

  describe('createCookieHeader()', () => {
    it('should create cookie header with name and value', () => {
      const header = createCookieHeader('name', 'value');

      expect(header).toContain('name=value');
    });

    it('should include all options', () => {
      const header = createCookieHeader('name', 'value', {
        maxAge: 3600,
        path: '/app',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
      });

      expect(header).toContain('Max-Age=3600');
      expect(header).toContain('Path=/app');
      expect(header).toContain('Secure');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Strict');
    });

    it('should use default secure options', () => {
      const header = createCookieHeader('name', 'value');

      expect(header).toContain('Secure');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Strict');
      expect(header).toContain('Path=/');
    });
  });
});

describe('Session Constants', () => {
  it('should have correct session cookie name', () => {
    expect(SESSION_COOKIE_NAME).toBe('session');
  });

  it('should have reasonable expiration days', () => {
    expect(SESSION_EXPIRATION_DAYS).toBeGreaterThan(0);
    expect(SESSION_EXPIRATION_DAYS).toBeLessThanOrEqual(30);
  });
});
