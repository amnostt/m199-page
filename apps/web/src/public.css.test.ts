import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Source-loading helpers
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = resolve(HERE, "public.css");
const CSS_SOURCE = readFileSync(CSS_PATH, "utf8");

function readRule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = CSS_SOURCE.match(
    new RegExp(`${escapedSelector}[^{}]*\\{([^}]*)\\}`),
  );
  if (!rule) throw new Error(`Rule ${selector} not found in public.css`);
  return rule[1]!;
}

// ---------------------------------------------------------------------------
// Color parsing + WCAG contrast math
// ---------------------------------------------------------------------------

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): RGB | null {
  const cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length !== 6 && cleaned.length !== 3) return null;
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

/**
 * sRGB → linear conversion per WCAG 2.x.
 * See https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: string, bg: string): number {
  const fgRgb = parseHex(fg);
  const bgRgb = parseHex(bg);
  if (!fgRgb) throw new Error(`Cannot parse foreground color: ${fg}`);
  if (!bgRgb) throw new Error(`Cannot parse background color: ${bg}`);
  const l1 = relativeLuminance(fgRgb);
  const l2 = relativeLuminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

/** Read a CSS custom-property value from `.public-ui { ... }`. */
function readToken(name: string): string {
  // `name` includes the leading `--` already.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*:\\s*([^;]+);`);
  const match = CSS_SOURCE.match(re);
  if (!match) {
    throw new Error(`Token ${name} not found in public.css`);
  }
  return match[1]!.trim();
}

/** Pair a token name (declared in .public-ui) to its actual hex value. */
function tokenColor(name: string): string {
  const value = readToken(name);
  if (!parseHex(value)) {
    throw new Error(`Token --${name} is not a hex color: ${value}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Documented AA pairs
// ---------------------------------------------------------------------------

interface ContrastPair {
  label: string;
  fg: string;
  bg: string;
  minRatio: number;
}

const TEXT_PAIRS: ContrastPair[] = [
  {
    label: "body text on surface",
    fg: "--public-color-text",
    bg: "--public-color-surface",
    minRatio: 4.5,
  },
  {
    label: "muted text on surface",
    fg: "--public-color-text-muted",
    bg: "--public-color-surface",
    minRatio: 4.5,
  },
  {
    label: "primary text on surface",
    fg: "--public-color-primary",
    bg: "--public-color-surface",
    minRatio: 4.5,
  },
  {
    label: "primary text on primary background",
    fg: "--public-color-primary-text",
    bg: "--public-color-primary",
    minRatio: 4.5,
  },
  {
    label: "accent text on surface",
    fg: "--public-color-accent",
    bg: "--public-color-surface",
    minRatio: 4.5,
  },
];

// Non-text / UI components need 3:1 (WCAG AA 1.4.11).
const FOCUS_PAIRS: ContrastPair[] = [
  {
    label: "focus ring against surface",
    fg: "--public-color-focus-ring",
    bg: "--public-color-surface",
    minRatio: 3,
  },
  {
    label: "focus ring against surface-muted",
    fg: "--public-color-focus-ring",
    bg: "--public-color-surface-muted",
    minRatio: 3,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("public.css — public visual system contract", () => {
  // -----------------------------------------------------------------------
  // Token categories
  // -----------------------------------------------------------------------

  describe("token categories", () => {
    it("declares color tokens under .public-ui", () => {
      const colorTokens = [
        "--public-color-surface",
        "--public-color-surface-muted",
        "--public-color-surface-raised",
        "--public-color-text",
        "--public-color-text-muted",
        "--public-color-primary",
        "--public-color-primary-hover",
        "--public-color-primary-text",
        "--public-color-accent",
        "--public-color-border",
        "--public-color-border-strong",
        "--public-color-focus-ring",
        "--public-color-overlay",
      ];
      for (const token of colorTokens) {
        expect(() => readToken(token)).not.toThrow();
      }
    });

    it("declares typography tokens under .public-ui", () => {
      const typeTokens = [
        "--public-font-sans",
        "--public-font-display",
        "--public-text-base",
        "--public-text-lg",
        "--public-text-2xl",
        "--public-leading-normal",
        "--public-weight-medium",
      ];
      for (const token of typeTokens) {
        expect(() => readToken(token)).not.toThrow();
      }
    });

    it("declares spacing, radius, elevation, and interaction tokens", () => {
      const tokens = [
        "--public-space-1",
        "--public-space-4",
        "--public-space-12",
        "--public-radius-sm",
        "--public-radius-md",
        "--public-radius-full",
        "--public-shadow-sm",
        "--public-shadow-md",
        "--public-shadow-lg",
        "--public-transition",
        "--public-disabled-opacity",
      ];
      for (const token of tokens) {
        expect(() => readToken(token)).not.toThrow();
      }
    });

    it("scopes all token declarations inside the .public-ui rule", () => {
      // Tokens must live under .public-ui, not at :root or html/body.
      expect(CSS_SOURCE).not.toMatch(/^\s*:root\s*\{/m);
      expect(CSS_SOURCE).not.toMatch(/^\s*html\s*\{/m);
      const publicUiBlock = CSS_SOURCE.match(/\.public-ui\s*\{([\s\S]*?)\}/);
      expect(publicUiBlock, ".public-ui block must exist").toBeTruthy();
      expect(publicUiBlock![1]).toContain("--public-color-surface:");
      expect(publicUiBlock![1]).toContain("--public-color-focus-ring:");
    });
  });

  // -----------------------------------------------------------------------
  // AA text contrast
  // -----------------------------------------------------------------------

  describe("WCAG AA text contrast", () => {
    for (const pair of TEXT_PAIRS) {
      it(`${pair.label} meets ${pair.minRatio}:1`, () => {
        const fg = tokenColor(pair.fg);
        const bg = tokenColor(pair.bg);
        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `${pair.fg} (${fg}) on ${pair.bg} (${bg}) = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(pair.minRatio);
      });
    }
  });

  // -----------------------------------------------------------------------
  // Focus visibility + non-text contrast
  // -----------------------------------------------------------------------

  describe("WCAG non-text contrast (focus)", () => {
    for (const pair of FOCUS_PAIRS) {
      it(`${pair.label} meets ${pair.minRatio}:1`, () => {
        const fg = tokenColor(pair.fg);
        const bg = tokenColor(pair.bg);
        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `${pair.fg} (${fg}) on ${pair.bg} (${bg}) = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(pair.minRatio);
      });
    }

    it("declares a visible :focus-visible rule with a nontransparent outline", () => {
      expect(CSS_SOURCE).toMatch(/\.public-ui\s+:focus-visible\s*\{/);
      // Outline must be a solid (non-transparent) color token reference.
      const rule = CSS_SOURCE.match(
        /\.public-ui\s+:focus-visible\s*\{([^}]*)\}/,
      );
      expect(rule).toBeTruthy();
      expect(rule![1]).toMatch(
        /outline\s*:\s*\d+px\s+solid\s+var\(--public-color-focus-ring\)/,
      );
      expect(rule![1]).toMatch(/outline-offset\s*:\s*\d+px/);
    });
  });

  // -----------------------------------------------------------------------
  // Responsive hooks
  // -----------------------------------------------------------------------

  describe("responsive hooks", () => {
    it("uses mobile-first media queries with md: (>=768px) and lg: (>=1024px)", () => {
      expect(CSS_SOURCE).toMatch(/@media\s*\(min-width:\s*768px\)/);
      expect(CSS_SOURCE).toMatch(/@media\s*\(min-width:\s*1024px\)/);
    });

    it("scopes every @media block to .public-ui descendants", () => {
      const mediaBlocks =
        CSS_SOURCE.match(/@media[^{]+\{[\s\S]*?\}\s*\}/g) ?? [];
      expect(mediaBlocks.length).toBeGreaterThan(0);
      for (const block of mediaBlocks) {
        expect(block).toMatch(/\.public-ui/);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Reusable classes
  // -----------------------------------------------------------------------

  describe("reusable public classes", () => {
    const expectedDescendantClasses = [
      "public-section",
      "public-card",
      "public-card-list",
      "public-state",
      "public-prose",
      "public-action",
      "public-action--primary",
      "public-action--danger",
      "public-action-row",
      "public-media",
      "public-media--cover",
      "public-media--square",
      "public-hero",
      "public-tags",
      "public-verse",
    ];
    for (const cls of expectedDescendantClasses) {
      it(`declares .${cls} inside .public-ui`, () => {
        const re = new RegExp(
          `\\.public-ui\\s+\\.${cls.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\{`,
        );
        expect(
          CSS_SOURCE.match(re),
          `expected .public-ui .${cls} { ... } block`,
        ).toBeTruthy();
      });
    }

    // public-page is special: every public route renders the page root as
    // a single element that carries BOTH classes together
    // (`<main class="public-ui public-page">`). A descendant combinator
    // (`.public-ui .public-page`) would require a CHILD with `.public-page`
    // inside `.public-ui`, which the markup never produces — so the page
    // sizing/gutter intent would silently be dropped. The CSS contract MUST
    // use a compound selector. Verified here as both a positive and a
    // negative assertion so that any regression to the descendant form
    // fails the suite.
    it("declares .public-ui.public-page as a compound (not descendant) selector", () => {
      const compound = CSS_SOURCE.match(/\.public-ui\.public-page\s*\{/);
      expect(
        compound,
        "expected .public-ui.public-page { ... } compound block",
      ).toBeTruthy();
    });

    it("does not declare .public-ui .public-page as a descendant selector", () => {
      // Whitespace between the two class selectors denotes descendant; the
      // design requires the compound form only.
      const descendant = CSS_SOURCE.match(/\.public-ui\s+\.public-page\s*\{/);
      expect(
        descendant,
        "expected no .public-ui .public-page { ... } descendant block",
      ).toBeNull();
    });

    it("provides a public-state modifier for errors", () => {
      expect(CSS_SOURCE).toMatch(/\.public-state--error\s*\{/);
    });
  });

  // -----------------------------------------------------------------------
  // Overflow prevention — box-sizing + min-content/wrapping contracts
  //
  // The public visual system deliberately omits Tailwind's preflight to keep
  // the admin UI unchanged. Preflight normally provides a global
  // `box-sizing: border-box` reset and constrained wrapping for unbroken
  // user-controlled content.
  // Both must be restored, scoped to .public-ui, otherwise padding and border
  // on .public-page / .public-hero / .public-card / .public-action / etc. add
  // to the element's declared width and produce the horizontal overflow
  // observed at 320px and >=1024px. Regression coverage lives here so the
  // overflow root cause cannot return without failing the suite.
  // -----------------------------------------------------------------------

  describe("overflow prevention contracts", () => {
    it("declares box-sizing: border-box on .public-ui and all its descendants", () => {
      // The reset MUST be scoped to .public-ui (admin isolation) and MUST
      // include the universal child selector so padding/border are included
      // in every descendant's width. Mutation check: removing the rule or
      // dropping the `*` from the selector list lets .public-page overflow
      // the viewport at 320px and lets .public-card overflow its grid
      // column at >=1024px.
      const resetRule = CSS_SOURCE.match(
        /\.public-ui\s*,\s*\.public-ui\s*\*[\s\S]*?\{([^{}]*)\}/,
      );
      expect(
        resetRule,
        "expected a .public-ui, .public-ui * { ... } reset rule",
      ).toBeTruthy();
      expect(resetRule![1]).toMatch(/box-sizing\s*:\s*border-box/);
    });

    it("scopes the box-sizing reset to .public-ui so admin is unaffected", () => {
      // The reset MUST live inside the .public-ui selector list. A top-level
      // `*, *::before, *::after { box-sizing: border-box; }` would re-style
      // the admin tree, which the spec explicitly forbids.
      const topLevelUniversal = CSS_SOURCE.match(
        /^\s*\*\s*,\s*\*::before\s*,\s*\*::after\s*\{/m,
      );
      expect(
        topLevelUniversal,
        "expected no top-level universal box-sizing reset",
      ).toBeNull();
    });

    it("allows public cards to shrink inside card-list grid tracks", () => {
      expect(readRule(".public-ui .public-card")).toMatch(/min-width\s*:\s*0/);
    });

    it("uses overflow-wrap: anywhere for sanitized prose and action labels", () => {
      // Sanitized post content may contain long URLs or pasted tokens that
      // have no natural wrap opportunity. `anywhere` also reduces min-content
      // width so the card can fit its grid track.
      expect(readRule(".public-ui .public-prose")).toMatch(
        /overflow-wrap\s*:\s*anywhere/,
      );
      const actionBlock = readRule(".public-ui .public-action");
      expect(actionBlock).toMatch(/max-width\s*:\s*100%/);
      expect(actionBlock).toMatch(/overflow-wrap\s*:\s*anywhere/);
    });

    it("uses overflow-wrap: anywhere for public user-controlled text", () => {
      const selectors = [
        ".public-ui .public-section > h1",
        ".public-ui .public-section > h2",
        ".public-ui .public-section > h3",
        ".public-ui .public-section > p",
        ".public-ui .public-card > h1",
        ".public-ui .public-card > h2",
        ".public-ui .public-card > h3",
        ".public-ui .public-card > p",
        ".public-ui .public-hero h1",
        ".public-ui .public-hero p",
        ".public-ui .public-tags li",
        ".public-ui .public-verse blockquote",
        ".public-ui .public-verse cite",
      ];

      for (const selector of selectors) {
        expect(readRule(selector)).toMatch(/overflow-wrap\s*:\s*anywhere/);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Preflight isolation
  // -----------------------------------------------------------------------

  describe("Tailwind isolation (no preflight, no global reset)", () => {
    it("imports only theme.css and utilities.css, not preflight.css", () => {
      expect(CSS_SOURCE).toMatch(
        /@import\s+["']tailwindcss\/theme\.css["']\s+layer\(theme\)/,
      );
      expect(CSS_SOURCE).toMatch(
        /@import\s+["']tailwindcss\/utilities\.css["']\s+layer\(utilities\)/,
      );
      expect(CSS_SOURCE).not.toMatch(
        /@import\s+["']tailwindcss\/preflight\.css["']/,
      );
    });

    it("does not declare an unscoped * or html/body reset", () => {
      // `*` selector at top level (not nested under .public-ui)
      const topLevelStar = CSS_SOURCE.match(/^\s*\*\s*\{/m);
      expect(
        topLevelStar,
        "expected no top-level `* { ... }` selector",
      ).toBeNull();

      // `body` selector at top level
      const topLevelBody = CSS_SOURCE.match(/^\s*body\s*\{/m);
      expect(
        topLevelBody,
        "expected no top-level `body { ... }` selector",
      ).toBeNull();

      // `html` selector at top level
      const topLevelHtml = CSS_SOURCE.match(/^\s*html\s*\{/m);
      expect(
        topLevelHtml,
        "expected no top-level `html { ... }` selector",
      ).toBeNull();
    });

    it("keeps every authored selector nested under .public-ui", () => {
      // Heuristic: for any `{` opener outside the @import statements, the
      // selector(s) preceding it must reference `.public-ui`.
      const withoutImports = CSS_SOURCE.replace(/@import[^;]+;/g, "");
      // Strip layer declarations which are not selectors.
      const withoutLayers = withoutImports.replace(/@layer[^;]+;/g, "");
      // Collect all CSS rule blocks: selector { ... }
      const ruleRegex = /([^{}]+?)\{([^{}]*)\}/g;
      let match: RegExpExecArray | null;
      while ((match = ruleRegex.exec(withoutLayers)) !== null) {
        const selector = match[1]!.trim();
        if (selector === "") continue;
        if (selector.startsWith("@")) continue; // @media etc.
        if (!selector.includes(".public-ui")) {
          throw new Error(
            `Selector "${selector}" is not nested under .public-ui`,
          );
        }
      }
    });
  });
});
