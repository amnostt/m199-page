/**
 * Config validation tests (BF-01, BF-02).
 *
 * Proves that validate() rejects missing keys and invalid PORT values
 * before any downstream module resolves `@m199/db`.
 */
import { describe, it, expect } from "vitest";
import { validate } from "./env.validation.js";

describe("config validation", () => {
  it("passes when all required keys are present and valid", () => {
    const result = validate({
      NODE_ENV: "development",
      PORT: "3000",
      DATABASE_URL: "postgresql://localhost/m199",
      JWT_SECRET: "test-jwt-secret",
    });

    expect(result.NODE_ENV).toBe("development");
    expect(result.PORT).toBe(3000);
    expect(result.DATABASE_URL).toBe("postgresql://localhost/m199");
    expect(result.JWT_SECRET).toBe("test-jwt-secret");
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() =>
      validate({
        NODE_ENV: "development",
        PORT: "3000",
        JWT_SECRET: "test-jwt-secret",
      }),
    ).toThrow("Missing required env var: DATABASE_URL");
  });

  it("throws when NODE_ENV is missing", () => {
    expect(() =>
      validate({
        PORT: "3000",
        DATABASE_URL: "postgresql://localhost/m199",
        JWT_SECRET: "test-jwt-secret",
      }),
    ).toThrow("Missing required env var: NODE_ENV");
  });

  it("throws when PORT is missing", () => {
    expect(() =>
      validate({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://localhost/m199",
        JWT_SECRET: "test-jwt-secret",
      }),
    ).toThrow("Missing required env var: PORT");
  });

  it("throws when PORT is not numeric", () => {
    expect(() =>
      validate({
        NODE_ENV: "development",
        PORT: "abc",
        DATABASE_URL: "postgresql://localhost/m199",
        JWT_SECRET: "test-jwt-secret",
      }),
    ).toThrow("PORT must be an integer between 1-65535");
  });

  it("throws when PORT is out of range", () => {
    expect(() =>
      validate({
        NODE_ENV: "development",
        PORT: "70000",
        DATABASE_URL: "postgresql://localhost/m199",
        JWT_SECRET: "test-jwt-secret",
      }),
    ).toThrow("PORT must be an integer between 1-65535");
  });

  it("rejects empty string values", () => {
    expect(() =>
      validate({
        NODE_ENV: "",
        PORT: "3000",
        DATABASE_URL: "postgresql://localhost/m199",
        JWT_SECRET: "test-jwt-secret",
      }),
    ).toThrow("Missing required env var: NODE_ENV");
  });

  it("throws when JWT_SECRET is missing", () => {
    expect(() =>
      validate({
        NODE_ENV: "development",
        PORT: "3000",
        DATABASE_URL: "postgresql://localhost/m199",
      }),
    ).toThrow("Missing required env var: JWT_SECRET");
  });
});
