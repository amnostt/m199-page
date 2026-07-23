// @vitest-environment node
//
// PR3 root rendering — source-level tests for `pages/index.astro`.
//
// Verifies the page is a thin wrapper that reuses the existing
// public CSS, delegates presentation to the `Landing` component,
// consumes the PR2 `fetchLandingPublicPayload` helper, and sets a
// 503 status on failure without leaking error details. The
// Container API is not used because the page reads
// `import.meta.env.ASTRO_API_BASE_URL` and calls `fetch`; the
// helper's failure mapping is already covered by focused unit
// tests. End-to-end SSR proof is left to PR4.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = HERE;
const PAGE_PATH = resolve(HERE, "index.astro");
const LANDING_PATH = resolve(HERE, "../components/landing/Landing.astro");
const PUBLIC_CSS_PATH = resolve(HERE, "../public.css");

const PAGE_SOURCE = readFileSync(PAGE_PATH, "utf8");

/**
 * Strip comments so the leakage/scope checks look at actual code,
 * not at explanatory text that intentionally references out-of-scope
 * names (e.g. `admin` in a doc comment). The runtime surface is
 * what matters.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*\*[\s\S]*?\*\//g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const PAGE_CODE = stripComments(PAGE_SOURCE);

function exists(path: string): boolean {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}

describe("pages/index.astro — imports and delegation", () => {
  it("imports the existing public.css, Landing, and PR2 helpers", () => {
    expect(PAGE_SOURCE).toMatch(/import\s+["']\.\.\/public\.css["']/);
    expect(PAGE_SOURCE).toMatch(
      /import\s+Landing\s+from\s+["']\.\.\/components\/landing\/Landing\.astro["']/,
    );
    expect(PAGE_SOURCE).toMatch(
      /import\s+\{[^}]*fetchLandingPublicPayload[^}]*\}\s+from\s+["']\.\.\/lib\/server\/landing\.js["']/,
    );
    expect(PAGE_SOURCE).toMatch(/LandingFetchError/);
    expect(PAGE_SOURCE).toMatch(
      /import\s+\{[^}]*resolveApiBaseUrl[^}]*\}\s+from\s+["']\.\.\/lib\/server\/env\.js["']/,
    );
  });

  it("reuses the Landing component instead of duplicating the markup", () => {
    expect(PAGE_SOURCE).toMatch(
      /<Landing\s+payload=\{payload\}\s+failure=\{failure\}\s*\/>/,
    );
    expect(PAGE_CODE).not.toMatch(/class="public-hero"/);
    expect(PAGE_CODE).not.toMatch(/<iframe/);
    expect(PAGE_CODE).not.toMatch(/public-state--error/);
  });

  it("emits one complete document shell around both landing outcomes", () => {
    expect(PAGE_CODE).toMatch(/<html\s+lang=["']es["']>/);
    expect(PAGE_CODE).toMatch(/<head>/);
    expect(PAGE_CODE).toMatch(/<meta\s+charset=["']utf-8["']\s*\/>/);
    expect(PAGE_CODE).toMatch(
      /<meta\s+name=["']viewport["']\s+content=["']width=device-width["']\s*\/>/,
    );
    expect(PAGE_CODE).toMatch(/<title>Misión 1-99<\/title>/);
    expect(PAGE_CODE).toMatch(
      /<body>\s*<Landing\s+payload=\{payload\}\s+failure=\{failure\}\s*\/>\s*<\/body>/,
    );
  });

  it("references files that exist on disk", () => {
    expect(exists(PAGE_PATH)).toBe(true);
    expect(exists(LANDING_PATH)).toBe(true);
    expect(exists(PUBLIC_CSS_PATH)).toBe(true);
  });
});

describe("pages/index.astro — 503 failure mapping", () => {
  it("calls the PR2 helper with the validated env base URL", () => {
    expect(PAGE_CODE).toMatch(
      /payload\s*=\s*await\s+fetchLandingPublicPayload\(\s*\{\s*apiBaseUrl\s*\}\s*\)/,
    );
  });

  it("maps LandingFetchError reasons and collapses everything else", () => {
    expect(PAGE_CODE).toMatch(/catch\s*\(\s*cause\s*\)/);
    expect(PAGE_CODE).toMatch(/cause\s+instanceof\s+LandingFetchError/);
    expect(PAGE_CODE).toMatch(
      /cause\s+instanceof\s+LandingFetchError\s*\?\s*cause\.reason\s*:\s*["']fetch_error["']/,
    );
  });

  it("sets Astro.response.status to 503 with a generic status text", () => {
    expect(PAGE_CODE).toMatch(/Astro\.response\.status\s*=\s*503/);
    expect(PAGE_CODE).toMatch(
      /Astro\.response\.statusText\s*=\s*["']Service Unavailable["']/,
    );
  });

  it("never echoes the cause into the rendered output", () => {
    for (const leak of ["cause.message", "cause.stack", "cause.status"]) {
      expect(PAGE_CODE).not.toMatch(new RegExp(leak));
    }
    // The failure copy is owned by the Landing component.
    expect(PAGE_CODE).not.toMatch(/public-state--error/);
  });
});

describe("pages/index.astro — narrow scope", () => {
  it("contains exactly one Astro page file under src/pages", () => {
    const entries = readdirSync(PAGES_DIR).filter((entry) =>
      statSync(resolve(PAGES_DIR, entry)).isFile(),
    );
    const astroPages = entries.filter((entry) => entry.endsWith(".astro"));
    expect(astroPages).toEqual(["index.astro"]);
  });

  it("does not import any admin, API, or DB modules", () => {
    const importLines = PAGE_CODE.split("\n").filter((line) =>
      /^\s*import\s/.test(line),
    );
    for (const line of importLines) {
      expect(line).not.toMatch(/admin/);
      expect(line).not.toMatch(/@m199\/api/);
      expect(line).not.toMatch(/PrismaClient|prisma/);
      expect(line).not.toMatch(/DbService/);
    }
  });
});
