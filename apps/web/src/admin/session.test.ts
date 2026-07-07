// ---------------------------------------------------------------------------
// Unit tests for admin session helpers (Task 4.1)
//
// Tests login, refreshSession, logout, and adminFetch behavior per design:
// - credentials: "include" on every auth call
// - adminFetch retries one refresh on 401, then falls through
// - adminFetch clears session and redirects to login on 403
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { login, refreshSession, logout, adminFetch } from "./session.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "u1", email: "admin@m199.org", displayName: "Admin" };

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// login()
// ---------------------------------------------------------------------------

describe("login", () => {
  it("POSTs to /auth/login with email, password, and credentials include", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_USER),
    });

    const result = await login("admin@m199.org", "secret");

    expect(fetch).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@m199.org", password: "secret" }),
    });
    expect(result).toEqual(MOCK_USER);
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: "Invalid credentials" }),
    });

    await expect(login("bad@m199.org", "wrong")).rejects.toThrow(
      "Login failed",
    );
  });
});

// ---------------------------------------------------------------------------
// refreshSession()
// ---------------------------------------------------------------------------

describe("refreshSession", () => {
  it("POSTs to /auth/refresh with credentials include", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_USER),
    });

    const result = await refreshSession();

    expect(fetch).toHaveBeenCalledWith("/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    expect(result).toEqual(MOCK_USER);
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: "Unauthorized" }),
    });

    await expect(refreshSession()).rejects.toThrow("Session refresh failed");
  });
});

// ---------------------------------------------------------------------------
// logout()
// ---------------------------------------------------------------------------

describe("logout", () => {
  it("POSTs to /auth/logout with credentials include", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    await logout();

    expect(fetch).toHaveBeenCalledWith("/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  });
});

// ---------------------------------------------------------------------------
// adminFetch() — protected fetch with 401 refresh retry and 403 redirect
// ---------------------------------------------------------------------------

describe("adminFetch", () => {
  it("passes through a successful response", async () => {
    const payload = { data: "ok" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    });

    const result = await adminFetch("/admin/some-endpoint");

    expect(fetch).toHaveBeenCalledWith("/admin/some-endpoint", {
      credentials: "include",
    });
    expect(result).toEqual(payload);
  });

  it("retries one refresh on 401, then retries the original request", async () => {
    // First call to /admin/some → 401
    // Then refresh call → success with user
    // Then retry of /admin/some → 200 with payload
    const refreshUser = { id: "u1", email: "a@m.com", displayName: "A" };
    const payload = { data: "recovered" };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (url === "/admin/some-endpoint" && callCount === 1) {
        return Promise.resolve({ ok: false, status: 401 });
      }
      if (url === "/auth/refresh") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(refreshUser),
        });
      }
      // Retry of /admin/some-endpoint
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(payload),
      });
    });

    const result = await adminFetch("/admin/some-endpoint");

    // Should have made exactly 3 calls: original, refresh, retry
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual(payload);
  });

  it("does NOT retry refresh on non-401 errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: "Server error" }),
    });

    await expect(adminFetch("/admin/some-endpoint")).rejects.toThrow(
      "Admin request failed",
    );
    expect(fetch).toHaveBeenCalledTimes(1); // no refresh attempt
  });

  it("on 403, clears session (logout) and redirects to /admin", async () => {
    // Mock location.href as a writable property
    const hrefSetter = vi.fn();
    // Capture current href before reassigning location
    const originalHref = window.location.href;
    delete (window as { location?: Location }).location;
    (window as { location: Partial<Location> }).location = {
      href: originalHref,
    } as Location;
    Object.defineProperty(window.location, "href", {
      set: hrefSetter,
      get: () => originalHref,
    });

    // Mock fetch: first call returns 403, then logout call succeeds
    let calledLogout = false;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/admin/some-endpoint" && !calledLogout) {
        return Promise.resolve({ ok: false, status: 403 });
      }
      if (url === "/auth/logout") {
        calledLogout = true;
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    await expect(adminFetch("/admin/some-endpoint")).rejects.toThrow(
      "Session expired",
    );

    // Verify logout was called
    expect(calledLogout).toBe(true);
    // Verify redirect to /admin
    expect(hrefSetter).toHaveBeenCalledWith("/admin");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — adminFetch passes through custom init options
  // -----------------------------------------------------------------------

  it("passes custom method, headers, and body to fetch", async () => {
    const payload = { id: "new" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    });

    await adminFetch("/admin/resource", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });

    expect(fetch).toHaveBeenCalledWith("/admin/resource", {
      credentials: "include",
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — 401 where refresh itself fails → logout + redirect
  // -----------------------------------------------------------------------

  it("on 401: if refresh fails, logs out and redirects to /admin", async () => {
    const hrefSetter = vi.fn();
    const originalHref = window.location.href;
    delete (window as { location?: Location }).location;
    (window as { location: Partial<Location> }).location = {
      href: originalHref,
    } as Location;
    Object.defineProperty(window.location, "href", {
      set: hrefSetter,
      get: () => originalHref,
    });

    let logoutCalled = false;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/admin/some-endpoint" || url === "/auth/refresh") {
        return Promise.resolve({ ok: false, status: 401 });
      }
      if (url === "/auth/logout") {
        logoutCalled = true;
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // Reset retrying flag between tests (session.ts module-level state)
    const { __resetRetrying } = await import("./session.js");
    __resetRetrying();

    await expect(adminFetch("/admin/some-endpoint")).rejects.toThrow(
      "Session expired",
    );

    expect(logoutCalled).toBe(true);
    expect(hrefSetter).toHaveBeenCalledWith("/admin");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — login with network error (not just bad status)
  // -----------------------------------------------------------------------

  it("login throws on network error", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));

    await expect(login("a@b.com", "pw")).rejects.toThrow("Network error");
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — refreshSession throws on network error
  // -----------------------------------------------------------------------

  it("refreshSession throws on network error", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));

    await expect(refreshSession()).rejects.toThrow("Network error");
  });
});
