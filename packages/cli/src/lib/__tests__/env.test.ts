import { describe, it, expect } from 'vitest';
import { stripSensitiveEnv, SENSITIVE_ENV_PREFIXES } from '../env.js';

describe('stripSensitiveEnv', () => {
  it('strips AWS_SECRET_ACCESS_KEY', () => {
    const env = { AWS_SECRET_ACCESS_KEY: 'secret123', HOME: '/home/user' };
    const result = stripSensitiveEnv(env);
    expect(result).not.toHaveProperty('AWS_SECRET_ACCESS_KEY');
    expect(result).toHaveProperty('HOME', '/home/user');
  });

  it('strips GITHUB_TOKEN', () => {
    const env = { GITHUB_TOKEN: 'ghp_xxx', PATH: '/usr/bin' };
    const result = stripSensitiveEnv(env);
    expect(result).not.toHaveProperty('GITHUB_TOKEN');
    expect(result).toHaveProperty('PATH', '/usr/bin');
  });

  it('strips OPENAI_API_KEY', () => {
    const env = { OPENAI_API_KEY: 'sk-xxx', TERM: 'xterm' };
    const result = stripSensitiveEnv(env);
    expect(result).not.toHaveProperty('OPENAI_API_KEY');
    expect(result).toHaveProperty('TERM', 'xterm');
  });

  it('strips ANTHROPIC_API_KEY', () => {
    const env = { ANTHROPIC_API_KEY: 'sk-ant-xxx', USER: 'testuser' };
    const result = stripSensitiveEnv(env);
    expect(result).not.toHaveProperty('ANTHROPIC_API_KEY');
    expect(result).toHaveProperty('USER', 'testuser');
  });

  it('handles case-insensitive matching via toUpperCase', () => {
    const env = { github_token: 'ghp_xxx', Openai_Api_Key: 'sk-xxx' };
    const result = stripSensitiveEnv(env);
    expect(result).not.toHaveProperty('github_token');
    expect(result).not.toHaveProperty('Openai_Api_Key');
  });

  it('keeps safe environment variables', () => {
    const env = { HOME: '/home/user', PATH: '/usr/bin', TERM: 'xterm-256color' };
    const result = stripSensitiveEnv(env);
    expect(result).toHaveProperty('HOME', '/home/user');
    expect(result).toHaveProperty('PATH', '/usr/bin');
    expect(result).toHaveProperty('TERM', 'xterm-256color');
  });

  it('skips undefined values', () => {
    const env = { HOME: '/home/user', UNDEFINED_VAR: undefined, PATH: '/usr/bin' };
    const result = stripSensitiveEnv(env);
    expect(result).toHaveProperty('HOME', '/home/user');
    expect(result).toHaveProperty('PATH', '/usr/bin');
    expect(result).not.toHaveProperty('UNDEFINED_VAR');
  });

  it('always adds SHOUT_SESSION=1', () => {
    const env = { HOME: '/home/user' };
    const result = stripSensitiveEnv(env);
    expect(result).toHaveProperty('SHOUT_SESSION', '1');
  });

  it.each(SENSITIVE_ENV_PREFIXES)('strips variables starting with %s', (prefix) => {
    const key = `${prefix}_TEST_VALUE`;
    const env = { [key]: 'sensitive-value', SAFE_VAR: 'safe' };
    const result = stripSensitiveEnv(env);
    expect(result).not.toHaveProperty(key);
    expect(result).toHaveProperty('SAFE_VAR', 'safe');
  });

  it('returns only SHOUT_SESSION for empty env', () => {
    const env = {};
    const result = stripSensitiveEnv(env);
    expect(result).toEqual({ SHOUT_SESSION: '1' });
  });

  it('overrides existing SHOUT_SESSION if present', () => {
    const env = { SHOUT_SESSION: 'existing-value', HOME: '/home/user' };
    const result = stripSensitiveEnv(env);
    expect(result).toHaveProperty('SHOUT_SESSION', '1');
  });

  it('SENSITIVE_ENV_PREFIXES has exactly 25 entries', () => {
    expect(SENSITIVE_ENV_PREFIXES).toHaveLength(25);
  });
});
