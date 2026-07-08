/** Validated API environment shape consumed by ConfigService. */
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  API_ORIGIN: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  VISITOR_HASH_SECRET: string;
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;
}
