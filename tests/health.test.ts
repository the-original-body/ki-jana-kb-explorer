/**
 * Health Endpoint Tests
 *
 * Tests for the /health endpoint which returns JSON with application status.
 * Verifies:
 * - Response status 200
 * - JSON structure { ok, env, gitSha, buildTime }
 * - All fields are non-empty
 * - Correct content-type headers
 * - Cache control headers
 */

import { describe, it, expect } from 'vitest';
import { healthHandler, type HealthResponse } from '@/routes/health';
import { parseJsonResponse } from './setup';

describe('Health Endpoint (/health)', () => {
  describe('Response Status', () => {
    it('should return 200 status code', () => {
      const response = healthHandler();
      expect(response.status).toBe(200);
    });
  });

  describe('Response Headers', () => {
    it('should return application/json content-type', () => {
      const response = healthHandler();
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should set no-cache headers', () => {
      const response = healthHandler();

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('must-revalidate');
    });
  });

  describe('Response Body Structure', () => {
    it('should return valid JSON', async () => {
      const response = healthHandler();
      const body = await parseJsonResponse<HealthResponse>(response);

      expect(body).toBeDefined();
      expect(typeof body).toBe('object');
    });

    it('should contain all required fields', async () => {
      const response = healthHandler();
      const body = await parseJsonResponse<HealthResponse>(response);

      expect(body).toHaveProperty('ok');
      expect(body).toHaveProperty('env');
      expect(body).toHaveProperty('gitSha');
      expect(body).toHaveProperty('buildTime');
    });

    it('should have correct field types', async () => {
      const response = healthHandler();
      const body = await parseJsonResponse<HealthResponse>(response);

      expect(typeof body.ok).toBe('boolean');
      expect(typeof body.env).toBe('string');
      expect(typeof body.gitSha).toBe('string');
      expect(typeof body.buildTime).toBe('string');
    });
  });

  describe('Response Field Values', () => {
    it('should have ok field set to true', async () => {
      const response = healthHandler();
      const body = await parseJsonResponse<HealthResponse>(response);

      expect(body.ok).toBe(true);
    });

    it('should return environment string', async () => {
      const response = healthHandler();
      const body = await parseJsonResponse<HealthResponse>(response);

      // Default is 'development' when globalThis.__ENV_ENVIRONMENT__ is not set
      expect(body.env).toBe('development');
    });

    it('should return gitSha (non-empty)', async () => {
      const response = healthHandler();
      const body = await parseJsonResponse<HealthResponse>(response);

      // gitSha should be defined (either from build-time constant or 'unknown')
      expect(body.gitSha).toBeDefined();
      expect(body.gitSha.length).toBeGreaterThan(0);
    });

    it('should return buildTime (non-empty)', async () => {
      const response = healthHandler();
      const body = await parseJsonResponse<HealthResponse>(response);

      // buildTime should be defined (either from build-time constant or 'unknown')
      expect(body.buildTime).toBeDefined();
      expect(body.buildTime.length).toBeGreaterThan(0);
    });
  });

  describe('Response Consistency', () => {
    it('should produce idempotent responses', async () => {
      const response1 = healthHandler();
      const response2 = healthHandler();

      const body1 = await parseJsonResponse<HealthResponse>(response1);
      const body2 = await parseJsonResponse<HealthResponse>(response2);

      expect(body1.ok).toBe(body2.ok);
      expect(body1.env).toBe(body2.env);
      expect(body1.gitSha).toBe(body2.gitSha);
      expect(body1.buildTime).toBe(body2.buildTime);
    });
  });
});
