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
    background: "#fff8f7",
    foreground: "#1e1b1b",
    card: "#ffffff",
    "card-foreground": "#1e1b1b",
    popover: "#ffffff",
    "popover-foreground": "#1e1b1b",
    primary: "#bb0004",
    "primary-foreground": "#ffffff",
    "primary-hover": "#930002",
    secondary: "#fecb00",
    "secondary-foreground": "#241a00",
    "secondary-hover": "#e5b800",
    muted: "#f4ecec",
    "muted-foreground": "#5d3f3b",
    accent: "#00855b",
    "accent-foreground": "#ffffff",
    "accent-hover": "#006947",
    destructive: "#ba1a1a",
    "destructive-foreground": "#ffffff",
    border: "#e7bdb7",
    input: "#926f69",
    ring: "#006947",
    radius: "0.5rem",
  },
  admin: {
    background: "#f7f7f8",
    foreground: "#1f2937",
    card: "#ffffff",
    "card-foreground": "#1f2937",
    popover: "#ffffff",
    "popover-foreground": "#1f2937",
    primary: "#1d4ed8",
    "primary-foreground": "#ffffff",
    "primary-hover": "#1e40af",
    secondary: "#e5e7eb",
    "secondary-foreground": "#1f2937",
    "secondary-hover": "#d1d5db",
    muted: "#f3f4f6",
    "muted-foreground": "#4b5563",
    accent: "#dbeafe",
    "accent-foreground": "#1e40af",
    "accent-hover": "#bfdbfe",
    destructive: "#b91c1c",
    "destructive-foreground": "#ffffff",
    border: "#d1d5db",
    input: "#d1d5db",
    ring: "#2563eb",
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
});
