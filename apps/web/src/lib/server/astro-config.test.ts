// @vitest-environment node
//
// The test dynamically imports `../../../astro.config.mjs`, a project-root
// Astro config that lives outside this tsconfig's `src` include. The shape
// is asserted at runtime via the AstroConfig cast in `loadAstroConfig`,
// which is inlined here so the test owns its bridge rather than depending
// on a sibling wrapper.
import { describe, it, expect, afterEach, vi } from "vitest";
import type { AstroConfig } from "astro";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type AstroConfigModule = {
  default: AstroConfig;
  resolveAstroDevPort: (options: {
    env: NodeJS.ProcessEnv;
    envDir: string;
  }) => string;
};

/**
 * Load the project's `astro.config.mjs` and return its resolved config.
 * The cast is safe: astro.config.mjs is a `defineConfig({...})` call whose
 * return type Astro already widens to `AstroConfig` before exporting.
 */
async function loadAstroConfig(): Promise<AstroConfig> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- tsc (project typecheck) cannot resolve a relative .mjs
  // outside the src include; astro check sees the same import as
  // resolvable, so we deliberately use @ts-ignore over @ts-expect-error.
  const mod = (await import("../../../astro.config.mjs")) as AstroConfigModule;
  return mod.default;
}

async function loadAstroConfigModule(): Promise<AstroConfigModule> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- see loadAstroConfig's explanation above.
  return (await import("../../../astro.config.mjs")) as AstroConfigModule;
}

async function resolvePortWithEmptyRootEnv(
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "m199-astro-empty-env-"));

  try {
    const { resolveAstroDevPort } = await loadAstroConfigModule();
    return resolveAstroDevPort({ env, envDir: directory });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

// We test astro.config.mjs by dynamically importing it after mutating
// process.env. Because Node's module cache would otherwise hand us the same
// config object, we call vi.resetModules() between cases so each test sees a
// fresh evaluation of the top-level ASTRO_PORT check.

const ORIGINAL_ASTRO_PORT = process.env.ASTRO_PORT;
const ORIGINAL_PORT = process.env.PORT;
const ORIGINAL_ASTRO_API_BASE_URL = process.env.ASTRO_API_BASE_URL;

afterEach(() => {
  // Restore the env we captured at module load so other test files are
  // unaffected by the order of execution.
  if (ORIGINAL_ASTRO_PORT === undefined) {
    delete process.env.ASTRO_PORT;
  } else {
    process.env.ASTRO_PORT = ORIGINAL_ASTRO_PORT;
  }
  if (ORIGINAL_PORT === undefined) {
    delete process.env.PORT;
  } else {
    process.env.PORT = ORIGINAL_PORT;
  }
  if (ORIGINAL_ASTRO_API_BASE_URL === undefined) {
    delete process.env.ASTRO_API_BASE_URL;
  } else {
    process.env.ASTRO_API_BASE_URL = ORIGINAL_ASTRO_API_BASE_URL;
  }
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// server.port — shared PORT / ASTRO_PORT contract
// ---------------------------------------------------------------------------

describe("astro.config.mjs — server.port contract", () => {
  it("loads root .env port values while explicit environment values win", async () => {
    const directory = await mkdtemp(join(tmpdir(), "m199-astro-env-"));

    try {
      await writeFile(join(directory, ".env"), "PORT=4100\nASTRO_PORT=4200\n");
      const { resolveAstroDevPort } = await loadAstroConfigModule();

      expect(
        resolveAstroDevPort({
          env: { NODE_ENV: "development" },
          envDir: directory,
        }),
      ).toBe("4100");
      expect(
        resolveAstroDevPort({
          env: { NODE_ENV: "development", PORT: "4300" },
          envDir: directory,
        }),
      ).toBe("4300");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("uses PORT before ASTRO_PORT when both are set", async () => {
    process.env.PORT = "5051";
    process.env.ASTRO_PORT = "5050";
    const config = await loadAstroConfig();
    expect(config.server?.port).toBe(5051);
  });

  it("uses ASTRO_PORT when PORT is unset", async () => {
    await expect(
      resolvePortWithEmptyRootEnv({
        NODE_ENV: "development",
        ASTRO_PORT: "5050",
      }),
    ).resolves.toBe("5050");
  });

  it("falls back to 4321 when both port variables are unset", async () => {
    await expect(
      resolvePortWithEmptyRootEnv({ NODE_ENV: "development" }),
    ).resolves.toBe("4321");
  });

  it.each(["", "0", "65536"])(
    "rejects invalid ASTRO_PORT %j before Astro dev starts",
    async (value) => {
      await expect(
        resolvePortWithEmptyRootEnv({
          NODE_ENV: "development",
          ASTRO_PORT: value,
        }),
      ).rejects.toThrow(/Invalid Astro port/);
    },
  );

  it("rejects an invalid PORT even when ASTRO_PORT is valid", async () => {
    process.env.PORT = "0";
    process.env.ASTRO_PORT = "4321";
    await expect(loadAstroConfig()).rejects.toThrow(/Invalid Astro port/);
  });
});

// ---------------------------------------------------------------------------
// Adapter — Node standalone SSR
// ---------------------------------------------------------------------------

describe("astro.config.mjs — adapter and output", () => {
  it("declares SSR output and the @astrojs/node adapter in standalone mode", async () => {
    process.env.ASTRO_PORT = "4321";
    const config = await loadAstroConfig();
    expect(config.output).toBe("server");
    const adapter = config.adapter;
    expect(adapter).toBeDefined();
    expect(typeof adapter).toBe("object");
    // The standalone adapter's name field is the documented public handle;
    // assert on that rather than the private mode constant so this test
    // does not break on adapter internals.
    expect(adapter?.name).toBe("@astrojs/node");
  });
});
