// ---------------------------------------------------------------------------
// admin.css route-style contract.
//
// The admin route (`/admin`) owns a route-scoped stylesheet that loads
// canonical Tailwind v4 Preflight, the shadcn registry tailwind.css,
// the neutral shadcn tokens, and a minimal compatibility layer that
// preserves the committed AdminShell visual composition. Public routes
// never receive this file. See proposal/spec/design for the boundaries.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const adminCssPath = resolve(here, "admin.css");

function readAdmin(): string {
  if (!existsSync(adminCssPath)) {
    throw new Error(`admin.css not found at ${adminCssPath}`);
  }
  return readFileSync(adminCssPath, "utf8");
}

function readRule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`));
  if (!match) throw new Error(`Rule ${selector} not found in admin.css`);
  return match[1]!;
}

function readToken(css: string, selector: string, token: string): string {
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = readRule(css, selector).match(
    new RegExp(`${escapedToken}\\s*:\\s*([^;]+);`),
  );
  if (!match) throw new Error(`Token ${token} not found in ${selector}`);
  return match[1]!.trim();
}

describe("admin.css route-owned stylesheet", () => {
  it("loads canonical Tailwind v4 Preflight, theme, and utilities", () => {
    const css = readAdmin();
    expect(css).toMatch(/@import\s+["']tailwindcss\/preflight\.css["']/);
    expect(css).toMatch(
      /@import\s+["']tailwindcss\/theme\.css["']\s+layer\(theme\)/,
    );
    expect(css).toMatch(
      /@import\s+["']tailwindcss\/utilities\.css["']\s+layer\(utilities\)/,
    );
    expect(css).not.toMatch(/@import\s+["']tailwindcss["']/);
  });

  it("loads the official shadcn registry CSS as the canonical base layer", () => {
    const css = readAdmin();
    expect(css).toContain('@import "shadcn/tailwind.css";');
  });

  it("exposes semantic color tokens through Tailwind v4 @theme inline", () => {
    const css = readAdmin();
    expect(css).toContain("@theme inline");
    expect(css).toContain("--color-background: var(--background);");
    expect(css).toContain("--color-foreground: var(--foreground);");
    expect(css).toContain("--color-primary: var(--primary);");
    expect(css).toContain("--color-sidebar: var(--sidebar);");
    expect(css).toContain("--radius-md: var(--radius);");
  });

  it("gates dark utilities behind an explicit class instead of OS preference", () => {
    const css = readAdmin();
    expect(css).toContain("@custom-variant dark (&:where(.dark, .dark *));");
    expect(css).not.toMatch(/prefers-color-scheme\s*:\s*dark/);
  });

  it("defines every documented admin semantic token with its approved value", () => {
    const css = readAdmin();
    const expected: Record<string, string> = {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.145 0 0)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.145 0 0)",
      primary: "oklch(0.205 0 0)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.97 0 0)",
      "secondary-foreground": "oklch(0.205 0 0)",
      muted: "oklch(0.97 0 0)",
      "muted-foreground": "oklch(0.556 0 0)",
      accent: "oklch(0.97 0 0)",
      "accent-foreground": "oklch(0.205 0 0)",
      destructive: "oklch(0.577 0.245 27.325)",
      "destructive-foreground": "oklch(0.985 0 0)",
      border: "oklch(0.922 0 0)",
      input: "oklch(0.922 0 0)",
      ring: "oklch(0.708 0 0)",
      "sidebar-foreground": "oklch(0.145 0 0)",
      "sidebar-primary": "oklch(0.205 0 0)",
      "sidebar-border": "oklch(0.922 0 0)",
      "sidebar-ring": "oklch(0.708 0 0)",
      radius: "0.5rem",
    };
    const selector = '[data-theme="admin"]';
    for (const [token, value] of Object.entries(expected)) {
      expect(readToken(css, selector, `--${token}`)).toBe(value);
    }
  });

  it("does not define any public theme tokens", () => {
    const css = readAdmin();
    expect(css).not.toMatch(/\[data-theme="public"\]\s*\{/);
    expect(css).not.toMatch(/--primary:\s*#bb0004/);
    expect(css).not.toMatch(/\.public-ui\s/);
  });

  it("does not redeclare a :root reset or unscoped native rules", () => {
    const css = readAdmin();
    expect(css).not.toMatch(/^\s*:root\s*\{/m);
    expect(css).not.toMatch(/^\s*\*\s*\{/m);
    expect(css).not.toMatch(/^\s*(html|body)\s*\{/m);
  });

  it("preserves admin focus-visible ring without resurrecting the hand reset", () => {
    const css = readAdmin();
    expect(css).toMatch(
      /body\[data-theme="admin"\]\s+:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ring\);[^}]*outline-offset:\s*2px;/s,
    );
  });

  it("applies border-color: var(--border) globally for admin surfaces", () => {
    // Evidence: committed AdminShell sidebar border-right-color: oklch(0.922 0 0)
    // requires a global border-color fallback under Tailwind v4 Preflight
    // (Preflight only sets border-color: inherit on tables, not *).
    const css = readAdmin();
    expect(css).toMatch(
      /body\[data-theme="admin"\]\s+\*\s*\{[^}]*border-color:\s*var\(--border\);/s,
    );
  });

  it("restores appearance: none and border-style: none for admin buttons", () => {
    // Evidence: committed AdminShell browser test asserts
    //   appearance: "none", borderStyle: "none" on nav buttons.
    // Canonical Tailwind v4 Preflight sets `appearance: button` and
    // `border: 0 solid`, so a targeted compatibility rule is required to
    // preserve the committed visual composition. The rule is narrow
    // (admin-scoped) and backed by the committed computed-style test.
    const css = readAdmin();
    expect(css).toMatch(
      /body\[data-theme="admin"\]\s+:where\(button\)\s*\{[^}]*appearance:\s*none;[^}]*border-style:\s*none;/s,
    );
  });

  it("does not import the public fonts or public-ui landing rules", () => {
    const css = readAdmin();
    expect(css).not.toMatch(/@fontsource-variable\//);
    expect(css).not.toMatch(/\.public-hero/);
    expect(css).not.toMatch(/\.landing-navbar/);
  });
});
