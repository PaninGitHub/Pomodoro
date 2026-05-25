import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log } from './logger';

describe('log', () => {
  let spyOut: ReturnType<typeof vi.spyOn>;
  let spyErr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spyOut = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    spyErr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  afterEach(() => {
    spyOut.mockRestore();
    spyErr.mockRestore();
  });

  it('emits valid JSON with required fields', () => {
    log({ level: 'info', event: 'server_start', port: 3001 });
    const line = spyOut.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(line.trim());
    expect(parsed.level).toBe('info');
    expect(parsed.event).toBe('server_start');
    expect(parsed.port).toBe(3001);
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('routes warn to stdout', () => {
    log({ level: 'warn', event: 'slow_query' });
    expect(spyOut).toHaveBeenCalled();
    expect(spyErr).not.toHaveBeenCalled();
  });

  it('routes error to stderr', () => {
    log({ level: 'error', event: 'db_connect_failed' });
    expect(spyErr).toHaveBeenCalled();
    expect(spyOut).not.toHaveBeenCalled();
  });

  it('emits one line per call (ends with newline)', () => {
    log({ level: 'info', event: 'tick' });
    const line = spyOut.mock.calls[0]?.[0] as string;
    expect(line.endsWith('\n')).toBe(true);
  });
});
