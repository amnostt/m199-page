// ---------------------------------------------------------------------------
// server-port.test.mjs — vitest coverage for the ASTRO_PORT → PORT bridge.
//
// Vitest can import .mjs files directly. We import the same module the
// production server-entry.mjs uses, so a regression in the bridge is
// caught by `pnpm test` without needing to boot the standalone server.
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import {
  DEFAULT_ASTRO_PORT,
  bridgeAstroPortToRuntime,
  isValidAstroPort,
  resolveAstroPort,
} from "./server-port.mjs";

describe("resolveAstroPort — precedence", () => {
  it("returns PORT when it is set, regardless of ASTRO_PORT", () => {
    expect(resolveAstroPort({ PORT: "5000", ASTRO_PORT: "4000" })).toBe("5000");
  });

  it("returns ASTRO_PORT when PORT is missing", () => {
    expect(resolveAstroPort({ ASTRO_PORT: "4000" })).toBe("4000");
  });

  it("returns the built-in default (4321) when neither is set", () => {
    expect(resolveAstroPort({})).toBe(DEFAULT_ASTRO_PORT);
    expect(resolveAstroPort({})).toBe("4321");
  });

  it("rejects an empty PORT instead of falling through to ASTRO_PORT", () => {
    expect(() => resolveAstroPort({ PORT: "", ASTRO_PORT: "4000" })).toThrow(
      /Invalid Astro port/,
    );
  });
});

describe("resolveAstroPort — invalid input", () => {
  it("rejects a non-numeric ASTRO_PORT", () => {
    expect(() => resolveAstroPort({ ASTRO_PORT: "abc" })).toThrow(
      /Invalid Astro port/,
    );
  });

  it.each(["", "0", "-1", "4321.5", "65536"])("rejects %j", (value) => {
    expect(() => resolveAstroPort({ ASTRO_PORT: value })).toThrow(
      /Invalid Astro port/,
    );
  });

  it("validates PORT before ASTRO_PORT when both are supplied", () => {
    expect(() =>
      resolveAstroPort({ PORT: "65536", ASTRO_PORT: "4321" }),
    ).toThrow(/Invalid Astro port/);
  });
});

describe("isValidAstroPort", () => {
  it("accepts an integer string in the TCP port range", () => {
    expect(isValidAstroPort("1")).toBe(true);
    expect(isValidAstroPort("4321")).toBe(true);
    expect(isValidAstroPort("65535")).toBe(true);
  });

  it("rejects non-strings, empty strings, invalid numbers, and out-of-range values", () => {
    expect(isValidAstroPort("")).toBe(false);
    expect(isValidAstroPort("0")).toBe(false);
    expect(isValidAstroPort("65536")).toBe(false);
    expect(isValidAstroPort("4321.5")).toBe(false);
    expect(isValidAstroPort("-1")).toBe(false);
    expect(isValidAstroPort("abc")).toBe(false);
    expect(isValidAstroPort(undefined)).toBe(false);
    expect(isValidAstroPort(null)).toBe(false);
    expect(isValidAstroPort(4321)).toBe(false);
  });
});

describe("bridgeAstroPortToRuntime", () => {
  it("sets PORT from ASTRO_PORT when PORT is missing", () => {
    const env = { ASTRO_PORT: "4322" };
    bridgeAstroPortToRuntime(env);
    expect(env.PORT).toBe("4322");
  });

  it("does not overwrite an existing PORT (Astro contract)", () => {
    const env = { PORT: "5000", ASTRO_PORT: "4000" };
    bridgeAstroPortToRuntime(env);
    expect(env.PORT).toBe("5000");
  });

  it("uses the built-in default when neither is set", () => {
    const env = {};
    bridgeAstroPortToRuntime(env);
    expect(env.PORT).toBe("4321");
  });

  it("returns the port it assigned to env.PORT", () => {
    const env = { ASTRO_PORT: "4322" };
    expect(bridgeAstroPortToRuntime(env)).toBe("4322");
  });
});
