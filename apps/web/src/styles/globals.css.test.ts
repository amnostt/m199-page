import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "globals.css"),
  "utf8",
);

describe("shadcn globals preflight isolation", () => {
  it("keeps Tailwind v4 theme and utilities without importing Preflight", () => {
    expect(css).toMatch(
      /@import\s+["']tailwindcss\/theme\.css["']\s+layer\(theme\)/,
    );
    expect(css).toMatch(
      /@import\s+["']tailwindcss\/utilities\.css["']\s+layer\(utilities\)/,
    );
    expect(css).not.toMatch(/@import\s+["']tailwindcss["']/);
    expect(css).not.toMatch(/tailwindcss\/preflight\.css/);
  });

  it("does not add unscoped native reset rules to public or admin routes", () => {
    expect(css).not.toMatch(/^\s*\*\s*\{/m);
    expect(css).not.toMatch(/^\s*(html|body)\s*\{/m);
    expect(css).not.toMatch(/@layer\s+base\s*\{/);
  });

  it("retains the generated shadcn token and utility foundation", () => {
    expect(css).toContain('@import "shadcn/tailwind.css";');
    expect(css).toContain("@theme inline");
    expect(css).toContain(":root {");
    expect(css).toContain("--color-primary: var(--primary);");
  });
});
