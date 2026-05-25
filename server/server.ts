import path from 'node:path';
import dotenv from 'dotenv';

// Load .env from monorepo root regardless of cwd (npm runs us from server/).
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { loadConfig, ConfigError } from './utils/env';
import { initDb, ping, closeDb } from './db/db';
import { buildApp } from './app';
import { log } from './utils/logger';

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig(process.env);
  } catch (err) {
    const msg = err instanceof ConfigError ? err.message : String(err);
    log({ level: 'error', event: 'env_validation_failed', message: msg });
    process.exit(1);
  }

  const sql = initDb(config);

  try {
    await ping(2000);
  } catch (err) {
    log({
      level: 'error',
      event: 'db_unreachable',
      message: err instanceof Error ? err.message : String(err),
    });
    await closeDb();
    process.exit(1);
  }

  const app = buildApp(config, sql);

  const server = app.listen(config.port, () => {
    log({
      level: 'info',
      event: 'server_started',
      port: config.port,
      node_env: config.nodeEnv,
    });
  });

  const shutdown = async (signal: string) => {
    log({ level: 'info', event: 'shutdown_initiated', signal });
    server.close();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  log({
    level: 'error',
    event: 'boot_failed',
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
