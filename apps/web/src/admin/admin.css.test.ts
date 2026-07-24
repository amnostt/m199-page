import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "admin.css"),
  "utf8",
);
describe("admin.css isolation", () => {
  it("keeps tokens and authored selectors under .admin-ui", () => {
    expect(css).not.toMatch(/^\s*:root\s*\{/m);
    expect(css).not.toMatch(/^\s*(html|body)\s*\{/m);
    expect(css).not.toMatch(/@import|@theme|preflight|\.dark/);
    expect(css).toMatch(/\.admin-ui\s*\{/);
    for (const match of css.matchAll(/([^{}]+)\{/g)) {
      const selector = match[1]!.trim();
      if (
        !selector.startsWith("@") &&
        selector &&
        !selector.includes("prettier-ignore") &&
        !selector.includes(".admin-ui")
      )
        expect.fail(`Unscoped selector: ${selector}`);
    }
  });
});
