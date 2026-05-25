import postgres from 'postgres';
import type { Config } from '../utils/env';

let _sql: postgres.Sql | null = null;

export function initDb(config: Config): postgres.Sql {
  if (_sql) return _sql;
  _sql = postgres(config.databaseUrl, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
  });
  return _sql;
}

export function getSql(): postgres.Sql {
  if (!_sql) throw new Error('Database not initialized. Call initDb(config) first.');
  return _sql;
}

/**
 * Lightweight health check. Times out after 2 seconds.
 * Used at boot to fail-fast if the DB is unreachable.
 */
export async function ping(timeoutMs = 2000): Promise<void> {
  const sql = getSql();
  await Promise.race([
    sql`SELECT 1 as ok`,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`DB ping timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
  }
}
