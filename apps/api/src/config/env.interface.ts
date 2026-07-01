/** Validated API environment shape consumed by ConfigService. */
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
}
