// ---------------------------------------------------------------------------
// Admin session helpers — cookie-based auth through the existing httpOnly
// cookie API contract. Uses credentials: "include" on every call.
//
// adminFetch centralises protected fetch with one 401 refresh retry and
// 403 → logout + redirect behaviour.
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
  await fetch("/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

// ---------------------------------------------------------------------------
// adminFetch — protected fetch with 401 refresh retry and 403 redirect
// ---------------------------------------------------------------------------

let retrying = false;

export async function adminFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
  });

  // 401 — attempt one refresh, then retry the original request
  if (res.status === 401) {
    if (retrying) {
      // Already attempted a refresh — avoid infinite loop
      retrying = false;
      throw new Error("Session expired");
    }

    retrying = true;
    try {
      await refreshSession();
      // Retry the original request
      const retryRes = await fetch(url, {
        credentials: "include",
        ...init,
      });
      retrying = false;

      if (!retryRes.ok) throw new Error("Admin request failed");
      return retryRes.json() as Promise<T>;
    } catch {
      retrying = false;
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

/** Reset the internal retrying flag (for tests). */
export function __resetRetrying(): void {
  retrying = false;
}
