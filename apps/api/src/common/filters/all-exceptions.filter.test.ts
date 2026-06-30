/**
 * AllExceptionsFilter tests (BF-03).
 *
 * Proves the filter returns the required { statusCode, message, timestamp, path }
 * envelope and never exposes stack traces.
 */
import { describe, it, expect, vi } from "vitest";
import { HttpException } from "@nestjs/common";
import type { HttpAdapterHost } from "@nestjs/core";
import { AllExceptionsFilter } from "./all-exceptions.filter.js";

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
});
