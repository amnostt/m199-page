// ---------------------------------------------------------------------------
// Admin session helpers — cookie-based auth through the existing httpOnly
// cookie API contract. Uses credentials: "include" on every call.
//
// adminFetch centralises protected fetch with one 401 refresh retry and
// 403 → logout + redirect behaviour. Concurrent 401 calls share one refresh
// via an in-flight promise pattern instead of a global boolean flag.
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

export async function refreshSession(): Promise<AuthUser> {
  const res = await fetch("/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Session refresh failed");
  return res.json() as Promise<AuthUser>;
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
// Concurrent 401 calls share the same in-flight refresh promise so that
// multiple simultaneous 401 responses trigger only one refresh cycle.
// ---------------------------------------------------------------------------

let refreshInFlight: Promise<AuthUser> | null = null;

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
    // Start a refresh if one is not already in flight; otherwise share it.
    if (!refreshInFlight) {
      refreshInFlight = refreshSession().finally(() => {
        refreshInFlight = null;
      });
    }

    try {
      await refreshInFlight;
      // Retry the original request
      const retryRes = await fetch(url, {
        ...init,
        credentials: "include",
      });

      if (!retryRes.ok) throw new Error("Admin request failed");
      return retryRes.json() as Promise<T>;
    } catch {
      // Refresh failed — clear session and redirect to login
      await logout().catch(() => {
        /* best-effort */
      });
      window.location.href = "/admin";
      throw new Error("Session expired");
    }
  }

  // 403 — not authorized, clear session and redirect
  if (res.status === 403) {
    await logout().catch(() => {
      /* best-effort */
    });
    window.location.href = "/admin";
    throw new Error("Session expired");
  }

  if (!res.ok) throw new Error("Admin request failed");
  return res.json() as Promise<T>;
}
