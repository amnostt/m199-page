// ---------------------------------------------------------------------------
// Admin session helpers — cookie-based auth through the existing httpOnly
// cookie API contract. Uses credentials: "include" on every call.
//
// refreshSession shares one in-flight refresh promise across direct bootstrap
// calls and adminFetch retries. adminFetch centralises protected fetch with one
// 401 refresh retry and 403 → logout + redirect behaviour.
// ---------------------------------------------------------------------------

import type { AuthUser } from "./adminTypes.js";

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
    if (!retryRes.ok) throw new Error("Admin request failed");
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

  if (!res.ok) throw new Error("Admin request failed");
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
