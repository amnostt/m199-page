// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pages = resolve(dirname(fileURLToPath(import.meta.url)), "pages");

describe("Astro route ownership", () => {
  it("defines every public route, the admin application, and an explicit 404", () => {
    expect(readdirSync(pages).sort()).toEqual([
      "404.astro",
      "admin.astro",
      "index.astro",
      "outings",
      "posts",
    ]);
    expect(readdirSync(resolve(pages, "posts")).sort()).toEqual([
      "[slug].astro",
      "index.astro",
    ]);
    expect(readdirSync(resolve(pages, "outings")).sort()).toEqual([
      "[slug].astro",
      "index.astro",
    ]);
  });

  it("hydrates React only for the admin application and outing likes", () => {
    const admin = readFileSync(resolve(pages, "admin.astro"), "utf8");
    const outing = readFileSync(resolve(pages, "outings/[slug].astro"), "utf8");
    const publicPages = [
      "index.astro",
      "posts/index.astro",
      "posts/[slug].astro",
      "outings/index.astro",
      "404.astro",
    ].map((path) => readFileSync(resolve(pages, path), "utf8"));

    expect(admin).toMatch(/<AdminApp client:load\s*\/>/);
    expect(outing).toMatch(/<LikeButton[\s\S]*client:load\s*\/>/);
    for (const source of publicPages) expect(source).not.toMatch(/client:/);
  });
});
