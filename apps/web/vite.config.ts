import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ---------------------------------------------------------------------------
// Vite server proxy: routes API-bound requests (starting with /landing) to
// the NestJS API during local development. Default port matches the API
// bootstrap (apps/api/src/main.ts) and the monorepo .env.example (PORT=3000).
// This proxy only applies to the dev server — production builds serve the
// static bundle and expect a reverse proxy (nginx, etc.) to handle routing.
// ---------------------------------------------------------------------------
const API_TARGET =
  process.env.API_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
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
      "/landing": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
