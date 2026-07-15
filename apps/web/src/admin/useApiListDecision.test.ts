import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ADMIN_DIR = dirname(fileURLToPath(import.meta.url));
const OUTINGS_LIST_PAGE = resolve(ADMIN_DIR, "OutingsListPage.tsx");

describe("useApiListDecision - module absence", () => {
  it("does not ship a useApiList module in apps/web/src/admin", () => {
    expect(existsSync(resolve(ADMIN_DIR, "useApiList.ts"))).toBe(false);
    expect(existsSync(resolve(ADMIN_DIR, "useApiList.tsx"))).toBe(false);
  });
});

describe("useApiListDecision - state ownership in OutingsListPage", () => {
  it("does not import a useApiList hook", () => {
    const source = readFileSync(OUTINGS_LIST_PAGE, "utf8");

    expect(source).not.toMatch(/from\s+["']\.\/useApiList/);
    expect(source).not.toMatch(/from\s+["']\.\/useApiList\.js["']/);
    expect(source).not.toMatch(/\buseApiList\b/);
  });

  it("owns its loading, error, and data state inline", () => {
    const source = readFileSync(OUTINGS_LIST_PAGE, "utf8");

    expect(source).toMatch(/useState<OutingAdmin\[\]\s*\|\s*null>/);
    expect(source).toMatch(/useState<OutingsFilter>/);
    expect(source).toMatch(/useState<Record<string,\s*ActionState>>/);
    expect(source).toMatch(/useState<Record<string,\s*string>>/);
    expect(source).toMatch(/useState\(false\)/);
  });
});
