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
  it("keeps default start on legacy Vite until the Astro root page exists", () => {
    expect(packageJson.scripts.start).toContain("vite");
    expect(packageJson.scripts.start).toContain("vite.legacy.config.ts");
    expect(packageJson.scripts.start).not.toContain("server-entry.mjs");
  });

  it("exposes the Astro foundation runtime only as a non-default command", () => {
    expect(packageJson.scripts["start:astro"]).toContain("server-entry.mjs");
  });

  it("loads the root .env before resolving the standalone server port", () => {
    expect(serverEntry.indexOf("\nloadRootEnv();")).toBeLessThan(
      serverEntry.indexOf("\nbridgeAstroPortToRuntime();"),
    );
  });
});
