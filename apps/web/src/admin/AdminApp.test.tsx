// ---------------------------------------------------------------------------
// AdminApp component tests (Task 4.2)
//
// Tests admin bootstrap, login, shell navigation, and logout behavior:
// - Bootstrap: refreshSession success → shell; failure → login
// - Login: submit success → shell; error on failure
// - Shell: Landing Settings active, placeholders disabled, logout button
// - Logout failure: keeps shell visible and shows error message
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { AdminApp } from "./AdminApp.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AUTH_USER = {
  id: "u1",
  email: "admin@m199.org",
  displayName: "Admin User",
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Bootstrap — refresh on mount
// ---------------------------------------------------------------------------

describe("AdminApp bootstrap", () => {
  it("shows loading state while refreshing session", () => {
    // Never-resolving fetch keeps the bootstrap pending
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => new Promise<Response>(() => {}));

    render(<AdminApp />);

    expect(screen.getByTestId("admin-loading")).toBeTruthy();
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it("renders admin shell on successful refresh bootstrap", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(AUTH_USER),
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });

    expect(screen.getByText(AUTH_USER.displayName)).toBeTruthy();
  });

  it("shows login form when refresh returns 401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: "Unauthorized" }),
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });
  });

  it("shows login form when refresh returns 403", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ message: "Forbidden" }),
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });
  });

  it("shows login form on network error during refresh", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Login flow
// ---------------------------------------------------------------------------

describe("AdminApp login", () => {
  it("submits login and shows shell on success", async () => {
    // First: refresh returns 401 → shows login
    // Then: login succeeds → shows shell
    const loginUser = { id: "u2", email: "a@b.com", displayName: "Editor" };

    globalThis.fetch = vi.fn().mockImplementation(
      (url: string, init?: RequestInit) => {
        if (url === "/auth/refresh") {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url === "/auth/login") {
          // Verify the login body was sent
          const body = JSON.parse(
            (init?.body as string) ?? "{}",
          ) as { email: string; password: string };
          expect(body.email).toBe("editor@m199.org");
          expect(body.password).toBe("pass123");
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(loginUser),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      },
    );

    render(<AdminApp />);

    // Wait for login form to appear
    await waitFor(() => {
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });

    // Fill in the form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(emailInput, { target: { value: "editor@m199.org" } });
    fireEvent.change(passwordInput, { target: { value: "pass123" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Should now show the shell
    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });

    expect(screen.getByText("Editor")).toBeTruthy();
  });

  it("shows error on login failure", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/auth/refresh") {
        return Promise.resolve({ ok: false, status: 401 });
      }
      if (url === "/auth/login") {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: "Invalid" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });

    // Submit without filling (or fill and submit)
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "bad@m199.org" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId("admin-login-error")).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// AdminShell navigation
// ---------------------------------------------------------------------------

describe("AdminApp shell navigation", () => {
  async function renderShell() {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(AUTH_USER),
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });
  }

  it("renders Landing Settings nav item as active link", async () => {
    await renderShell();
    const landingLink = screen.getByText(/landing settings/i);
    expect(landingLink).toBeTruthy();
    // Should be navigable (not disabled)
    const linkEl = landingLink.closest("a") ?? landingLink.closest("button");
    expect(linkEl).toBeTruthy();
    if (linkEl instanceof HTMLButtonElement) {
      expect(linkEl.disabled).toBe(false);
    }
  });

  it("renders placeholder nav items for out-of-scope sections as disabled", async () => {
    await renderShell();

    // Each placeholder should exist as a disabled button with "(coming soon)" label
    const placeholders = [
      "Posts",
      "Outings",
      "Verses",
      "Responsibles",
      "Files",
    ];

    for (const label of placeholders) {
      const testId = `nav-placeholder-${label.toLowerCase()}`;
      const el = screen.getByTestId(testId);

      // Assert it is a button (not a link — these sections are unavailable)
      expect(el.tagName).toBe("BUTTON");

      // Assert text includes label + "(coming soon)" marker
      expect(el.textContent).toMatch(new RegExp(`${label}.*coming soon`, "i"));

      // Assert it is disabled (unavailable, not just unselected)
      expect((el as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("renders logout button", async () => {
    await renderShell();
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    expect(logoutButton).toBeTruthy();
    expect((logoutButton as HTMLButtonElement).disabled).toBe(false);
  });

  it("clicking logout POSTs to /auth/logout and shows login", async () => {
    let logoutCalled = false;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/auth/refresh") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(AUTH_USER),
        });
      }
      if (url === "/auth/logout") {
        logoutCalled = true;
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(logoutCalled).toBe(true);
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Expired session — bootstrap refresh failure shows login
// ---------------------------------------------------------------------------

describe("AdminApp expired session", () => {
  it("shows login when bootstrap refresh returns 401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: "Unauthorized" }),
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });

    // No shell should appear
    expect(screen.queryByTestId("admin-shell")).toBeNull();
    expect(screen.queryByTestId("admin-loading")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TRIANGULATE — login submit button state and admin content area
// ---------------------------------------------------------------------------

describe("AdminApp triangulation", () => {
  it("shows placeholder content in main area when no section is selected", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(AUTH_USER),
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });

    expect(screen.getByTestId("admin-content")).toBeTruthy();
    expect(screen.getByText(/select a section/i)).toBeTruthy();
  });

  it("login submit button is disabled while submitting", async () => {
    // Refresh fails → login shown
    // Login will be pending (never resolves)
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string) => {
        if (url === "/auth/refresh") {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url === "/auth/login") {
          return new Promise<Response>(() => {}); // never resolves
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "pw" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Button and inputs should be disabled during submission
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /sign in/i });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    expect(
      (screen.getByLabelText(/email/i) as HTMLInputElement).disabled,
    ).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — logout failure keeps shell visible with error
  // -----------------------------------------------------------------------

  it("keeps shell visible and shows error when logout fails", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/auth/refresh") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(AUTH_USER),
        });
      }
      if (url === "/auth/logout") {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });

    // Click logout
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    // Shell should still be visible (user not cleared)
    await waitFor(() => {
      expect(screen.getByTestId("admin-logout-error")).toBeTruthy();
    });

    expect(screen.getByTestId("admin-shell")).toBeTruthy();
    expect(screen.getByTestId("admin-user-name")).toBeTruthy();
    // Login form should NOT appear
    expect(screen.queryByTestId("admin-login")).toBeNull();
  });
});
