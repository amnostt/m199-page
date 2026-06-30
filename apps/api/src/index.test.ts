import { describe, it, expect } from "vitest";
import { API_PACKAGE_VERSION } from "./index.js";

describe("@m199/api — smoke test", () => {
  it("exports a known package version", () => {
    expect(API_PACKAGE_VERSION).toBe("0.0.0");
  });
});
