/**
 * Validated environment configuration.
 * Centralises all env var access so missing vars fail early with clear messages.
 * Import this instead of accessing process.env directly in application code.
 */

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3001'), 10),
  databaseUrl: required('DATABASE_URL'),
  /** JWT_SECRET validation is handled at startup in app.ts for non-test environments */
  jwtSecret: optional('JWT_SECRET', ''),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),
  geocodingUserAgent: optional('GEOCODING_USER_AGENT', 'Routesy/1.0 (https://routesy.app)'),
} as const;
