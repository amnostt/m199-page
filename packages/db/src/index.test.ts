import { describe, it, expect } from "vitest";
import { DB_PACKAGE_VERSION } from "./index.js";

describe("@m199/db — smoke test", () => {
  it("exports a known package version", () => {
    expect(DB_PACKAGE_VERSION).toBe("0.0.0");
  });
});
