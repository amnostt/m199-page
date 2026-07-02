/**
 * AllExceptionsFilter tests (BF-03).
 *
 * Proves the filter returns the required { statusCode, message, timestamp, path }
 * envelope and never exposes stack traces.
 */
import { describe, it, expect, vi } from "vitest";
import { HttpException, HttpStatus } from "@nestjs/common";
import type { HttpAdapterHost } from "@nestjs/core";
import { AllExceptionsFilter } from "./all-exceptions.filter.js";

// Minimal MulterError-like object — avoids importing multer directly
// (pnpm strict mode does not allow importing transitive dependencies).
// The real MulterError has: { code: string, message: string, field?: string, name: "MulterError" }.
function makeMulterError(code: string, field?: string): Error & { code: string; field?: string } {
  const err = new Error(code) as Error & { code: string; field?: string };
  err.code = code;
  err.name = "MulterError";
  if (field !== undefined) err.field = field;
  return err;
}

function mockHost(url: string) {
  const reply = vi.fn();
  const getRequestUrl = vi.fn().mockReturnValue(url);

  const httpAdapterHost = {
    httpAdapter: { reply, getRequestUrl },
  } as unknown as HttpAdapterHost;

  const filter = new AllExceptionsFilter(httpAdapterHost);

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({}),
    }),
  };

  return { filter, host, reply };
}

describe("AllExceptionsFilter", () => {
  it("returns standard envelope for HttpException", () => {
    const { filter, host, reply } = mockHost("/test");

    filter.catch(new HttpException("Not found", 404), host as never);

    expect(reply).toHaveBeenCalledTimes(1);
    const [_res, body, status] = reply.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
      number,
    ];

    expect(status).toBe(404);
    expect(body).toEqual({
      statusCode: 404,
      message: "Not found",
      timestamp: expect.any(String) as string,
      path: "/test",
    });
  });

  it("returns 500 for non-HttpException errors", () => {
    const { filter, host, reply } = mockHost("/error");

    filter.catch(new Error("Boom"), host as never);

    expect(reply).toHaveBeenCalledTimes(1);
    const [_res, body, status] = reply.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
      number,
    ];

    expect(status).toBe(500);
    expect(body).toEqual({
      statusCode: 500,
      message: "Internal server error",
      timestamp: expect.any(String) as string,
      path: "/error",
    });
  });

  it("never exposes stack traces", () => {
    const { filter, host, reply } = mockHost("/secret");

    const error = new Error("Crash");
    error.stack = "secret-stack-trace";

    filter.catch(error, host as never);

    const [_res, body] = reply.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];

    // Stack must never appear in the response body
    expect(JSON.stringify(body)).not.toContain("secret-stack-trace");
    // Only expected keys
    expect(Object.keys(body).sort()).toEqual([
      "message",
      "path",
      "statusCode",
      "timestamp",
    ]);
  });

  it("includes request path in the envelope", () => {
    const { filter, host, reply } = mockHost("/api/products/42");

    filter.catch(new HttpException("Bad request", 400), host as never);

    const [_res, body] = reply.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(body).toHaveProperty("path", "/api/products/42");
  });

  // -----------------------------------------------------------------------
  // MulterError handling (FU-06 — file size limit enforcement)
  // -----------------------------------------------------------------------

  describe("MulterError → HttpStatus mapping (FU-06)", () => {
    it("returns 413 and 'File too large' for LIMIT_FILE_SIZE", () => {
      const { filter, host, reply } = mockHost("/files/OUTING_MAIN_IMAGE");
      const err = makeMulterError("LIMIT_FILE_SIZE", "file");

      filter.catch(err, host as never);

      expect(reply).toHaveBeenCalledTimes(1);
      const [_res, body, status] = reply.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
        number,
      ];

      expect(status).toBe(HttpStatus.PAYLOAD_TOO_LARGE); // 413
      expect(body).toEqual({
        statusCode: 413,
        message: "File too large",
        timestamp: expect.any(String) as string,
        path: "/files/OUTING_MAIN_IMAGE",
      });
    });

    it("returns 413 and 'File too large' even when field is undefined (FU-06 triangulation)", () => {
      const { filter, host, reply } = mockHost("/files/OUTING_CROQUIS");
      // MulterError may omit the field parameter in some edge cases
      const err = makeMulterError("LIMIT_FILE_SIZE");

      filter.catch(err, host as never);

      expect(reply).toHaveBeenCalledTimes(1);
      const [_res, body, status] = reply.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
        number,
      ];

      expect(status).toBe(413);
      expect(body.statusCode).toBe(413);
      expect(body.message).toBe("File too large");
    });

    it("returns 400 for LIMIT_UNEXPECTED_FILE", () => {
      const { filter, host, reply } = mockHost("/files/OUTING_MAIN_IMAGE");
      const err = makeMulterError("LIMIT_UNEXPECTED_FILE", "extra");

      filter.catch(err, host as never);

      expect(reply).toHaveBeenCalledTimes(1);
      const [_res, _body, status] = reply.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
        number,
      ];
      expect(status).toBe(400);
    });

    it("never exposes MulterError stack traces", () => {
      const { filter, host, reply } = mockHost("/files/OUTING_MAIN_IMAGE");
      const err = makeMulterError("LIMIT_FILE_SIZE", "file");
      err.stack = "multer-stack-trace-internal";

      filter.catch(err, host as never);

      const [_res, body] = reply.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
      ];
      expect(JSON.stringify(body)).not.toContain("multer-stack-trace-internal");
    });
  });
});
