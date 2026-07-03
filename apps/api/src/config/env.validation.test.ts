/**
 * Config validation tests (BF-01, BF-02, OUT-07).
 *
 * Proves that validate() rejects missing keys and invalid PORT values
 * before any downstream module resolves `@m199/db`.
 * OUT-07: startup fails when VISITOR_HASH_SECRET is unset.
 */
import { describe, it, expect } from "vitest";
import { validate } from "./env.validation.js";

const MINIMAL_VALID_CONFIG = {
  NODE_ENV: "development",
  PORT: "3000",
  DATABASE_URL: "postgresql://localhost/m199",
  JWT_SECRET: "test-jwt-secret",
  VISITOR_HASH_SECRET: "test-visitor-hash-secret",
} as const;

describe("config validation", () => {
  it("passes when all required keys are present and valid", () => {
    const result = validate(MINIMAL_VALID_CONFIG);

    expect(result.NODE_ENV).toBe("development");
    expect(result.PORT).toBe(3000);
    expect(result.DATABASE_URL).toBe("postgresql://localhost/m199");
    expect(result.JWT_SECRET).toBe("test-jwt-secret");
    expect(result.VISITOR_HASH_SECRET).toBe("test-visitor-hash-secret");
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() =>
      validate({
        ...MINIMAL_VALID_CONFIG,
        DATABASE_URL: undefined,
      }),
    ).toThrow("Missing required env var: DATABASE_URL");
  });

  it("throws when NODE_ENV is missing", () => {
    expect(() =>
      validate({
        ...MINIMAL_VALID_CONFIG,
        NODE_ENV: undefined,
      }),
    ).toThrow("Missing required env var: NODE_ENV");
  });

  it("throws when PORT is missing", () => {
    expect(() =>
      validate({
        ...MINIMAL_VALID_CONFIG,
        PORT: undefined,
      }),
    ).toThrow("Missing required env var: PORT");
  });

  it("throws when PORT is not numeric", () => {
    expect(() =>
      validate({
        ...MINIMAL_VALID_CONFIG,
        PORT: "abc",
      }),
    ).toThrow("PORT must be an integer between 1-65535");
  });

  it("throws when PORT is out of range", () => {
    expect(() =>
      validate({
        ...MINIMAL_VALID_CONFIG,
        PORT: "70000",
      }),
    ).toThrow("PORT must be an integer between 1-65535");
  });

  it("rejects empty string values", () => {
    expect(() =>
      validate({
        ...MINIMAL_VALID_CONFIG,
        NODE_ENV: "",
      }),
    ).toThrow("Missing required env var: NODE_ENV");
  });

  it("throws when JWT_SECRET is missing", () => {
    expect(() =>
      validate({
        ...MINIMAL_VALID_CONFIG,
        JWT_SECRET: undefined,
      }),
    ).toThrow("Missing required env var: JWT_SECRET");
  });

  it("throws when VISITOR_HASH_SECRET is missing (OUT-07)", () => {
    expect(() =>
      validate({
        ...MINIMAL_VALID_CONFIG,
        VISITOR_HASH_SECRET: undefined,
      }),
    ).toThrow("Missing required env var: VISITOR_HASH_SECRET");
  });

  it("rejects empty VISITOR_HASH_SECRET", () => {
    expect(() =>
      validate({
        ...MINIMAL_VALID_CONFIG,
        VISITOR_HASH_SECRET: "",
      }),
    ).toThrow("Missing required env var: VISITOR_HASH_SECRET");
  });

  describe("UPLOAD_DIR", () => {
    it("defaults to ./uploads when not provided", () => {
      const result = validate(MINIMAL_VALID_CONFIG);
      expect(result.UPLOAD_DIR).toBe("./uploads");
    });

    it("accepts a custom UPLOAD_DIR value", () => {
      const result = validate({
        ...MINIMAL_VALID_CONFIG,
        UPLOAD_DIR: "/var/data/uploads",
      });
      expect(result.UPLOAD_DIR).toBe("/var/data/uploads");
    });
  });

  describe("MAX_FILE_SIZE", () => {
    it("defaults to 10485760 (10MB) when not provided", () => {
      const result = validate(MINIMAL_VALID_CONFIG);
      expect(result.MAX_FILE_SIZE).toBe(10485760);
    });

    it("accepts a custom MAX_FILE_SIZE value", () => {
      const result = validate({
        ...MINIMAL_VALID_CONFIG,
        MAX_FILE_SIZE: "20971520",
      });
      expect(result.MAX_FILE_SIZE).toBe(20971520);
    });

    it("throws when MAX_FILE_SIZE is not a positive number", () => {
      expect(() =>
        validate({
          ...MINIMAL_VALID_CONFIG,
          MAX_FILE_SIZE: "-1",
        }),
      ).toThrow("MAX_FILE_SIZE must be a positive integer");
    });

    it("throws when MAX_FILE_SIZE is zero", () => {
      expect(() =>
        validate({
          ...MINIMAL_VALID_CONFIG,
          MAX_FILE_SIZE: "0",
        }),
      ).toThrow("MAX_FILE_SIZE must be a positive integer");
    });
  });
});
