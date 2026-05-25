export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface Config {
  port: number;
  nodeEnv: 'development' | 'production';
  isProduction: boolean;
  databaseUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  sessionSecret: string;
  r2PublicBaseUrl: string;
  clientUrl: string;
}

const REQUIRED = [
  'PORT',
  'NODE_ENV',
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'SESSION_SECRET',
  'R2_PUBLIC_BASE_URL',
  'CLIENT_URL',
] as const;

export function loadConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined>): Config {
  const missing = REQUIRED.filter((k) => !env[k] || env[k]?.trim() === '');
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  const portStr = env.PORT!;
  const port = Number.parseInt(portStr, 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new ConfigError(`PORT must be a positive integer, got "${portStr}"`);
  }

  const nodeEnv = env.NODE_ENV!;
  if (nodeEnv !== 'development' && nodeEnv !== 'production') {
    throw new ConfigError(
      `NODE_ENV must be 'development' or 'production', got "${nodeEnv}"`
    );
  }

  const sessionSecret = env.SESSION_SECRET!;
  if (nodeEnv === 'production' && sessionSecret.length < 32) {
    throw new ConfigError(
      'SESSION_SECRET must be at least 32 characters in production'
    );
  }

  return {
    port,
    nodeEnv,
    isProduction: nodeEnv === 'production',
    databaseUrl: env.DATABASE_URL!,
    googleClientId: env.GOOGLE_CLIENT_ID!,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET!,
    googleCallbackUrl: env.GOOGLE_CALLBACK_URL!,
    sessionSecret,
    r2PublicBaseUrl: env.R2_PUBLIC_BASE_URL!,
    clientUrl: env.CLIENT_URL!,
  };
}
