// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = resolve(HERE, "[...path].astro");
const PAGE_SOURCE = readFileSync(PAGE_PATH, "utf8");

describe("pages/[...path].astro — React route bridge", () => {
  it("mounts the existing App through Astro's React integration", () => {
    expect(PAGE_SOURCE).toMatch(
      /import\s+\{\s*App\s*\}\s+from\s+["']\.\.\/App\.js["']/,
    );
    expect(PAGE_SOURCE).toMatch(
      /<App\s+pathname=\{Astro\.url\.pathname\}\s+client:load\s*\/>/,
    );
  });

  it("keeps the document shell and public CSS available to interactive public routes", () => {
    expect(PAGE_SOURCE).toMatch(/import\s+["']\.\.\/public\.css["']/);
    expect(PAGE_SOURCE).toMatch(/<html\s+lang=["']es["']>/);
    expect(PAGE_SOURCE).toMatch(/<title>Misión 1-99<\/title>/);
  });
});
