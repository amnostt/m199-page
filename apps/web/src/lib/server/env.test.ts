// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  InvalidApiBaseUrlError,
  requireHttpUrl,
  resolveApiBaseUrl,
  resolveLandingPublicEndpoint,
} from "./env.js";

// ---------------------------------------------------------------------------
// requireHttpUrl — happy path
// ---------------------------------------------------------------------------

describe("requireHttpUrl — happy path", () => {
  it("accepts an http:// URL and strips a trailing slash", () => {
    expect(requireHttpUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
    expect(requireHttpUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000",
    );
  });

  it("accepts an https:// URL and preserves path components", () => {
    expect(requireHttpUrl("https://api.example.com/v1")).toBe(
      "https://api.example.com/v1",
    );
  });

  it("trims surrounding whitespace before validating", () => {
    expect(requireHttpUrl("  http://localhost:3000  ")).toBe(
      "http://localhost:3000",
    );
  });
});

// ---------------------------------------------------------------------------
// requireHttpUrl — failure cases
// ---------------------------------------------------------------------------

describe("requireHttpUrl — failure cases", () => {
  it("rejects undefined", () => {
    expect(() => requireHttpUrl(undefined)).toThrow(InvalidApiBaseUrlError);
  });

  it("rejects an empty string", () => {
    expect(() => requireHttpUrl("")).toThrow(InvalidApiBaseUrlError);
  });

  it("rejects a whitespace-only string", () => {
    expect(() => requireHttpUrl("   ")).toThrow(InvalidApiBaseUrlError);
  });

  it("rejects a non-string value", () => {
    expect(() => requireHttpUrl(123 as unknown)).toThrow(
      InvalidApiBaseUrlError,
    );
    expect(() => requireHttpUrl({} as unknown)).toThrow(InvalidApiBaseUrlError);
  });

  it("rejects a relative path", () => {
    expect(() => requireHttpUrl("/landing/public")).toThrow(
      InvalidApiBaseUrlError,
    );
  });

  it("rejects a protocol-relative URL (no protocol means no absolute authority)", () => {
    // //evil.com/x parses against the file:// base in Node and ends up with
    // no host component, which our explicit guard rejects. This guards
    // against the env config accidentally inheriting authority from a
    // caller-controlled base.
    expect(() => requireHttpUrl("//evil.com/x")).toThrow(
      InvalidApiBaseUrlError,
    );
  });

  it("rejects a file:// URL", () => {
    expect(() => requireHttpUrl("file:///etc/passwd")).toThrow(
      InvalidApiBaseUrlError,
    );
  });

  it("rejects a javascript: URL", () => {
    expect(() => requireHttpUrl("javascript:alert(1)")).toThrow(
      InvalidApiBaseUrlError,
    );
  });

  it("rejects an ftp:// URL", () => {
    expect(() => requireHttpUrl("ftp://example.com")).toThrow(
      InvalidApiBaseUrlError,
    );
  });

  it("rejects a malformed URL", () => {
    expect(() => requireHttpUrl("http://")).toThrow(InvalidApiBaseUrlError);
  });

  it.each([
    "http://api.example.com/v1?draft=true",
    "http://api.example.com/v1#fragment",
  ])("rejects a base URL with endpoint-altering metadata: %s", (value) => {
    expect(() => requireHttpUrl(value)).toThrow(InvalidApiBaseUrlError);
  });

  it("rejects URL credentials", () => {
    expect(() =>
      requireHttpUrl("https://user:pass@api.example.com/v1"),
    ).toThrow(InvalidApiBaseUrlError);
  });
});

// ---------------------------------------------------------------------------
// resolveApiBaseUrl — process.env bridge
// ---------------------------------------------------------------------------

describe("resolveApiBaseUrl — process.env bridge", () => {
  it("reads ASTRO_API_BASE_URL from the provided env", () => {
    expect(resolveApiBaseUrl({ ASTRO_API_BASE_URL: "http://api:3000" })).toBe(
      "http://api:3000",
    );
  });

  it("fails when the env is missing the variable", () => {
    expect(() => resolveApiBaseUrl({})).toThrow(InvalidApiBaseUrlError);
  });

  it("fails when the env value is invalid", () => {
    expect(() =>
      resolveApiBaseUrl({ ASTRO_API_BASE_URL: "not-a-url" }),
    ).toThrow(InvalidApiBaseUrlError);
  });
});

// ---------------------------------------------------------------------------
// Authority boundary — Host header / request URL cannot influence the result
// ---------------------------------------------------------------------------

describe("requireHttpUrl — authority isolation", () => {
  it("does not accept a host:port pair as a substitute for a URL", () => {
    // "localhost:3000" parses to a URL with protocol=localhost: and no host;
    // our guard rejects anything where the protocol is not http(s) and the
    // host is empty.
    expect(() => requireHttpUrl("localhost:3000")).toThrow(
      InvalidApiBaseUrlError,
    );
  });

  it("does not accept an empty host as authority", () => {
    // `new URL("http://")` produces an empty host; we explicitly reject.
    expect(() => requireHttpUrl("http://")).toThrow(InvalidApiBaseUrlError);
  });

  it("does not honor any caller-provided host header — only the configured URL is returned", () => {
    // The validated value is exactly the input (modulo trim and trailing
    // slash). A Host header from the incoming request cannot mutate it.
    const validated = requireHttpUrl("http://real-upstream:3000");
    expect(validated).toBe("http://real-upstream:3000");
  });
});

describe("resolveLandingPublicEndpoint", () => {
  it("preserves an allowed API base path", () => {
    const endpoint = resolveLandingPublicEndpoint(
      requireHttpUrl("https://api.example.com/internal/v1"),
    );

    expect(endpoint.toString()).toBe(
      "https://api.example.com/internal/v1/landing/public",
    );
  });

  it("composes from the origin when the base has no path", () => {
    const endpoint = resolveLandingPublicEndpoint(
      requireHttpUrl("http://localhost:3000"),
    );

    expect(endpoint.toString()).toBe("http://localhost:3000/landing/public");
  });
});
