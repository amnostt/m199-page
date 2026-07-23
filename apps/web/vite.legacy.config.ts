import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// ---------------------------------------------------------------------------
// Vite LEGACY dev-server config — owns /admin*, /posts*, /outings*, and every
// other React SPA route during the Astro landing migration.
//
// The Astro SSR server (see astro.config.mjs) owns only GET /; this config
// preserves the existing dev-server behavior for the rest of the app:
// routes API-bound requests (starting with /landing) to the NestJS API
// during local development. Default port matches the API bootstrap
// (apps/api/src/main.ts) and the monorepo .env.example (PORT=3000).
// This proxy only applies to the dev server — production builds serve the
// static bundle and expect a reverse proxy (Caddy, etc.) to handle routing.
//
// The legacy build outputs to dist-legacy/ (not dist/) so the Astro Node
// build (which owns dist/server + dist/client + dist/client/_astro/*) does
// not collide with the React/Vite static bundle. Caddy serves the
// legacy bundle from dist-legacy/ via file_server.
// ---------------------------------------------------------------------------
const API_TARGET = process.env.API_TARGET ?? "http://localhost:3000";

export default defineConfig({
  // Astro's Node SSR build owns apps/web/dist (dist/server + dist/client).
  // The React/Vite legacy bundle must live in a separate directory so the
  // two outputs do not collide on apps/web/dist/assets.
  build: {
    outDir: "dist-legacy",
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/posts": {
        target: API_TARGET,
        changeOrigin: true,
        // Bypass the proxy for browser page loads (GET + Accept: text/html)
        // so the SPA handles /posts and /posts/:slug navigation. All
        // component fetch() calls use Accept: */* and still pass through to
        // the API. This prevents plain <a href> clicks and direct page loads
        // from hitting the API and returning JSON instead of the SPA page.
        bypass(req) {
          if (
            req.method === "GET" &&
            req.headers?.accept?.includes("text/html")
          ) {
            return "/index.html";
          }
        },
      },
      "/outings": {
        target: API_TARGET,
        changeOrigin: true,
        // Bypass the proxy for browser page loads (GET + Accept: text/html)
        // so the SPA handles /outings and /outings/:slug navigation. All
        // component fetch() calls use Accept: */* and still pass through to
        // the API. This prevents plain <a href> clicks and direct page loads
        // from hitting the API and returning JSON instead of the SPA page.
        bypass(req) {
          if (
            req.method === "GET" &&
            req.headers?.accept?.includes("text/html")
          ) {
            return "/index.html";
          }
        },
      },
      "/responsibles": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/verses": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/landing": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/auth": {
        target: API_TARGET,
        changeOrigin: true,
      },
      // /files proxy — serves uploaded post cover images, thumbnails,
      // and downloadable files from the API during local development.
      // No bypass: all /files requests (including browser page loads)
      // should reach the API server.
      "/files": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
