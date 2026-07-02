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
      "/landing": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
