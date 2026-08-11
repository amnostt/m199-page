/**
 * WU2 remediation: legacy `apps/api/src/posts/sanitizer` path is gone.
 *
 * Closes the CRITICAL gap from verify-report #2273 ("Posts sanitizer
 * path is gone" scenario has no runtime covering test). Proves at
 * runtime that the legacy posts-path module cannot be resolved while
 * the relocated publications-path module is importable and functional.
 */
import { existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { sanitizePublicationContent } from "./sanitizer.js";

describe("WU2 sanitizer path relocation", () => {
  it("legacy apps/api/src/posts/sanitizer.ts is absent from disk", () => {
    expect(existsSync(new URL("../posts/sanitizer.ts", import.meta.url))).toBe(
      false,
    );
  });

  it("legacy posts/sanitizer.js cannot be dynamically imported", async () => {
    const legacySpecifier = `..${"/"}posts/sanitizer.js`;
    await expect(import(legacySpecifier)).rejects.toThrow();
  });

  it("relocated publications sanitizer is importable and functional", () => {
    expect(
      sanitizePublicationContent("<p>hello</p><script>evil()</script>"),
    ).toBe("<p>hello</p>");
  });
});
