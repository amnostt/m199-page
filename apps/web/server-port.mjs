// ---------------------------------------------------------------------------
// server-port.mjs — bridge logic between documented `ASTRO_PORT` and the
// Astro Node adapter standalone runtime `PORT` environment variable.
//
// Plain ESM JavaScript (no TypeScript) because:
//   1. `server-entry.mjs` must import this file at production startup,
//      before any Vite/astro build step has had a chance to emit
//      TypeScript output. The project tsconfig has `noEmit: true`, so
//      there is no compiled `port.js` to import.
//   2. JSDoc carries the public type surface so callers (and tests) can
//      rely on it without needing TypeScript.
//
// Contract (enforced here, tested in server-port.test.mjs):
//   1. `PORT` takes precedence over `ASTRO_PORT` for both `astro dev` and
//      the standalone adapter runtime.
//   2. When neither variable is set, the default Astro dev port (4321) is
//      used.
//   3. A supplied value must be an integer in the inclusive TCP range 1–65535.
//      Empty, decimal, zero, negative, and oversized values fail fast.
// ---------------------------------------------------------------------------

export const DEFAULT_ASTRO_PORT = "4321";
const MIN_PORT = 1;
const MAX_PORT = 65535;

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string} the resolved port (always an integer from 1 through 65535)
 */
export function resolveAstroPort(env = process.env) {
  const value =
    env.PORT !== undefined
      ? env.PORT
      : env.ASTRO_PORT !== undefined
        ? env.ASTRO_PORT
        : DEFAULT_ASTRO_PORT;

  if (!isValidAstroPort(value)) {
    throw new Error(
      `Invalid Astro port: ${JSON.stringify(value)}. ` +
        `Expected PORT or ASTRO_PORT to be an integer between ${String(MIN_PORT)} and ${String(MAX_PORT)}.`,
    );
  }

  return value;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isValidAstroPort(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return false;
  }

  const port = Number(value);
  return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT;
}

/**
 * Apply the resolved port to `process.env.PORT` so the Astro Node adapter
 * standalone entry picks it up at import time. Throws when the resolved
 * value is not an integer from 1 through 65535.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string} the port that was assigned to `env.PORT`
 */
export function bridgeAstroPortToRuntime(env = process.env) {
  const resolved = resolveAstroPort(env);
  env.PORT = resolved;
  return resolved;
}
