// ---------------------------------------------------------------------------
// astro.config.mjs — Node standalone SSR for the public landing route.
//
// Scope: Astro owns every web route. GET / is server-rendered directly and
// the catch-all page mounts the existing React application for admin and
// interactive public routes. API-bound requests are proxied to Nest locally
// and dispatched to the API upstream by Caddy in production.
//
// Runtime contract:
//   - The standalone Node server reads `PORT` (Astro adapter contract), with
//     `ASTRO_PORT` as its documented fallback.
//   - The bridge in `apps/web/server-entry.mjs` calls
//     `bridgeAstroPortToRuntime()` before importing the built server entry,
//     so the documented `ASTRO_PORT` actually takes effect.
//   - `server.port` configures `astro dev` from `ASTRO_PORT` only, with a 4321
//     fallback. This keeps the root API `PORT=3000` from claiming Astro's dev
//     port while preserving the standalone adapter's `PORT` contract.
//
// Server-only env contract (PR2+ consumers — declaration only here):
//   - `ASTRO_API_BASE_URL` is intentionally NOT prefixed with `PUBLIC_`,
//     so Astro will NOT inline it in any client bundle. The validation logic
//     and tests live in `apps/web/src/lib/server/env.ts`. This config only
//     types it via `env.d.ts` so server modules get a typed
//     `import.meta.env.ASTRO_API_BASE_URL`.
// ---------------------------------------------------------------------------
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnvFile } from "node:process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAstroPort } from "./server-port.mjs";

export const ROOT_ENV_DIRECTORY = fileURLToPath(
  new URL("../../", import.meta.url),
);

const API_TARGET = process.env.API_TARGET ?? "http://localhost:3000";

function bypassHtmlDocument(req) {
  if (req.method === "GET" && req.headers?.accept?.includes("text/html")) {
    // Returning the original URL makes Vite call next() instead of proxying.
    // Astro's route middleware then renders the React document shell. Fetches
    // with */* continue through this proxy to the Nest API.
    return req.url;
  }
}

/**
 * Astro evaluates its config before it loads `.env`, so load the documented
 * workspace-root values explicitly. Process values intentionally win over
 * file values, matching the standalone entry's `loadRootEnv()` contract.
 *
 * @param {{ env?: NodeJS.ProcessEnv; envDir?: string }} [options]
 * @returns {string}
 */
export function resolveAstroDevPort({
  env = process.env,
  envDir = ROOT_ENV_DIRECTORY,
} = {}) {
  if (env.ASTRO_PORT !== undefined) {
    return resolveAstroPort({ ASTRO_PORT: env.ASTRO_PORT });
  }

  // Astro's config is evaluated before its automatic env loading. Read only
  // the private port from the workspace-root file without importing a
  // separate build-tool API or allowing a temporary file value to overwrite
  // a process value. Explicit process values were handled above.
  const originalAstroPort = process.env.ASTRO_PORT;
  delete process.env.ASTRO_PORT;
  let fileAstroPort;
  try {
    loadEnvFile(join(envDir, ".env"));
    fileAstroPort = process.env.ASTRO_PORT;
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ENOENT")) {
      throw error;
    }
  } finally {
    if (originalAstroPort === undefined) {
      delete process.env.ASTRO_PORT;
    } else {
      process.env.ASTRO_PORT = originalAstroPort;
    }
  }

  return resolveAstroPort({
    ASTRO_PORT: fileAstroPort,
  });
}

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  // Astro config evaluates before automatic .env loading. Resolve the
  // documented workspace root explicitly, then validate PORT before
  // ASTRO_PORT exactly as server-entry.mjs does for standalone runtime.
  server: {
    host: true,
    port: Number(resolveAstroDevPort()),
  },
  outDir: "dist",
  vite: {
    envDir: ROOT_ENV_DIRECTORY,
    // Astro's Tailwind v4 integration uses this plugin to process the
    // @import "tailwindcss/*" directives in public.css.
    plugins: [tailwindcss()],
    server: {
      proxy: {
        "/posts": {
          target: API_TARGET,
          changeOrigin: true,
          bypass: bypassHtmlDocument,
        },
        "/outings": {
          target: API_TARGET,
          changeOrigin: true,
          bypass: bypassHtmlDocument,
        },
        "/responsibles": { target: API_TARGET, changeOrigin: true },
        "/verses": { target: API_TARGET, changeOrigin: true },
        "/landing": { target: API_TARGET, changeOrigin: true },
        "/auth": { target: API_TARGET, changeOrigin: true },
        "/files": { target: API_TARGET, changeOrigin: true },
      },
    },
  },
  // The landing page is rendered on every request. The Node adapter caches
  // the SSR HTML only when explicitly enabled; for the landing page we want
  // fresh content on every navigation, so we leave caching to the proxy.
});
