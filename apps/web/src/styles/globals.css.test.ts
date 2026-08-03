import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "globals.css"),
  "utf8",
);

type Theme = "public" | "admin";

const EXPECTED_TOKENS: Record<
  Theme,
  Record<
    | "background"
    | "foreground"
    | "card"
    | "card-foreground"
    | "popover"
    | "popover-foreground"
    | "primary"
    | "primary-foreground"
    | "primary-hover"
    | "secondary"
    | "secondary-foreground"
    | "secondary-hover"
    | "muted"
    | "muted-foreground"
    | "accent"
    | "accent-foreground"
    | "accent-hover"
    | "destructive"
    | "destructive-foreground"
    | "border"
    | "input"
    | "ring"
    | "radius",
    string
  >
> = {
  public: {
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
  },
  admin: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    "primary-hover": "oklch(0.269 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    "secondary-hover": "oklch(0.922 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    "accent-hover": "oklch(0.922 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    "destructive-foreground": "oklch(0.985 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.708 0 0)",
    radius: "0.5rem",
  },
};

function readRule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = css.match(new RegExp(`${escapedSelector}\\s*\\{([^{}]*)\\}`));
  if (!rule) throw new Error(`Rule ${selector} not found in globals.css`);
  return rule[1]!;
}

function readToken(selector: string, token: string): string {
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = readRule(selector).match(
    new RegExp(`${escapedToken}\\s*:\\s*([^;]+);`),
  );
  if (!match) throw new Error(`Token ${token} not found in ${selector}`);
  return match[1]!.trim();
}

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
    expect(css).toContain("--color-primary: var(--primary);");
  });

  it("keeps the two document themes as the only authored semantic token scopes", () => {
    expect(css).toMatch(/\[data-theme="public"\]\s*\{/);
    expect(css).toMatch(/\[data-theme="admin"\]\s*\{/);
    expect(css).not.toMatch(/^\s*:root\s*\{/m);
    expect(css).not.toMatch(/^\s*\.dark\s*\{/m);
  });

  it("gates dark utilities behind an explicit class instead of OS preference", () => {
    expect(css).toContain("@custom-variant dark (&:where(.dark, .dark *));");
    expect(css).not.toMatch(/prefers-color-scheme\s*:\s*dark/);
  });

  it("defines every documented semantic token with its approved value", () => {
    for (const [theme, tokens] of Object.entries(EXPECTED_TOKENS) as [
      Theme,
      (typeof EXPECTED_TOKENS)[Theme],
    ][]) {
      const selector = `[data-theme="${theme}"]`;
      for (const [token, expectedValue] of Object.entries(tokens)) {
        expect(readToken(selector, `--${token}`)).toBe(expectedValue);
      }
    }
  });

  it("registers hover semantic roles as Tailwind color utilities", () => {
    expect(css).toContain("--color-primary-hover: var(--primary-hover);");
    expect(css).toContain("--color-secondary-hover: var(--secondary-hover);");
    expect(css).toContain("--color-accent-hover: var(--accent-hover);");
  });

  it("resets native admin controls without reintroducing global Preflight", () => {
    expect(css).toMatch(/body\[data-theme="admin"\]\s*\{[^}]*margin:\s*0;/s);
    expect(css).toMatch(
      /body\[data-theme="admin"\] :where\(button, input, select, textarea\)\s*\{[^}]*font:\s*inherit;/s,
    );
    expect(css).toMatch(
      /body\[data-theme="admin"\] :where\(button\)\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;/s,
    );
    expect(css).toMatch(
      /body\[data-theme="admin"\] :where\(ul, ol, menu\)\s*\{[^}]*list-style:\s*none;/s,
    );
    expect(css).toMatch(
      /body\[data-theme="admin"\] \*\s*\{[^}]*border-color:\s*var\(--border\);/s,
    );
  });
});

describe("landing hero CSS contract", () => {
  it("defines the scoped desktop three-layer composition", () => {
    expect(css).toMatch(
      /\.public-ui \.public-hero\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:[^;]*440px/s,
    );
    expect(css).toMatch(
      /\.public-ui \.public-hero__visual\s*\{[^}]*width:\s*440px;[^}]*height:\s*520px;[^}]*overflow:\s*hidden;/s,
    );
    expect(css).toMatch(
      /\.public-ui \.public-hero__accent\s*\{[^}]*width:\s*148px;[^}]*background:\s*var\(--primary\);/s,
    );
    expect(css).toMatch(
      /\.public-ui \.public-hero__image\s*\{[^}]*z-index:\s*1;[^}]*object-fit:\s*cover;/s,
    );
    expect(css).toMatch(
      /\.public-ui \.public-hero__accent\s*\{[^}]*z-index:\s*2;/s,
    );
    expect(css).toMatch(
      /\.public-ui \.public-hero__isotipo\s*\{[^}]*z-index:\s*3;/s,
    );
  });

  it("defines the compact-mobile dimensions and stacked layout", () => {
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-ui \.public-hero\s*\{[^}]*grid-template-columns:\s*1fr;/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-ui \.public-hero__visual\s*\{[^}]*width:\s*342px;[^}]*height:\s*252px;/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-ui \.public-hero__accent\s*\{[^}]*width:\s*92px;/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-ui \.public-hero__isotipo\s*\{[^}]*width:\s*220px;[^}]*height:\s*220px;/s,
    );
  });
});

describe("landing navbar CSS contract", () => {
  it("keeps navbar rules scoped to the public landing surface", () => {
    expect(css).toMatch(/\.public-ui \.landing-navbar\s*\{/);
    expect(css).toMatch(/\.public-ui \.landing-navbar__links\s*\{/);
    expect(css).not.toMatch(/^\s*\.landing-navbar\s*\{/m);
    expect(css).toMatch(
      /\.public-ui\.public-page#inicio\s*,[\s\S]*scroll-margin-block-start:\s*92px;/,
    );
    expect(css).not.toMatch(
      /\.landing-navbar[^{}]*\{[^}]*scroll-margin-block-start/s,
    );
  });

  it("defines desktop and compact-mobile framing with usable controls", () => {
    expect(css).toMatch(
      /\.public-ui \.landing-navbar\s*\{[^}]*min-height:\s*92px;[^}]*padding:\s*15px 120px;/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-ui \.landing-navbar\s*\{[^}]*min-height:\s*76px;[^}]*padding-inline:\s*24px;/s,
    );
    expect(css).toMatch(
      /\.public-ui \.landing-navbar__link,[\s\S]*\.public-ui \.landing-navbar__menu-toggle\s*\{[^}]*min-height:\s*44px;/s,
    );
    expect(css).toMatch(
      /\.public-ui \.landing-navbar__menu-toggle\s*\{[^}]*min-width:\s*44px;/s,
    );
  });

  it("defines enhanced menu state, focus-visible styling, and reduced motion", () => {
    expect(css).toMatch(
      /\.public-ui \.landing-navbar--enhanced \.landing-navbar__links\s*\{/,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar--enhanced\.landing-navbar--open\s+\.landing-navbar__links\s*\{/s,
    );
    expect(css).toMatch(
      /\.public-ui[\s\S]*?landing-navbar__menu-toggle\):focus-visible\s*\{/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.public-ui \.landing-navbar__links\s*\{/,
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*scroll-margin-block-start:\s*76px;/s,
    );
  });
});
