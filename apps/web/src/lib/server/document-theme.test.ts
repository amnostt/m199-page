// @vitest-environment node

import { describe, expect, it } from "vitest";
import { resolveDocumentTheme } from "./document-theme.js";

describe("resolveDocumentTheme", () => {
  it.each(["/admin", "/admin/", "/admin/posts", "/admin/posts/new"])(
    "selects the admin theme for %s",
    (pathname) => {
      expect(resolveDocumentTheme(pathname)).toBe("admin");
    },
  );

  it.each(["/", "/posts", "/outings", "/administrator"])(
    "selects the public theme for %s",
    (pathname) => {
      expect(resolveDocumentTheme(pathname)).toBe("public");
    },
  );
});
