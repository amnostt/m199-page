// ---------------------------------------------------------------------------
// public.css route-style contract.
//
// Public routes load a stylesheet that does NOT include Tailwind v4
// Preflight and that retains the existing Mision 1-99 identity tokens
// and public-only landing composition. Admin tokens, shadcn registry
// CSS, and admin hand-reset never appear here. See proposal/spec/design
// for the boundaries.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const publicCssPath = resolve(here, "public.css");

function readPublic(): string {
  if (!existsSync(publicCssPath)) {
    throw new Error(`public.css not found at ${publicCssPath}`);
  }
  return readFileSync(publicCssPath, "utf8");
}

function readRule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`));
  if (!match) throw new Error(`Rule ${selector} not found in public.css`);
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

describe("public.css route-owned stylesheet", () => {
  it("loads Tailwind v4 theme and utilities without Preflight", () => {
    const css = readPublic();
    expect(css).toMatch(
      /@import\s+["']tailwindcss\/theme\.css["']\s+layer\(theme\)/,
    );
    expect(css).toMatch(
      /@import\s+["']tailwindcss\/utilities\.css["']\s+layer\(utilities\)/,
    );
    expect(css).not.toMatch(/@import\s+["']tailwindcss["']/);
    expect(css).not.toMatch(/tailwindcss\/preflight\.css/);
  });

  it("loads the public fonts without admin-only utilities", () => {
    const css = readPublic();
    expect(css).toContain('@import "@fontsource-variable/inter";');
    expect(css).toContain('@import "@fontsource-variable/archivo-narrow";');
  });

  it("keeps the two document themes as the only authored semantic token scopes", () => {
    const css = readPublic();
    expect(css).toMatch(/\[data-theme="public"\]\s*\{/);
    expect(css).not.toMatch(/\[data-theme="admin"\]\s*\{/);
    expect(css).not.toMatch(/^\s*:root\s*\{/m);
    expect(css).not.toMatch(/^\s*\.dark\s*\{/m);
  });

  it("defines every documented public semantic token with its approved value", () => {
    const css = readPublic();
    const expected: Record<string, string> = {
      background: "#111111",
      foreground: "#fff8f7",
      card: "#1e1b1b",
      "card-foreground": "#fff8f7",
      popover: "#171515",
      "popover-foreground": "#fff8f7",
      primary: "#bb0004",
      "primary-foreground": "#ffffff",
      "primary-hover": "#930002",
      secondary: "#fecb00",
      "secondary-foreground": "#241a00",
      "secondary-hover": "#e5b800",
      muted: "#2a2525",
      "muted-foreground": "#cdbfbc",
      accent: "#00855b",
      "accent-foreground": "#ffffff",
      "accent-hover": "#006947",
      destructive: "#ba1a1a",
      "destructive-foreground": "#ffffff",
      border: "#493b39",
      input: "#806b67",
      ring: "#006947",
      radius: "0.5rem",
    };
    const selector = '[data-theme="public"]';
    for (const [token, value] of Object.entries(expected)) {
      expect(readToken(css, selector, `--${token}`)).toBe(value);
    }
  });

  it("does not define any admin theme tokens", () => {
    const css = readPublic();
    expect(css).not.toMatch(/--background:\s*oklch\(1 0 0\)/);
    expect(css).not.toMatch(/--sidebar:\s*oklch/);
    expect(css).not.toMatch(/body\[data-theme="admin"\]\s*\{/);
  });

  it("does not add unscoped native reset rules", () => {
    const css = readPublic();
    expect(css).not.toMatch(/^\s*\*\s*\{/m);
    expect(css).not.toMatch(/^\s*(html|body)\s*\{/m);
    expect(css).not.toMatch(/@layer\s+base\s*\{/);
  });
});

describe("public.css landing hero contract", () => {
  it("defines the scoped desktop three-layer composition", () => {
    const css = readPublic();
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:[^;]*440px/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__visual\s*\{[^}]*width:\s*440px;[^}]*height:\s*520px;[^}]*overflow:\s*hidden;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__accent\s*\{[^}]*width:\s*148px;[^}]*background:\s*var\(--primary\);/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__image\s*\{[^}]*z-index:\s*1;[^}]*object-fit:\s*cover;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__accent\s*\{[^}]*z-index:\s*2;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__isotipo\s*\{[^}]*z-index:\s*3;/s,
    );
  });

  it("defines the compact-mobile dimensions and stacked layout", () => {
    const css = readPublic();
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.public-hero\s*\{[^}]*grid-template-columns:\s*1fr;/s,
    );
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.public-hero__visual\s*\{[^}]*width:\s*342px;[^}]*height:\s*252px;/s,
    );
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.public-hero__accent\s*\{[^}]*width:\s*92px;/s,
    );
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.public-hero__isotipo\s*\{[^}]*width:\s*220px;[^}]*height:\s*220px;/s,
    );
  });
});

describe("public.css landing navbar contract", () => {
  it("keeps navbar rules scoped to the public landing surface", () => {
    const css = readPublic();
    expect(css).toMatch(/\.public-ui\s+\.landing-navbar\s*\{/);
    expect(css).toMatch(/\.public-ui\s+\.landing-navbar__links\s*\{/);
    expect(css).not.toMatch(/^\s*\.landing-navbar\s*\{/m);
    expect(css).toMatch(
      /\.public-ui\.public-page#inicio\s*,[\s\S]*scroll-margin-block-start:\s*92px;/,
    );
    expect(css).not.toMatch(
      /\.landing-navbar[^{}]*\{[^}]*scroll-margin-block-start/s,
    );
  });

  it("defines desktop and compact-mobile framing with usable controls", () => {
    const css = readPublic();
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar\s*\{[^}]*min-height:\s*92px;[^}]*padding:\s*15px 120px;/s,
    );
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.landing-navbar\s*\{[^}]*min-height:\s*76px;[^}]*padding-inline:\s*24px;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar__link,[\s\S]*\.public-ui\s+\.landing-navbar__menu-toggle\s*\{[^}]*min-height:\s*44px;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar__menu-toggle\s*\{[^}]*min-width:\s*44px;/s,
    );
  });

  it("defines enhanced menu state, focus-visible styling, and reduced motion", () => {
    const css = readPublic();
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar--enhanced\s+\.landing-navbar__links\s*\{/,
    );
    expect(css).toMatch(
      /\.public-ui[\s\S]*?landing-navbar__menu-toggle\):focus-visible\s*\{/,
    );
    expect(css).toMatch(
      /@media\s+\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.public-ui\s+\.landing-navbar__links\s*\{/,
    );
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*scroll-margin-block-start:\s*76px;/s,
    );
  });
});
