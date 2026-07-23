import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRootEnv } from "./server-env.mjs";

describe("loadRootEnv", () => {
  it("loads a dotenv file while preserving explicit process environment values", async () => {
    const directory = await mkdtemp(join(tmpdir(), "m199-web-env-"));
    const envFile = join(directory, ".env");
    const originalExternal = process.env.ASTRO_ENV_TEST_EXTERNAL;
    const originalLoaded = process.env.ASTRO_ENV_TEST_LOADED;

    try {
      await writeFile(
        envFile,
        "ASTRO_ENV_TEST_EXTERNAL=from-file\nASTRO_ENV_TEST_LOADED=from-file\n",
      );
      process.env.ASTRO_ENV_TEST_EXTERNAL = "from-process";
      delete process.env.ASTRO_ENV_TEST_LOADED;

      expect(loadRootEnv({ envFile })).toBe(true);
      expect(process.env.ASTRO_ENV_TEST_EXTERNAL).toBe("from-process");
      expect(process.env.ASTRO_ENV_TEST_LOADED).toBe("from-file");
    } finally {
      if (originalExternal === undefined) {
        delete process.env.ASTRO_ENV_TEST_EXTERNAL;
      } else {
        process.env.ASTRO_ENV_TEST_EXTERNAL = originalExternal;
      }
      if (originalLoaded === undefined) {
        delete process.env.ASTRO_ENV_TEST_LOADED;
      } else {
        process.env.ASTRO_ENV_TEST_LOADED = originalLoaded;
      }
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("allows deployments that provide environment values without a root .env", () => {
    expect(
      loadRootEnv({ envFile: join(tmpdir(), "m199-web-missing-root-env") }),
    ).toBe(false);
  });
});
