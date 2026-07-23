import { loadEnvFile } from "node:process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory =
  import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
export const ROOT_ENV_FILE = fileURLToPath(
  new URL("../../.env", `file://${moduleDirectory}/`),
);

/**
 * Load the documented workspace .env before validating the standalone server.
 * Explicit process environment values retain precedence over the file.
 *
 * @param {{ env?: NodeJS.ProcessEnv; envFile?: string; loader?: (path: string) => void }} [options]
 * @returns {boolean} whether a root .env file was loaded
 */
export function loadRootEnv({
  env = process.env,
  envFile = ROOT_ENV_FILE,
  loader = loadEnvFile,
} = {}) {
  const existing = new Map(Object.entries(env));

  try {
    loader(envFile);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }

  for (const [key, value] of existing) {
    env[key] = value;
  }

  return true;
}
