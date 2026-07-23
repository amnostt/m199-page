import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
    environmentMatchGlobs: [
      ["src/lib/server/**", "node"],
      ["**/server-port.test.*", "node"],
      ["**/server-entry.test.*", "node"],
    ],
  },
});
