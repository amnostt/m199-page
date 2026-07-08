/**
 * AuthInterceptor unit tests — Origin header CSRF validation.
 *
 * Proves that mutating endpoints (POST/PUT/PATCH/DELETE) require a matching
 * Origin header and that safe methods (GET/HEAD/OPTIONS) are exempt.
 * Direct instantiation with a mock ConfigService, following the pattern
 * from health.controller.test.ts and all-exceptions.filter.test.ts.
 */
import { ConfigService } from "@nestjs/config";
import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext, CallHandler } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthInterceptor } from "./auth.interceptor.js";
import type { Observable } from "rxjs";

// ---- helpers --------------------------------------------------------------

function makeContext(method: string, origin?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers: origin ? { origin } : {},
      }),
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

const nextHandle: CallHandler = {
  handle: () => ({}) as Observable<unknown>,
};

function makeInterceptor(values?: {
  port?: number;
  apiOrigin?: string;
}): AuthInterceptor {
  const config = {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      if (key === "PORT") {
        return values?.port ?? defaultValue ?? 3000;
      }

      if (key === "API_ORIGIN") {
        return values?.apiOrigin;
      }

      return defaultValue;
    }),
  } as unknown as ConfigService;
  return new AuthInterceptor(config);
}

// ---- tests ----------------------------------------------------------------

describe("AuthInterceptor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- safe methods are exempt --------------------------------------------

  it.each(["GET", "HEAD", "OPTIONS"])(
    "bypasses Origin check for %s",
    (method) => {
      const interceptor = makeInterceptor();
      const ctx = makeContext(method);

      // Should not throw
      expect(() => interceptor.intercept(ctx, nextHandle)).not.toThrow();
    },
  );

  // ---- valid Origin on mutation -------------------------------------------

  it("passes for POST with matching Origin", () => {
    const interceptor = makeInterceptor();
    const ctx = makeContext("POST", "http://localhost:3000");

    expect(() => interceptor.intercept(ctx, nextHandle)).not.toThrow();
  });

  it("passes for PUT with matching Origin", () => {
    const interceptor = makeInterceptor();
    const ctx = makeContext("PUT", "http://localhost:3000");

    expect(() => interceptor.intercept(ctx, nextHandle)).not.toThrow();
  });

  it("passes for DELETE with matching Origin", () => {
    const interceptor = makeInterceptor();
    const ctx = makeContext("DELETE", "http://localhost:3000");

    expect(() => interceptor.intercept(ctx, nextHandle)).not.toThrow();
  });

  // ---- missing Origin -----------------------------------------------------

  it("throws 403 for POST with missing Origin header", () => {
    const interceptor = makeInterceptor();
    const ctx = makeContext("POST");

    expect(() => interceptor.intercept(ctx, nextHandle)).toThrow(
      new ForbiddenException("Invalid origin"),
    );
  });

  // ---- mismatched Origin --------------------------------------------------

  it("throws 403 for POST with mismatched Origin", () => {
    const interceptor = makeInterceptor();
    const ctx = makeContext("POST", "https://evil.com");

    expect(() => interceptor.intercept(ctx, nextHandle)).toThrow(
      new ForbiddenException("Invalid origin"),
    );
  });

  // ---- custom API_ORIGIN config -------------------------------------------

  it("uses API_ORIGIN config value when set", () => {
    const interceptor = makeInterceptor({
      apiOrigin: "https://admin.example.com",
    });
    const ctx = makeContext("POST", "https://admin.example.com");

    expect(() => interceptor.intercept(ctx, nextHandle)).not.toThrow();
  });

  it("rejects when Origin does not match API_ORIGIN", () => {
    const interceptor = makeInterceptor({
      apiOrigin: "https://admin.example.com",
    });
    const ctx = makeContext("POST", "http://localhost:3000");

    expect(() => interceptor.intercept(ctx, nextHandle)).toThrow(
      new ForbiddenException("Invalid origin"),
    );
  });
});
