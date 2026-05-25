import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import type postgres from 'postgres';
import type { Config } from './utils/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { buildAuthRouter } from './routes/auth';
import { configurePassport } from './auth/passport';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_SECONDS = 60 * 60 * 24; // 24h per Batch E §14.4

export function buildApp(config: Config, sql: postgres.Sql): Express {
  const app = express();

  if (config.isProduction) {
    app.set('trust proxy', 1);
  }

  // 1. helmet — CSP disabled in Phase 0 (re-enabled in Phase 9 per A3)
  app.use(helmet({ contentSecurityPolicy: false }));

  // 2. cors — locked to CLIENT_URL only, credentials required for cookies
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    })
  );

  // 3. body parser
  app.use(express.json({ limit: '64kb' }));

  // 4. session — connect-pg-simple builds its own pg pool from conString (per A1/D-03)
  const PgStore = connectPgSimple(session);
  app.use(
    session({
      store: new PgStore({
        conString: config.databaseUrl,
        tableName: 'session',
        pruneSessionInterval: PRUNE_INTERVAL_SECONDS,
      }),
      secret: config.sessionSecret,
      name: 'connect.sid',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProduction,
        maxAge: SEVEN_DAYS_MS,
      },
    })
  );

  // 5 & 6. passport
  configurePassport(config, sql);
  app.use(passport.initialize());
  app.use(passport.session());

  // 7. request logger
  app.use(requestLogger);

  // 8. routes
  app.use('/api', healthRouter);
  app.use('/api/auth', buildAuthRouter(config));

  // 9. error handler — must be last
  app.use(errorHandler);

  return app;
}
