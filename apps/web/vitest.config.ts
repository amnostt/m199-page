import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { getViteConfig } from "astro/config";

export default defineConfig(
  getViteConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      forbidOnly: true,
      // Server-side env/port/Astro-config tests are pure Node and must run
      // without the jsdom DOM globals. The matching test files also declare
      // `// @vitest-environment node` at the top, but this glob keeps the
      // default environment explicit and survives the comment being removed.
      // The .mjs bridge test (server-port.test.mjs) lives at the project
      // root, so the second glob covers it.
      //
      // `getViteConfig()` is required so the Astro Vite plugin (and
      // the Tailwind v4 plugin wired in `astro.config.mjs`) is loaded
      // into the vitest transform pipeline. Without it, vitest cannot
      // import `.astro` files — needed by the PR3 Container API tests
      // for `Landing.astro`. The legacy React tests keep working
      // because the explicit `react()` plugin is still passed through.
      environmentMatchGlobs: [
        ["src/lib/server/**", "node"],
        ["**/server-port.test.*", "node"],
        ["**/server-entry.test.*", "node"],
      ],
    },
  }),
);
