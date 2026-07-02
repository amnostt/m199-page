/**
 * Synchronous config validation for @nestjs/config.
 *
 * Validates required keys (NODE_ENV, PORT, DATABASE_URL, JWT_SECRET) before
 * any module import resolves `@m199/db`, satisfying BF-01 and BF-02.
 */
import type { EnvConfig } from "./env.interface.js";

const REQUIRED_KEYS = [
  "NODE_ENV",
  "PORT",
  "DATABASE_URL",
  "JWT_SECRET",
] as const;

/** TCP port range (inclusive). */
const PORT_MIN = 1;
const PORT_MAX = 65535;

/** Default upload directory for file assets. */
const DEFAULT_UPLOAD_DIR = "./uploads";

/** Default max file size in bytes (10 MB). */
const DEFAULT_MAX_FILE_SIZE = 10485760;

export function validate(config: Record<string, unknown>): EnvConfig {
  for (const key of REQUIRED_KEYS) {
    if (config[key] == null || config[key] === "") {
      throw new Error(`Missing required env var: ${key}`);
    }
  }

  const port = Number(config["PORT"]);
  if (!Number.isInteger(port) || port < PORT_MIN || port > PORT_MAX) {
    throw new Error(
      `PORT must be an integer between ${String(PORT_MIN)}-${String(PORT_MAX)}, got: ${String(config["PORT"])}`,
    );
  }

  const maxFileSize =
    config["MAX_FILE_SIZE"] != null && config["MAX_FILE_SIZE"] !== ""
      ? Number(config["MAX_FILE_SIZE"])
      : DEFAULT_MAX_FILE_SIZE;
  if (!Number.isInteger(maxFileSize) || maxFileSize <= 0) {
    throw new Error("MAX_FILE_SIZE must be a positive integer");
  }

  return {
    NODE_ENV: String(config["NODE_ENV"]),
    PORT: port,
    DATABASE_URL: String(config["DATABASE_URL"]),
    JWT_SECRET: String(config["JWT_SECRET"]),
    UPLOAD_DIR:
      config["UPLOAD_DIR"] != null && config["UPLOAD_DIR"] !== ""
        ? String(config["UPLOAD_DIR"])
        : DEFAULT_UPLOAD_DIR,
    MAX_FILE_SIZE: maxFileSize,
  };
}
