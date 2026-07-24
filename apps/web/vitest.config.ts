import { defineConfig } from "vitest/config";
import { getViteConfig } from "astro/config";

export default defineConfig(
  getViteConfig({
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
      // `getViteConfig()` is required so Astro's integration plugins (and
      // the Tailwind v4 plugin wired in `astro.config.mjs`) are loaded into
      // the Vitest transform pipeline. Without it, Vitest cannot import
      // `.astro` files or transform the React island used by the catch-all
      // route.
      environmentMatchGlobs: [
        ["src/lib/server/**", "node"],
        ["**/server-port.test.*", "node"],
        ["**/server-entry.test.*", "node"],
      ],
    },
  }),
);
