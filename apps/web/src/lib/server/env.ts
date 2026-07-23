/**
 * env.ts — server-only configuration contract for the Astro landing SSR.
 *
 * Scope (PR1 Foundation):
 *  - Validate the documented `ASTRO_API_BASE_URL` server-only env var.
 *  - Expose `requireHttpUrl` for direct injection (tests, ops scripts).
 *  - Expose `resolveApiBaseUrl` for production callers that need the
 *    process-env value.
 *
 * The landing payload fetch (PR2) consumes the validated base URL via
 * `resolveLandingPublicEndpoint(apiBaseUrl)`. The actual fetch helper,
 * timeout/abort, and sanitization are intentionally OUT OF SCOPE here —
 * they belong to PR2 (safe landing data).
 *
 * Contract (enforced here, tested in env.test.ts):
 *  1. ASTRO_API_BASE_URL is REQUIRED. Missing/empty values fail fast.
 *  2. ASTRO_API_BASE_URL MUST be an absolute http:// or https:// URL.
 *     Relative paths, file://, javascript:, ftp:, and protocol-relative
 *     URLs are rejected.
 *  3. The validated value is the SINGLE source of authority for the
 *     landing payload endpoint. Callers must use
 *     `resolveLandingPublicEndpoint(apiBaseUrl)` and MUST NOT derive the
 *     authority from Astro.url, request headers, or forwarded host. This
 *     prevents Host-header authority injection at the reverse proxy.
 *  4. This module lives under src/lib/server/ and is never bundled into
 *     the client (Astro enforces that boundary for the `server/` subtree).
 *     The variable name does NOT start with `PUBLIC_`, so it is also
 *     unavailable to the client via `import.meta.env`.
 */
export type ApiBaseUrl = string & { readonly __brand: "ApiBaseUrl" };

const VALID_PROTOCOLS = new Set(["http:", "https:"]);

export class InvalidApiBaseUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidApiBaseUrlError";
  }
}

/**
 * Validate and return a trusted API base URL.
 *
 * Throws InvalidApiBaseUrlError when the value is missing, empty, not a
 * string, not parseable as a URL, or not an absolute http(s) URL.
 */
export function requireHttpUrl(raw: unknown): ApiBaseUrl {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new InvalidApiBaseUrlError(
      "ASTRO_API_BASE_URL is required and must be a non-empty string",
    );
  }
  const candidate = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new InvalidApiBaseUrlError(
      `ASTRO_API_BASE_URL is not a valid URL: ${candidate}`,
    );
  }
  if (!VALID_PROTOCOLS.has(parsed.protocol)) {
    throw new InvalidApiBaseUrlError(
      `ASTRO_API_BASE_URL must use http: or https: — got ${parsed.protocol}`,
    );
  }
  // The URL constructor accepts protocol-relative forms like "//evil.com/x"
  // by inheriting the base protocol. Reject that explicitly: the URL must
  // be absolute from the caller's perspective, and a host must be present.
  if (!parsed.host || parsed.username || parsed.password) {
    throw new InvalidApiBaseUrlError(
      `ASTRO_API_BASE_URL must include a host without credentials — got ${candidate}`,
    );
  }
  if (parsed.search || parsed.hash) {
    throw new InvalidApiBaseUrlError(
      `ASTRO_API_BASE_URL must not include a query or hash — got ${candidate}`,
    );
  }
  return parsed.toString().replace(/\/$/, "") as ApiBaseUrl;
}

/**
 * Resolve the landing endpoint without discarding a configured API base path.
 */
export function resolveLandingPublicEndpoint(apiBaseUrl: ApiBaseUrl): URL {
  const base = new URL(apiBaseUrl);
  if (!base.pathname.endsWith("/")) {
    base.pathname = `${base.pathname}/`;
  }
  return new URL("landing/public", base);
}

/**
 * Resolve the API base URL, prioritizing runtime environment values.
 */
export function resolveApiBaseUrl(
  runtimeEnv: Partial<Pick<ImportMetaEnv, "ASTRO_API_BASE_URL">> = process.env,
  astroEnv: Partial<Pick<ImportMetaEnv, "ASTRO_API_BASE_URL">> = import.meta
    .env,
): ApiBaseUrl {
  return requireHttpUrl(
    runtimeEnv.ASTRO_API_BASE_URL ?? astroEnv.ASTRO_API_BASE_URL,
  );
}
