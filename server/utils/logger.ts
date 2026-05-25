export type LogLevel = 'info' | 'warn' | 'error';

export interface LogFields {
  level: LogLevel;
  event: string;
  [key: string]: unknown;
}

export function log(fields: LogFields): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...fields,
  }) + '\n';

  if (fields.level === 'error') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}
