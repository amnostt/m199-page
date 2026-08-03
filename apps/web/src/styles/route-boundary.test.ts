// ---------------------------------------------------------------------------
// Route boundary contract.
//
// Enforces that the Astro web app's public and admin routes own
// different stylesheets, that the shared globals.css is gone, and that
// the admin route carries the portal host markup Phase 2 will resolve
// against. The AdminLogin/AdminShell test IDs and content are already
// covered by AdminApp.test.tsx and AdminShell.test.tsx — this file
// focuses on the file-system and Astro route boundary only.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const stylesDir = here;
const webRoot = resolve(here, "..", "..");
const layoutsDir = resolve(webRoot, "src", "layouts");
const pagesDir = resolve(webRoot, "src", "pages");
const componentsJsonPath = resolve(webRoot, "components.json");

function readIfExists(path: string): string | null {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

describe("route boundary: shared globals.css is gone", () => {
  it("removes apps/web/src/styles/globals.css", () => {
    expect(existsSync(resolve(stylesDir, "globals.css"))).toBe(false);
  });

  it("removes the obsolete globals.css test file", () => {
    expect(existsSync(resolve(stylesDir, "globals.css.test.ts"))).toBe(false);
  });
});

describe("route boundary: per-route stylesheets exist", () => {
  it("creates apps/web/src/styles/admin.css", () => {
    expect(existsSync(resolve(stylesDir, "admin.css"))).toBe(true);
  });

  it("creates apps/web/src/styles/public.css", () => {
    expect(existsSync(resolve(stylesDir, "public.css"))).toBe(true);
  });
});

describe("route boundary: PublicLayout imports public.css only", () => {
  const layoutPath = resolve(layoutsDir, "PublicLayout.astro");
  const layout = readIfExists(layoutPath) ?? "";

  it("loads from disk", () => {
    expect(layout).not.toBe("");
  });

  it("imports public.css", () => {
    expect(layout).toMatch(/import\s+["'][^"']*styles\/public\.css["']/);
  });

  it("does not import the removed globals.css", () => {
    expect(layout).not.toMatch(/styles\/globals\.css/);
  });

  it("does not import admin.css into the public route", () => {
    expect(layout).not.toMatch(/styles\/admin\.css/);
  });

  it("marks the public theme on body", () => {
    expect(layout).toMatch(/data-theme="public"/);
  });
});

describe("route boundary: admin.astro imports admin.css and emits the portal host", () => {
  const adminPath = resolve(pagesDir, "admin.astro");
  const admin = readIfExists(adminPath) ?? "";

  it("loads from disk", () => {
    expect(admin).not.toBe("");
  });

  it("imports admin.css", () => {
    expect(admin).toMatch(/import\s+["'][^"']*styles\/admin\.css["']/);
  });

  it("does not import the removed globals.css", () => {
    expect(admin).not.toMatch(/styles\/globals\.css/);
  });

  it("does not import public.css into the admin route", () => {
    expect(admin).not.toMatch(/styles\/public\.css/);
  });

  it("marks the admin theme on body", () => {
    expect(admin).toMatch(/data-theme="admin"/);
  });

  it("emits the admin portal host markup Phase 2 will resolve", () => {
    expect(admin).toMatch(/id="admin-portal-root"/);
  });

  it("still mounts AdminApp via client:load", () => {
    expect(admin).toMatch(/AdminApp\s+client:load/);
  });
});

describe("route boundary: components.json points shadcn at admin.css", () => {
  const json = readIfExists(componentsJsonPath) ?? "{}";
  const parsed = JSON.parse(json) as {
    style?: string;
    iconLibrary?: string;
    tailwind?: { css?: string; baseColor?: string };
  };

  it("declares admin.css as the canonical shadcn CSS owner", () => {
    expect(parsed.tailwind?.css).toBe("src/styles/admin.css");
  });

  it("keeps the neutral base color", () => {
    expect(parsed.tailwind?.baseColor).toBe("neutral");
  });

  it("keeps the base-nova style and lucide icon library", () => {
    expect(parsed.style).toBe("base-nova");
    expect(parsed.iconLibrary).toBe("lucide");
  });
});
