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

  it("scopes document and root spacing changes to the landing", () => {
    const css = readPublic();
    expect(
      readToken(css, 'body[data-theme="public"].landing-body', "margin"),
    ).toBe("0");
    expect(readToken(css, ".public-ui.public-page", "padding")).toBe(
      "0 var(--public-page-gutter)",
    );
    expect(
      readToken(css, ".public-ui.public-page.landing-page", "padding"),
    ).toBe("0");
  });
});

describe("public.css landing hero contract", () => {
  it("defines the scoped OpenDesign hero composition with fixed bg + foreground + isotype layers", () => {
    const css = readPublic();
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero\s*\{[^}]*position:\s*relative;[^}]*isolation:\s*isolate;[^}]*overflow:\s*hidden;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__background\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*z-index:\s*-1;[^}]*background-image:[^;]*hero-bg\.png/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__visual\s*\{[^}]*position:\s*relative;[^}]*min-height:\s*620px;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__image\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*2;[^}]*width:\s*94\.3%;[^}]*aspect-ratio:\s*1;[^}]*object-fit:\s*cover;[^}]*object-position:\s*center/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__isotipo\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*3;[^}]*transform:\s*rotate\(-8deg\)/s,
    );
  });

  it("centers desktop copy without adding global bottom space and anchors the visual", () => {
    const css = readPublic();
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero\s*\{[^}]*padding-block:\s*76px\s+0;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__copy\s*\{[^}]*align-self:\s*center;[^}]*padding-block-end:\s*104px;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__grid\s*\{[^}]*align-items:\s*center;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.public-hero__visual\s*\{[^}]*align-self:\s*end;/s,
    );
  });

  it("defines the compact-mobile stacked layout with a single-column grid", () => {
    const css = readPublic();
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.public-hero\s*\{[^}]*padding-block:\s*48px\s+72px;/s,
    );
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.public-hero__grid\s*\{[^}]*grid-template-columns:\s*1fr;/s,
    );
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.public-hero__isotipo\s*\{[^}]*width:\s*96px;[^}]*height:\s*96px;/s,
    );
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.public-hero__image\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*aspect-ratio:\s*1;/s,
    );
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.public-hero__copy\s*\{[^}]*padding-block-end:\s*0;/s,
    );
  });

  it("offsets only the enhanced mobile hero by the fixed header height", () => {
    const css = readPublic();
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.landing-navbar--enhanced\s*~\s*\.public-hero\s*\{[^}]*padding-block-start:\s*calc\(76px\s*\+\s*48px\);/s,
    );
  });
});

describe("public.css landing navbar contract", () => {
  it("keeps navbar rules scoped to the public landing surface", () => {
    const css = readPublic();
    expect(css).toMatch(/\.public-ui\s+\.landing-navbar\s*\{/);
    expect(css).toMatch(/\.public-ui\s+\.landing-navbar__links\s*\{/);
    expect(css).not.toMatch(/^\s*\.landing-navbar\s*\{/m);
    // The page wrapper id changed from `#inicio` to `#contenido` so
    // the skip link can resolve to a unique target.
    expect(css).toMatch(/\.public-ui[\s\S]*scroll-margin-block-start:\s*92px;/);
    expect(css).not.toMatch(
      /\.landing-navbar[^{}]*\{[^}]*scroll-margin-block-start/s,
    );
  });

  it("defines the fixed header with desktop and compact-mobile framing", () => {
    const css = readPublic();
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar\s*\{[^}]*position:\s*fixed;[^}]*min-height:\s*92px;[^}]*background:\s*transparent;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar--scrolled\s*\{[^}]*background:\s*rgb\(17\s+17\s+17/,
    );
    expect(css).toMatch(
      /@media\s+\(max-width:\s*767px\)[\s\S]*\.public-ui\s+\.landing-navbar\s*\{[^}]*min-height:\s*76px;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar__link,[\s\S]*\.public-ui\s+\.landing-navbar__menu-toggle\s*\{[^}]*min-height:\s*44px;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar__menu-toggle\s*\{[^}]*min-width:\s*44px;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar__logo-frame\s+img\s*\{[^}]*object-fit:\s*cover;[^}]*object-position:\s*center\s+43%;/s,
    );
  });

  it("defines the skip link, enhanced menu state, focus-visible styling, and reduced motion", () => {
    const css = readPublic();
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar__skip\s*\{[^}]*position:\s*absolute;[^}]*inset-block-start:\s*-64px;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar--enhanced[\s\S]*?landing-navbar__menu-toggle\s*\{/,
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

  it("uses an opaque design token for the open and no-JS mobile menu", () => {
    const css = readPublic();
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar--open,[\s\S]*\.landing-navbar:not\(\.landing-navbar--enhanced\)\s*\{[^}]*background:\s*var\(--popover\);/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-navbar--open\s+\.landing-navbar__links,[\s\S]*\.landing-navbar:not\(\.landing-navbar--enhanced\)\s+\.landing-navbar__links\s*\{[^}]*background:\s*var\(--popover\);/s,
    );
  });
});

describe("public.css landing scroll-snap missions contract", () => {
  it("defines the horizontal scroll-snap carousel with derived-card composition", () => {
    const css = readPublic();
    expect(css).toMatch(
      /\.public-ui\s+\.landing-missions\s*\{[^}]*padding-block-end:\s*0;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-missions__track\s*\{[^}]*scroll-snap-type:\s*x\s+mandatory;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-missions__carousel\s*\{[^}]*width:\s*min\([^;]+var\(--public-shell-max\)\);[^}]*margin:\s*4rem\s+auto\s+0/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-missions__track\s*\{[^}]*scrollbar-color:\s*var\(--secondary\)\s+var\(--card\)/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-missions__track::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--secondary\)/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-missions__item\s*\{[^}]*scroll-snap-align:\s*start;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-mission-card__index\s*\{[^}]*font-family:\s*var\(--font-display\)/s,
    );
    expect(css).toMatch(
      /@media\s+\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.public-ui\s+\.landing-missions__track\s*\{[^}]*scroll-behavior:\s*auto/s,
    );
  });
});

describe("public.css landing OpenDesign blocks contract", () => {
  it("defines the verse, banner, about gallery, publications entry, and unconditional footer", () => {
    const css = readPublic();
    expect(css).toMatch(
      /\.public-ui\s+\.landing-verse\s*\{[^}]*background:\s*var\(--secondary\);[^}]*border-block:\s*1px\s+solid\s+var\(--secondary-foreground\)/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-verse::before\s*\{[^}]*content:\s*"“";[^}]*opacity:\s*0\.78/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-verse__inner\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[^}]*width:\s*min\([^;]+var\(--public-shell-max\)\);[^}]*padding-inline-start:\s*68px/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-banner\s*\{[^}]*height:\s*clamp\(360px,\s*50vw,\s*560px\)/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-banner::after\s*\{[^}]*height:\s*42%;[^}]*background:\s*linear-gradient\(transparent,\s*var\(--background\)\);[^}]*pointer-events:\s*none/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-about__gallery\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.02fr\)\s*minmax\(0,\s*0\.78fr\);[^}]*grid-template-rows:\s*214px\s+214px/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-about__figure:nth-child\(1\)\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*1\s*\/\s*span\s*2/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-about__inner\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*0\.9fr\);[^}]*width:\s*min\([^;]+var\(--public-shell-max\)\)/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-about\s*\{[^}]*margin-block:\s*0;/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-publications__link\s*\{[^}]*display:\s*inline-flex/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-publications__inner\s*\{[^}]*width:\s*min\([^;]+var\(--public-shell-max\)\);[^}]*margin-inline:\s*auto/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-publications\s*\{[^}]*isolation:\s*isolate;[^}]*background:\s*#fff/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-publications::before\s*\{[^}]*url\("\/assets\/redesign\/bg-posts\.jpg"\);[^}]*filter:\s*grayscale\(1\)\s+blur\(2px\);[^}]*opacity:\s*0\.54/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-footer\s*\{[^}]*display:\s*flex;[^}]*background:\s*#111;/s,
    );
    expect(css).not.toMatch(/\.public-ui\s+\.landing-footer\s*\{[^}]*50vw/s);
    expect(css).toMatch(
      /\.public-ui\s+\.landing-contact__inner\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.35fr\)\s+minmax\(20rem,\s*1fr\);[^}]*width:\s*min\([^;]+var\(--public-shell-max\)\)/s,
    );
    expect(css).toMatch(
      /\.public-ui\s+\.landing-contact\s*\{[^}]*margin-block:\s*0;/s,
    );
  });
});
