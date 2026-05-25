import { describe, it, expect } from 'vitest';
import { loadConfig, ConfigError } from './env';

const baseEnv = {
  PORT: '3001',
  NODE_ENV: 'development',
  DATABASE_URL: 'postgres://u:p@h/db',
  GOOGLE_CLIENT_ID: 'gid',
  GOOGLE_CLIENT_SECRET: 'gsec',
  GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/auth/google/callback',
  SESSION_SECRET: 'devsecret',
  R2_PUBLIC_BASE_URL: 'https://r2.example.com',
  CLIENT_URL: 'http://localhost:5173',
};

describe('loadConfig', () => {
  it('returns typed config when all required vars are present', () => {
    const cfg = loadConfig(baseEnv);
    expect(cfg.port).toBe(3001);
    expect(cfg.nodeEnv).toBe('development');
    expect(cfg.databaseUrl).toBe('postgres://u:p@h/db');
    expect(cfg.isProduction).toBe(false);
  });

  it('throws ConfigError listing every missing var', () => {
    expect(() => loadConfig({ PORT: '3001' })).toThrow(ConfigError);
    try {
      loadConfig({ PORT: '3001' });
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      const msg = (e as Error).message;
      expect(msg).toContain('DATABASE_URL');
      expect(msg).toContain('SESSION_SECRET');
    }
  });

  it('parses PORT as integer', () => {
    const cfg = loadConfig(baseEnv);
    expect(typeof cfg.port).toBe('number');
  });

  it('rejects non-numeric PORT', () => {
    expect(() => loadConfig({ ...baseEnv, PORT: 'abc' })).toThrow(ConfigError);
  });

  it('enforces SESSION_SECRET min 32 chars when NODE_ENV=production', () => {
    expect(() =>
      loadConfig({ ...baseEnv, NODE_ENV: 'production', SESSION_SECRET: 'short' })
    ).toThrow(/SESSION_SECRET/);
  });

  it('allows short SESSION_SECRET in development', () => {
    expect(() =>
      loadConfig({ ...baseEnv, SESSION_SECRET: 'short' })
    ).not.toThrow();
  });

  it('sets isProduction true when NODE_ENV=production', () => {
    const cfg = loadConfig({
      ...baseEnv,
      NODE_ENV: 'production',
      SESSION_SECRET: 'a'.repeat(32),
    });
    expect(cfg.isProduction).toBe(true);
  });
});
