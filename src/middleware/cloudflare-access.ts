/**
 * Cloudflare Access JWT Validation Middleware
 *
 * This middleware validates JWTs from Cloudflare Access for internal apps:
 * - Extracts JWT from `Cf-Access-Jwt-Assertion` header
 * - Validates JWT signature against Cloudflare's JWKS endpoint
 * - Verifies audience and expiration claims
 * - Adds user info to request context
 *
 * Security features:
 * - RS256 signature verification using Web Crypto API
 * - Audience validation prevents token reuse across apps
 * - Expiration checking prevents replay attacks
 * - JWKS caching reduces latency
 *
 * @see https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

/**
 * Cloudflare Access user info extracted from JWT
 */
export interface AccessUser {
  /** User's email address from Cloudflare Access */
  email: string;
  /** User's name (if available) */
  name?: string;
  /** JWT subject (usually same as email) */
  sub?: string;
  /** Identity provider used */
  identityProvider?: string;
}

/**
 * Environment bindings required for Cloudflare Access validation
 */
export interface CloudflareAccessEnv {
  /** Cloudflare Access team name (e.g., "tobag") */
  CF_ACCESS_TEAM_NAME: string;
  /** Cloudflare Access application audience tag */
  CF_ACCESS_AUD: string;
}

/**
 * JWKS key structure from Cloudflare Access
 */
interface JWK {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  e: string;
  n: string;
}

/**
 * JWKS response structure from Cloudflare Access
 */
interface JWKS {
  keys: JWK[];
}

/**
 * JWT header structure
 */
interface JWTHeader {
  alg: string;
  kid: string;
  typ?: string;
}

/**
 * JWT payload structure from Cloudflare Access
 */
interface JWTPayload {
  aud: string[];
  email: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  name?: string;
  identity_nonce?: string;
  custom?: Record<string, unknown>;
}

// JWKS cache - keys don't change often
let jwksCache: { keys: Map<string, CryptoKey>; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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
 * Decodes a base64url string to UTF-8 string
 */
function base64UrlDecodeString(str: string): string {
  const buffer = base64UrlDecode(str);
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Parses a JWT into its components without verification
 */
function parseJWT(token: string): { header: JWTHeader; payload: JWTPayload; signature: ArrayBuffer } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: expected 3 parts');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Invalid JWT format: missing parts');
  }

  try {
    const header = JSON.parse(base64UrlDecodeString(headerB64)) as JWTHeader;
    const payload = JSON.parse(base64UrlDecodeString(payloadB64)) as JWTPayload;
    const signature = base64UrlDecode(signatureB64);

    return { header, payload, signature };
  } catch {
    throw new Error('Invalid JWT format: failed to parse');
  }
}

/**
 * Imports a JWK as a CryptoKey for RS256 verification
 */
async function importJWK(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
      alg: jwk.alg,
      use: jwk.use,
    },
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  );
}

/**
 * Fetches and caches JWKS from Cloudflare Access
 */
async function getJWKS(teamName: string): Promise<Map<string, CryptoKey>> {
  const now = Date.now();

  // Return cached keys if still valid
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }

  const jwksUrl = `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`;

  const response = await fetch(jwksUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
  }

  const jwks = (await response.json()) as JWKS;

  // Import all keys
  const keys = new Map<string, CryptoKey>();
  for (const jwk of jwks.keys) {
    try {
      const cryptoKey = await importJWK(jwk);
      keys.set(jwk.kid, cryptoKey);
    } catch (error) {
      // Skip keys that fail to import (e.g., unsupported algorithms)
      console.warn(`Failed to import JWK ${jwk.kid}:`, error);
    }
  }

  // Update cache
  jwksCache = { keys, fetchedAt: now };

  return keys;
}

/**
 * Verifies a JWT signature using RS256
 */
async function verifyJWTSignature(
  token: string,
  header: JWTHeader,
  signature: ArrayBuffer,
  keys: Map<string, CryptoKey>
): Promise<boolean> {
  // Get the signing key by kid
  const key = keys.get(header.kid);
  if (!key) {
    throw new Error(`No matching key found for kid: ${header.kid}`);
  }

  // Verify algorithm
  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported algorithm: ${header.alg}, expected RS256`);
  }

  // Get the signed data (header.payload)
  const signedData = token.substring(0, token.lastIndexOf('.'));
  const encoder = new TextEncoder();
  const data = encoder.encode(signedData);

  // Verify signature
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
}

/**
 * Validates JWT claims
 */
function validateClaims(payload: JWTPayload, expectedAud: string): void {
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('JWT has expired');
  }

  // Check audience
  if (!payload.aud.includes(expectedAud)) {
    throw new Error(`Invalid audience: expected ${expectedAud}, got ${payload.aud.join(', ')}`);
  }

  // Check email is present
  if (!payload.email) {
    throw new Error('JWT missing email claim');
  }
}

/**
 * Validates a Cloudflare Access JWT and returns user info
 *
 * @param token - The JWT from Cf-Access-Jwt-Assertion header
 * @param env - Environment with CF_ACCESS_TEAM_NAME and CF_ACCESS_AUD
 * @returns User info extracted from the validated JWT
 * @throws Error if validation fails
 */
export async function validateAccessJWT(
  token: string,
  env: CloudflareAccessEnv
): Promise<AccessUser> {
  // Parse JWT
  const { header, payload, signature } = parseJWT(token);

  // Fetch JWKS
  const keys = await getJWKS(env.CF_ACCESS_TEAM_NAME);

  // Verify signature
  const isValid = await verifyJWTSignature(token, header, signature, keys);
  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }

  // Validate claims
  validateClaims(payload, env.CF_ACCESS_AUD);

  // Return user info
  return {
    email: payload.email,
    name: payload.name,
    sub: payload.sub,
  };
}

/**
 * Cloudflare Access middleware result
 */
export interface CloudflareAccessResult {
  /** Authenticated user from Cloudflare Access (null if no Access header) */
  accessUser: AccessUser | null;
}

/**
 * Cloudflare Access authentication middleware
 *
 * Validates the Cf-Access-Jwt-Assertion header if present.
 * If the header is not present (e.g., local development), skips validation.
 * If the header is present but invalid, throws an error.
 *
 * @param request - The incoming request
 * @param env - Environment bindings
 * @returns Object with accessUser (null if no Access header)
 */
export async function cloudflareAccessMiddleware(
  request: Request,
  env: CloudflareAccessEnv
): Promise<CloudflareAccessResult> {
  const accessJWT = request.headers.get('Cf-Access-Jwt-Assertion');

  // No Access header - skip validation (allows local dev)
  if (!accessJWT) {
    return { accessUser: null };
  }

  // Validate the JWT
  try {
    const accessUser = await validateAccessJWT(accessJWT, env);
    return { accessUser };
  } catch (error) {
    // Log the error for debugging but return a generic error to the client
    console.error('Cloudflare Access JWT validation failed:', error);
    throw new Error('Access denied: Invalid authentication');
  }
}

/**
 * Express-style middleware wrapper for cloudflareAccessMiddleware
 * Can be used as a route handler that validates Access and continues
 */
export function requireCloudflareAccess(
  env: CloudflareAccessEnv
): (request: Request) => Promise<Response | void> {
  return async (request: Request): Promise<Response | void> => {
    const { accessUser } = await cloudflareAccessMiddleware(request, env);

    if (!accessUser) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare Access authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Continue to next handler (return void/undefined)
    return;
  };
}
