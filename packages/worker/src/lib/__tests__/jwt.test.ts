import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../env.js', () => ({}));

import { createToken, verifyToken } from '../jwt.js';

describe('jwt', () => {
  const secret = 'test-secret-key-for-testing';
  const payload = {
    sub: 'user-123',
    username: 'testuser',
    avatarUrl: 'https://example.com/avatar.png',
  };

  describe('createToken', () => {
    it('produces 3-part JWT string (split by ".")', async () => {
      const token = await createToken(payload, secret);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('header is {"alg":"HS256","typ":"JWT"}', async () => {
      const token = await createToken(payload, secret);
      const [headerB64] = token.split('.');
      const headerJson = Buffer.from(headerB64, 'base64url').toString('utf8');
      const header = JSON.parse(headerJson);
      expect(header).toEqual({ alg: 'HS256', typ: 'JWT' });
    });

    it('payload includes iat and exp', async () => {
      const token = await createToken(payload, secret);
      const [, payloadB64] = token.split('.');
      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const decoded = JSON.parse(payloadJson);
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
      expect(typeof decoded.iat).toBe('number');
      expect(typeof decoded.exp).toBe('number');
    });

    it('with custom expiresInSec → exp - iat === expiresInSec', async () => {
      const expiresInSec = 3600;
      const token = await createToken(payload, secret, expiresInSec);
      const [, payloadB64] = token.split('.');
      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const decoded = JSON.parse(payloadJson);
      expect(decoded.exp - decoded.iat).toBe(expiresInSec);
    });

    it('default expiry is 7 days (604800)', async () => {
      const token = await createToken(payload, secret);
      const [, payloadB64] = token.split('.');
      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const decoded = JSON.parse(payloadJson);
      expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
    });

    it('iat is close to Date.now()/1000', async () => {
      const before = Math.floor(Date.now() / 1000);
      const token = await createToken(payload, secret);
      const after = Math.floor(Date.now() / 1000);
      const [, payloadB64] = token.split('.');
      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const decoded = JSON.parse(payloadJson);
      expect(decoded.iat).toBeGreaterThanOrEqual(before);
      expect(decoded.iat).toBeLessThanOrEqual(after);
    });
  });

  describe('verifyToken', () => {
    it('valid token → returns payload', async () => {
      const token = await createToken(payload, secret);
      const result = await verifyToken(token, secret);
      expect(result).not.toBeNull();
      expect(result?.sub).toBe(payload.sub);
      expect(result?.username).toBe(payload.username);
      expect(result?.avatarUrl).toBe(payload.avatarUrl);
    });

    it('expired token → null', async () => {
      const token = await createToken(payload, secret, -1);
      const result = await verifyToken(token, secret);
      expect(result).toBeNull();
    });

    it('wrong secret → null', async () => {
      const token = await createToken(payload, secret);
      const result = await verifyToken(token, 'wrong-secret');
      expect(result).toBeNull();
    });

    it('tampered payload → null', async () => {
      const token = await createToken(payload, secret);
      const parts = token.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ ...payload, sub: 'hacked', iat: 0, exp: 9999999999 }),
      ).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      const result = await verifyToken(tamperedToken, secret);
      expect(result).toBeNull();
    });

    it('malformed token → null', async () => {
      const result = await verifyToken('not-a-valid-jwt', secret);
      expect(result).toBeNull();
    });

    it('2-part token → null', async () => {
      const result = await verifyToken('header.payload', secret);
      expect(result).toBeNull();
    });

    it('round-trip: create → verify → original payload fields match', async () => {
      const token = await createToken(payload, secret);
      const result = await verifyToken(token, secret);
      expect(result).not.toBeNull();
      expect(result?.sub).toBe(payload.sub);
      expect(result?.username).toBe(payload.username);
      expect(result?.avatarUrl).toBe(payload.avatarUrl);
      expect(result?.iat).toBeDefined();
      expect(result?.exp).toBeDefined();
    });
  });
});
