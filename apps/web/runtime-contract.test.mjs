import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
);
const serverEntry = readFileSync(
  resolve(process.cwd(), "server-entry.mjs"),
  "utf8",
);

describe("PR1 runtime contract", () => {
  it("uses Astro for the default development, build, and runtime commands", () => {
    expect(packageJson.scripts.dev).toBe("astro dev");
    expect(packageJson.scripts.build).toContain("astro check");
    expect(packageJson.scripts.build).toContain("astro build");
    expect(packageJson.scripts.start).toContain("server-entry.mjs");
  });

  it("does not retain the removed legacy web commands", () => {
    expect(packageJson.scripts["dev:astro"]).toBeUndefined();
    expect(packageJson.scripts["build:legacy"]).toBeUndefined();
    expect(packageJson.scripts["start:astro"]).toBeUndefined();
  });

  it("loads the root .env before resolving the standalone server port", () => {
    expect(serverEntry.indexOf("\nloadRootEnv();")).toBeLessThan(
      serverEntry.indexOf("\nbridgeAstroPortToRuntime();"),
    );
  });
});
