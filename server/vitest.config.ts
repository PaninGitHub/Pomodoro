import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'node:path';

// Load the monorepo-root .env so process.env carries TEST_DATABASE_URL
// (and any other server env vars) into the vitest worker. server.ts and
// db/migrate.ts each load .env at their own entry points; vitest invokes
// neither, so DB-touching test suites would otherwise silently skip
// because TEST_DATABASE_URL is undefined in the test process.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default defineConfig({
  test: {
    environment: 'node',
    // Single migration apply per session — see db/testGlobalSetup.ts for
    // the rationale (cuts per-test-file migration churn from N to 1).
    globalSetup: ['./db/testGlobalSetup.ts'],
    // DB-touching suites still round-trip to Neon. Defaults (5 s test /
    // 10 s hook) are tight for supertest + cross-Atlantic latency.
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
