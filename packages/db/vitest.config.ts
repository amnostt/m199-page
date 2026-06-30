import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    forbidOnly: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
