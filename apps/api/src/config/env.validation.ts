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

  return {
    NODE_ENV: String(config["NODE_ENV"]),
    PORT: port,
    DATABASE_URL: String(config["DATABASE_URL"]),
    JWT_SECRET: String(config["JWT_SECRET"]),
  };
}
