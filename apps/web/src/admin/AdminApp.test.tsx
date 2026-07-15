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
import { StrictMode } from "react";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { AdminApp, TIMEOUTS } from "./AdminApp.js";

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
    let resolveRefresh!: () => void;
    const refreshDeferred = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });

    // Pending fetch keeps the bootstrap loading long enough to assert it.
    globalThis.fetch = vi.fn().mockImplementation(() =>
      refreshDeferred.then(() => ({
        ok: true,
        json: () => Promise.resolve(AUTH_USER),
      })),
    );

    render(<AdminApp />);

    expect(screen.getByTestId("admin-loading")).toBeTruthy();
    expect(screen.getByText(/loading/i)).toBeTruthy();

    resolveRefresh();
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

  it("shows login form after bootstrap timeout (no infinite loading)", async () => {
    // Set timeout to 0 so it fires immediately; keep fetch hung
    TIMEOUTS.bootstrap = 0;

    let resolveRefresh!: () => void;
    const refreshDeferred = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });

    globalThis.fetch = vi.fn().mockImplementation(() =>
      refreshDeferred.then(() => ({
        ok: true,
        json: () => Promise.resolve(AUTH_USER),
      })),
    );

    render(<AdminApp />);

    // The zero-delay setTimeout fires before the hung promise resolves;
    // loading ends and login form appears.
    await waitFor(() => {
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });

    expect(screen.queryByTestId("admin-loading")).toBeNull();

    resolveRefresh();

    // Restore
    TIMEOUTS.bootstrap = 15_000;
  });

  it("shares one bootstrap refresh under StrictMode duplicate mount", async () => {
    let resolveRefresh!: () => void;
    const refreshDeferred = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/auth/refresh") {
        return refreshDeferred.then(() => ({
          ok: true,
          json: () => Promise.resolve(AUTH_USER),
        }));
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <StrictMode>
        <AdminApp />
      </StrictMode>,
    );

    await Promise.resolve();

    expect(
      vi.mocked(fetch).mock.calls.filter(([url]) => url === "/auth/refresh"),
    ).toHaveLength(1);

    resolveRefresh();

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
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
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/auth/refresh") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(AUTH_USER),
        });
      }
      // Posts list API (called when PostsPage mounts)
      if (url === "/posts/admin") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      // Landing settings GET
      if (url === "/landing/admin") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              mission: "m",
              vision: "v",
              description: "d",
              featuredVideoUrl: null,
              contactEmail: null,
              contactPhone: null,
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });
  }

  it("renders Landing Settings nav item (disabled when active by default)", async () => {
    await renderShell();
    const landingLink = screen.getByTestId("nav-landing-settings");
    expect(landingLink).toBeTruthy();
    // Landing is the default active section — button is present but disabled
    expect(landingLink.tagName).toBe("BUTTON");
    expect((landingLink as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders Posts nav item as active (not disabled placeholder)", async () => {
    await renderShell();

    // Posts should now be a navigable button, not a disabled placeholder
    const postsNav = screen.getByTestId("nav-posts");
    expect(postsNav).toBeTruthy();
    expect(postsNav.tagName).toBe("BUTTON");
    expect((postsNav as HTMLButtonElement).disabled).toBe(false);
    // Should NOT have the "(coming soon)" suffix
    expect(postsNav.textContent).not.toMatch(/coming soon/i);
  });

  it("clicking Posts nav shows PostsListPage and hides LandingSettings", async () => {
    // Override fetch to handle both auth and posts API
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/auth/refresh") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(AUTH_USER),
        });
      }
      if (url === "/posts/admin") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "p1",
                slug: "hello",
                title: "Hello",
                status: "DRAFT",
                coverImageId: null,
                publishedAt: null,
              },
            ]),
        });
      }
      // Landing settings GET
      if (url === "/landing/admin") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              mission: "m",
              vision: "v",
              description: "d",
              featuredVideoUrl: null,
              contactEmail: null,
              contactPhone: null,
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });

    // Landing Settings should be visible by default
    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    // Click Posts nav
    const postsNav = screen.getByTestId("nav-posts");
    fireEvent.click(postsNav);

    // Posts list should now be visible
    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // Landing Settings should be hidden
    expect(screen.queryByTestId("landing-settings-form")).toBeNull();

    // Click Landing Settings nav to switch back
    const landingNav = screen.getByTestId("nav-landing-settings");
    fireEvent.click(landingNav);

    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    // Posts list should be hidden
    expect(screen.queryByTestId("posts-list-table")).toBeNull();

    // Shell should still be intact
    expect(screen.getByTestId("admin-shell")).toBeTruthy();
    expect(screen.getByTestId("admin-user-name")).toBeTruthy();
    expect(screen.getByRole("button", { name: /logout/i })).toBeTruthy();
  });

  it("clicking Outings nav shows OutingsPage (list) and hides LandingSettings", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/auth/refresh") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(AUTH_USER),
        });
      }
      if (url === "/outings/admin") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "o1",
                slug: "camp-day",
                title: "Camp Day",
                dateTime: "2026-07-15T10:00:00.000Z",
                location: "Barrio Norte",
                description: "A great day",
                status: "DRAFT",
                mainImageId: null,
                croquisId: null,
                planId: null,
              },
            ]),
        });
      }
      // Landing settings GET
      if (url === "/landing/admin") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              mission: "m",
              vision: "v",
              description: "d",
              featuredVideoUrl: null,
              contactEmail: null,
              contactPhone: null,
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });

    // Landing Settings should be visible by default
    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    // Click Outings nav
    const outingsNav = screen.getByTestId("nav-outings");
    fireEvent.click(outingsNav);

    // Outings list should now be visible
    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // Landing Settings should be hidden
    expect(screen.queryByTestId("landing-settings-form")).toBeNull();

    // Posts list (the other active section) should also be hidden
    expect(screen.queryByTestId("posts-list-table")).toBeNull();

    // The Outings nav button should now be disabled (active section is
    // Outings — the disabled flag prevents re-navigation).
    expect((outingsNav as HTMLButtonElement).disabled).toBe(true);

    // Shell should still be intact
    expect(screen.getByTestId("admin-shell")).toBeTruthy();
    expect(screen.getByTestId("admin-user-name")).toBeTruthy();
    expect(screen.getByRole("button", { name: /logout/i })).toBeTruthy();
  });

  it("switching between Outings and Posts preserves the shell", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/auth/refresh") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(AUTH_USER),
        });
      }
      if (url === "/outings/admin") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "o1",
                slug: "camp-day",
                title: "Camp Day",
                dateTime: "2026-07-15T10:00:00.000Z",
                location: "Barrio Norte",
                description: "A great day",
                status: "DRAFT",
                mainImageId: null,
                croquisId: null,
                planId: null,
              },
            ]),
        });
      }
      if (url === "/posts/admin") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "p1",
                slug: "hello",
                title: "Hello",
                status: "DRAFT",
                coverImageId: null,
                publishedAt: null,
              },
            ]),
        });
      }
      if (url === "/landing/admin") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              mission: "m",
              vision: "v",
              description: "d",
              featuredVideoUrl: null,
              contactEmail: null,
              contactPhone: null,
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });

    // Navigate to Outings
    fireEvent.click(screen.getByTestId("nav-outings"));
    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // Switch to Posts
    fireEvent.click(screen.getByTestId("nav-posts"));
    await waitFor(() => {
      expect(screen.getByTestId("posts-list-table")).toBeTruthy();
    });

    // Outings list is gone
    expect(screen.queryByTestId("outings-list-table")).toBeNull();

    // Switch back to Outings
    fireEvent.click(screen.getByTestId("nav-outings"));
    await waitFor(() => {
      expect(screen.getByTestId("outings-list-table")).toBeTruthy();
    });

    // Posts list is gone
    expect(screen.queryByTestId("posts-list-table")).toBeNull();

    // Shell and session still intact
    expect(screen.getByTestId("admin-shell")).toBeTruthy();
    expect(screen.getByTestId("admin-user-name")).toBeTruthy();
  });

  it("renders placeholder nav items for out-of-scope sections as disabled", async () => {
    await renderShell();

    // Outings and Responsibles are active nav sections; only Verses and Files
    // remain as placeholders.
    const placeholders = ["Verses", "Files"];

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

  it("renders Outings nav item as an active (navigable) button, not a placeholder", async () => {
    await renderShell();

    const outingsNav = screen.getByTestId("nav-outings");
    expect(outingsNav).toBeTruthy();
    expect(outingsNav.tagName).toBe("BUTTON");
    // Outings is now an active section — not disabled, not a placeholder
    expect((outingsNav as HTMLButtonElement).disabled).toBe(false);
    // Should NOT carry the "(coming soon)" placeholder suffix
    expect(outingsNav.textContent).not.toMatch(/coming soon/i);
  });

  it("renders Responsibles as an enabled section and passes the current user", async () => {
    await renderShell();
    fireEvent.click(screen.getByTestId("nav-responsibles"));
    await waitFor(() => {
      expect(screen.getByTestId("responsibles-page")).toBeTruthy();
    });
    expect(screen.getByText(/manage the responsible users/i)).toBeTruthy();
    expect((screen.getByTestId("nav-responsibles") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("does NOT render an Outings placeholder", async () => {
    await renderShell();

    // The old "Outings (coming soon)" placeholder must be gone now that
    // Outings is an active section.
    expect(screen.queryByTestId("nav-placeholder-outings")).toBeNull();
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
  it("renders Landing Settings editor by default in content area", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/auth/refresh") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(AUTH_USER),
        });
      }
      // Landing settings GET
      if (url === "/landing/admin") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              mission: "m",
              vision: "v",
              description: "d",
              featuredVideoUrl: null,
              contactEmail: null,
              contactPhone: null,
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<AdminApp />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-shell")).toBeTruthy();
    });

    // Landing Settings editor should be visible inside the shell
    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    expect(screen.getByTestId("admin-content")).toBeTruthy();
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
  // TRIANGULATE — login timeout shows error instead of permanent submitting
  // -----------------------------------------------------------------------

  it("shows error after login timeout instead of staying submitting forever", async () => {
    // Set login timeout to 0 so it fires immediately after submit
    TIMEOUTS.login = 0;

    // Refresh fails → login form shown; login fetch never resolves (hung endpoint)
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string) => {
        if (url === "/auth/refresh") {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url === "/auth/login") {
          return new Promise<Response>(() => {}); // hung
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

    render(<AdminApp />);

    // Wait for login form to appear (refresh fails)
    await waitFor(() => {
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });

    // Fill and submit
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // The zero-delay timeout fires: error shown, submitting cleared
    await waitFor(() => {
      expect(screen.getByTestId("admin-login-error")).toBeTruthy();
    });

    // Sign In button should be re-enabled
    const btn = screen.getByRole("button", { name: /sign in/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);

    // Restore
    TIMEOUTS.login = 15_000;
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
