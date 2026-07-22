// ---------------------------------------------------------------------------
// Admin session helpers — cookie-based auth through the existing httpOnly
// cookie API contract. Uses credentials: "include" on every call.
//
// refreshSession shares one in-flight refresh promise across direct bootstrap
// calls and adminFetch retries. adminFetch centralises protected fetch with one
// 401 refresh retry and 403 → logout + redirect behaviour. Non-OK responses
// throw an AdminRequestError whose message is parsed from JSON or plain-text
// body so form/lifecycle UIs can show the server's actual reason.
// ---------------------------------------------------------------------------

import type { AuthUser } from "./adminTypes.js";

// ---------------------------------------------------------------------------
// AdminRequestError — non-OK response error with parsed message
// ---------------------------------------------------------------------------

/**
 * Error thrown by `adminFetch` for non-OK responses that are not auth-related
 * (401/403 retain their existing redirect/refresh semantics). The `message`
 * is parsed from the response body so callers can show the actual server-side
 * reason (validation text, plain-text upstream error, etc.).
 */
export class AdminRequestError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly body: string;

  constructor(status: number, statusText: string, body: string) {
    super(body || statusText || "Admin request failed");
    this.name = "AdminRequestError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

/**
 * Read the response body and produce a human-readable error message.
 * - application/json → prefer `message` (string OR string[]), fall back to `error`
 * - text/*           → raw body
 * - empty / unknown  → statusText, then "Admin request failed"
 *
 * If the response has no `headers` getter (older tests / non-Response shapes)
 * we treat the body as opaque and return the generic "Admin request failed"
 * so callers that did not opt into structured parsing still see a stable
 * message.
 */
async function parseErrorBody(res: Response): Promise<string> {
  let contentType = "";
  try {
    contentType = (res.headers?.get("content-type") ?? "").toLowerCase();
  } catch {
    contentType = "";
  }
  if (!contentType) {
    return res.statusText || "Admin request failed";
  }
  try {
    if (contentType.includes("application/json")) {
      const data = (await res.json()) as Record<string, unknown> | null;
      if (data && typeof data === "object") {
        const msg = data["message"];
        if (typeof msg === "string" && msg.length > 0) return msg;
        if (Array.isArray(msg) && msg.length > 0) {
          return msg
            .filter((m): m is string => typeof m === "string")
            .join("; ");
        }
        const err = data["error"];
        if (typeof err === "string" && err.length > 0) return err;
      }
    } else {
      const text = await res.text();
      if (text && text.length > 0) return text;
    }
  } catch {
    // Body parsing failed (malformed JSON, etc.) — fall through to statusText.
  }
  return res.statusText || "Admin request failed";
}

// ---------------------------------------------------------------------------
// login / refresh / logout
// ---------------------------------------------------------------------------

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await fetch("/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error("Login failed");
  return res.json() as Promise<AuthUser>;
}

let refreshInFlight: Promise<AuthUser> | null = null;

async function performRefresh(): Promise<AuthUser> {
  const res = await fetch("/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Session refresh failed");
  return res.json() as Promise<AuthUser>;
}

export async function refreshSession(): Promise<AuthUser> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function logout(): Promise<void> {
  const res = await fetch("/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Logout failed");
}

// ---------------------------------------------------------------------------
// adminFetch — protected fetch with 401 refresh retry and 403 redirect
//
// Concurrent 401 calls share refreshSession's in-flight promise so that
// multiple simultaneous refresh requests trigger only one refresh cycle.
// Non-OK, non-auth responses throw an AdminRequestError carrying the parsed
// body message; the caller does not need to inspect raw responses.
// ---------------------------------------------------------------------------

export async function adminFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
  });

  // 401 — attempt one refresh, then retry the original request
  if (res.status === 401) {
    try {
      await refreshSession();
    } catch {
      // Refresh itself failed — session is expired
      await logout().catch(() => {
        /* best-effort */
      });
      window.location.href = "/admin";
      throw new Error("Session expired");
    }

    // Refresh succeeded — retry the original request
    const retryRes = await fetch(url, {
      ...init,
      credentials: "include",
    });

    // If retry fails after a successful refresh the failure is not
    // session-related (500, network, etc.). Surface it to the caller
    // without logging out or redirecting.
    if (!retryRes.ok) {
      const body = await parseErrorBody(retryRes);
      throw new AdminRequestError(retryRes.status, retryRes.statusText, body);
    }
    if (retryRes.status === 204) return undefined as T;
    return retryRes.json() as Promise<T>;
  }

  // 403 — not authorized, attempt logout and redirect
  if (res.status === 403) {
    await logout().catch(() => {
      /* best-effort */
    });
    window.location.href = "/admin";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new AdminRequestError(res.status, res.statusText, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
