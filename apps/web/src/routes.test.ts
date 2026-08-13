// @vitest-environment node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pages = resolve(dirname(fileURLToPath(import.meta.url)), "pages");

function routeEntries() {
  return readdirSync(pages)
    .filter((name) => !name.endsWith(".test.ts"))
    .sort();
}

describe("Astro route ownership", () => {
  it("defines the public landing, the admin application, and an explicit 404", () => {
    expect(routeEntries()).toEqual([
      "404.astro",
      "admin.astro",
      "index.astro",
      "misiones",
      "publicaciones",
    ]);
    for (const name of ["misiones", "publicaciones"]) {
      expect(statSync(resolve(pages, name)).isDirectory()).toBe(true);
    }
  });

  it("hydrates React only for the admin application", () => {
    const admin = readFileSync(resolve(pages, "admin.astro"), "utf8");
    const publicPages = ["index.astro", "404.astro"].map((path) =>
      readFileSync(resolve(pages, path), "utf8"),
    );

    expect(admin).toMatch(/<AdminApp client:load\s*\/>/);
    for (const source of publicPages) expect(source).not.toMatch(/client:/);
  });
});
