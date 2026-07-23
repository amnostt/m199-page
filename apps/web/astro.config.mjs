// ---------------------------------------------------------------------------
// astro.config.mjs — Node standalone SSR for the public landing route.
//
// Scope: only GET / is rendered by Astro. Every other route
// (/admin*, /posts*, /outings*, /files/*, /auth/*, /responsibles/*, /verses/*,
// /landing/public for direct API calls, ...) is owned by the legacy React/Vite
// bundle behind the Caddy reverse proxy. See docs/astro-landing-deployment.md
// (PR5) for the full dispatch contract.
//
// Runtime contract — closes review blocker A-004:
//   - The standalone Node server reads `PORT` (Astro adapter contract).
//   - `PORT` takes precedence over the documented `ASTRO_PORT` fallback.
//   - The bridge in `apps/web/server-entry.mjs` calls
//     `bridgeAstroPortToRuntime()` before importing the built server entry,
//     so the documented `ASTRO_PORT` actually takes effect.
//   - `server.port` here configures `astro dev` through the same resolver as
//     the standalone entry, with a 4321 fallback. Dev/prod behavior is
//     consistent.
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
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { resolveAstroPort } from "./server-port.mjs";

export const ROOT_ENV_DIRECTORY = fileURLToPath(
  new URL("../../", import.meta.url),
);

/**
 * Astro evaluates its config before it loads `.env`, so load the documented
 * workspace-root values explicitly. Process values intentionally win over
 * file values, matching the standalone entry's `loadRootEnv()` contract.
 *
 * @param {{ env?: NodeJS.ProcessEnv; envDir?: string; load?: typeof loadEnv }} [options]
 * @returns {string}
 */
export function resolveAstroDevPort({
  env = process.env,
  envDir = ROOT_ENV_DIRECTORY,
  load = loadEnv,
} = {}) {
  const fileEnv = load(env.NODE_ENV ?? "development", envDir, "");
  return resolveAstroPort({ ...fileEnv, ...env });
}

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  // Astro config evaluates before automatic .env loading. Resolve the
  // documented workspace root explicitly, then validate PORT before
  // ASTRO_PORT exactly as server-entry.mjs does for standalone runtime.
  server: {
    host: true,
    port: Number(resolveAstroDevPort()),
  },
  // Keep Astro output separate from the legacy Vite/React build. The Astro
  // Node server emits dist/server + dist/client (which contains /_astro/*),
  // and the legacy Vite build emits dist-legacy/ via vite.legacy.config.ts.
  // Without this separation, the legacy `dist/assets` and the Astro
  // `dist/client/_astro` would collide.
  outDir: "dist",
  vite: {
    // Reuse the existing Tailwind v4 Vite plugin so public.css's
    // @import "tailwindcss/theme.css" and @import "tailwindcss/utilities.css"
    // resolve through the same pipeline the legacy Vite build uses.
    plugins: [tailwindcss()],
  },
  // The landing page is rendered on every request. The Node adapter caches
  // the SSR HTML only when explicitly enabled; for the landing page we want
  // fresh content on every navigation, so we leave caching to the proxy.
});
