/**
 * landing.ts — safe public landing payload fetching for the Astro SSR.
 *
 * PR2 scope (safe landing data):
 *  - `validateFeaturedVideoUrl`: an explicit safe protocol/origin
 *    allowlist for the iframe URL. Invalid values are omitted
 *    (returns null) rather than rendered. Never throws.
 *  - `validateLandingPublicPayload`: typed schema validation for the
 *    unchanged `GET /landing/public` contract defined in
 *    `apps/api/src/landing/landing.service.ts`. Runs the video-URL
 *    policy on the way in.
 *  - `fetchLandingPublicPayload`: bounded fetch with AbortSignal +
 *    timeout, mapping timeout, network, non-2xx, and invalid-payload
 *    failures to a single discriminated `LandingFetchError`. PR3 maps
 *    by `reason` to a controlled 503.
 *
 * Out of scope (PR3+): Astro root rendering, Caddy docs, SSR proof.
 */
import { type ApiBaseUrl, resolveLandingPublicEndpoint } from "./env.js";

// ---------------------------------------------------------------------------
// Public payload contract (mirrors apps/api/src/landing/landing.service.ts)
// ---------------------------------------------------------------------------

export interface FeaturedOutingPayload {
  id: string;
  slug: string;
  title: string;
  location: string;
  mainImageUrl: string | null;
}

export interface FeaturedPostPayload {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
}

export interface CurrentVersePayload {
  text: string;
  reference: string;
  date: string;
}

export interface LandingPublicPayload {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  /**
   * Always null or a valid https allowlist URL after
   * `validateLandingPublicPayload` runs. The API may return any
   * string; unsafe values are omitted on the way in.
   */
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  featuredOuting: FeaturedOutingPayload | null;
  featuredPosts: FeaturedPostPayload[];
  currentVerse: CurrentVersePayload | null;
}

// ---------------------------------------------------------------------------
// Safe featuredVideoUrl policy (Task 2.1 / A-006)
// ---------------------------------------------------------------------------

/** Trusted video origin allowlist — YouTube and Vimeo families. */
const SAFE_VIDEO_ORIGINS: ReadonlySet<string> = new Set([
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
]);

/**
 * Validate `featuredVideoUrl` against the safe iframe policy. Returns
 * the canonical URL when it is an absolute https URL whose host is in
 * {@link SAFE_VIDEO_ORIGINS}, has no credentials or fragment, and has
 * a non-empty path. Returns null for every invalid value. Never throws
 * so the renderer can always render whatever it returns.
 */
export function validateFeaturedVideoUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const candidate = raw.trim();
  if (candidate === "") return null;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  // Fragments rejected (can drive postMessage between iframe and
  // parent); queries kept (trusted providers use them, e.g. ?v=).
  if (parsed.hash !== "") return null;
  if (!parsed.hostname) return null;
  if (!SAFE_VIDEO_ORIGINS.has(parsed.hostname.toLowerCase())) return null;
  if (parsed.pathname === "" || parsed.pathname === "/") return null;
  parsed.port = "";
  return parsed.toString();
}

// ---------------------------------------------------------------------------
// Payload schema validation
// ---------------------------------------------------------------------------

export class InvalidLandingPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLandingPayloadError";
  }
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== "string" || v === "") {
    throw new InvalidLandingPayloadError(`${key} is required`);
  }
  return v;
}

function requireNullableString(
  obj: Record<string, unknown>,
  key: string,
): string | null {
  if (!nullableString(obj[key])) {
    throw new InvalidLandingPayloadError(`${key} must be a string or null`);
  }
  return obj[key] as string | null;
}

function validateFeaturedOuting(raw: unknown): FeaturedOutingPayload | null {
  if (raw === null) return null;
  if (typeof raw !== "object") {
    throw new InvalidLandingPayloadError("featuredOuting must be an object");
  }
  const c = raw as Record<string, unknown>;
  return {
    id: requireString(c, "id"),
    slug: requireString(c, "slug"),
    title: requireString(c, "title"),
    location: requireString(c, "location"),
    mainImageUrl: requireNullableString(c, "mainImageUrl"),
  };
}

function validateFeaturedPosts(raw: unknown): FeaturedPostPayload[] {
  if (!Array.isArray(raw)) {
    throw new InvalidLandingPayloadError("featuredPosts must be an array");
  }
  return raw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new InvalidLandingPayloadError(
        `featuredPosts[${index}] must be an object`,
      );
    }
    const c = entry as Record<string, unknown>;
    return {
      id: requireString(c, "id"),
      slug: requireString(c, "slug"),
      title: requireString(c, "title"),
      coverImageUrl: requireNullableString(c, "coverImageUrl"),
    };
  });
}

function validateCurrentVerse(raw: unknown): CurrentVersePayload | null {
  if (raw === null) return null;
  if (typeof raw !== "object") {
    throw new InvalidLandingPayloadError("currentVerse must be an object");
  }
  const c = raw as Record<string, unknown>;
  return {
    text: requireString(c, "text"),
    reference: requireString(c, "reference"),
    date: requireString(c, "date"),
  };
}

/**
 * Validate a `GET /landing/public` response body and sanitize
 * `featuredVideoUrl` through the safe-iframe policy. Throws
 * {@link InvalidLandingPayloadError} on any deviation from the
 * contract; the fetch helper maps that to "invalid_payload".
 */
export function validateLandingPublicPayload(
  raw: unknown,
): LandingPublicPayload {
  if (typeof raw !== "object" || raw === null) {
    throw new InvalidLandingPayloadError(
      "Landing payload must be a JSON object",
    );
  }
  const c = raw as Record<string, unknown>;
  return {
    heroTitle: requireNullableString(c, "heroTitle"),
    heroSubtitle: requireNullableString(c, "heroSubtitle"),
    heroImageUrl: requireNullableString(c, "heroImageUrl"),
    mission: requireNullableString(c, "mission"),
    vision: requireNullableString(c, "vision"),
    description: requireNullableString(c, "description"),
    featuredVideoUrl: validateFeaturedVideoUrl(
      requireNullableString(c, "featuredVideoUrl"),
    ),
    contactEmail: requireNullableString(c, "contactEmail"),
    contactPhone: requireNullableString(c, "contactPhone"),
    featuredOuting: validateFeaturedOuting(c.featuredOuting),
    featuredPosts: validateFeaturedPosts(c.featuredPosts),
    currentVerse: validateCurrentVerse(c.currentVerse),
  };
}

// ---------------------------------------------------------------------------
// Failure model — discriminated LandingFetchError
// ---------------------------------------------------------------------------

export type LandingFetchFailureReason =
  "timeout" | "network" | "http_error" | "invalid_payload";

/**
 * Single failure type for the landing payload fetch. PR3 maps `reason`
 * to a controlled 503 response without leaking driver details.
 */
export class LandingFetchError extends Error {
  readonly reason: LandingFetchFailureReason;
  readonly status?: number;

  constructor(
    reason: LandingFetchFailureReason,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "LandingFetchError";
    this.reason = reason;
    if (options.status !== undefined) this.status = options.status;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

// ---------------------------------------------------------------------------
// Bounded fetch (Task 2.2 / A-007)
// ---------------------------------------------------------------------------

export const DEFAULT_LANDING_FETCH_TIMEOUT_MS = 5_000;

export interface FetchLandingOptions {
  apiBaseUrl: ApiBaseUrl;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Fetch the public landing payload with a bounded timeout. The
 * internal AbortController is linked to the caller's `signal` so
 * either source can cancel the request. All failure modes
 * (timeout, network error, non-2xx response, invalid payload) are
 * normalized to {@link LandingFetchError} so PR3 can map by
 * `reason`.
 */
export async function fetchLandingPublicPayload(
  options: FetchLandingOptions,
): Promise<LandingPublicPayload> {
  const {
    apiBaseUrl,
    signal: externalSignal,
    timeoutMs = DEFAULT_LANDING_FETCH_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options;

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new LandingFetchError(
      "invalid_payload",
      `Invalid timeoutMs: ${timeoutMs}`,
    );
  }

  const endpoint = resolveLandingPublicEndpoint(apiBaseUrl).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", onExternalAbort, {
        once: true,
      });
    }
  }

  try {
    const response = await fetchImpl(endpoint, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new LandingFetchError(
        "http_error",
        `Landing API responded with HTTP ${response.status}`,
        { status: response.status },
      );
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch (cause) {
      throw new LandingFetchError(
        "invalid_payload",
        "Landing API response was not valid JSON",
        { cause },
      );
    }

    try {
      return validateLandingPublicPayload(raw);
    } catch (cause) {
      if (cause instanceof InvalidLandingPayloadError) {
        throw new LandingFetchError(
          "invalid_payload",
          `Landing API response did not match the public contract: ${cause.message}`,
          { cause },
        );
      }
      throw cause;
    }
  } catch (cause) {
    if (cause instanceof LandingFetchError) throw cause;
    // AbortError covers timeout and caller-driven aborts. If the
    // external signal was already aborted it is caller cancellation;
    // otherwise the internal timer fired and this is a timeout.
    if (controller.signal.aborted) {
      const callerCancelled =
        externalSignal !== undefined && externalSignal.aborted;
      if (!callerCancelled) {
        throw new LandingFetchError(
          "timeout",
          `Landing API request exceeded ${timeoutMs}ms`,
          { cause },
        );
      }
    }
    throw new LandingFetchError(
      "network",
      cause instanceof Error
        ? `Landing API network error: ${cause.message}`
        : "Landing API network error",
      { cause },
    );
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}
