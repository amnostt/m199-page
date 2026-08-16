// ---------------------------------------------------------------------------
// AdminApp component tests (Task 4.2)
//
// Tests admin bootstrap, login, shell navigation, and logout behavior:
// - Bootstrap: refreshSession success → shell; failure → login
// - Login: submit success → shell; error on failure
// - Shell: Landing Settings active, placeholders disabled, logout button
// - Logout failure: keeps shell visible and shows error message
//
// WU3 / Slice 1 — the Posts and Outings admin sections were removed
// from the shell. Tests that exercised clicking those nav items were
// removed in lockstep; surviving navigation tests cover Landing
// Settings and Responsibles.
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
    expect(screen.getByText(/cargando/i)).toBeTruthy();

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

    expect(
      screen.getByRole("heading", { name: "Administración de Misión 1-99" }),
    ).toBeTruthy();
    expect(screen.getByRole("img", { name: "Misión 1-99" })).toBeTruthy();
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
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

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

    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/auth/refresh") {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url === "/auth/login") {
          // Verify the login body was sent
          const body = JSON.parse((init?.body as string) ?? "{}") as {
            email: string;
            password: string;
          };
          expect(body.email).toBe("editor@m199.org");
          expect(body.password).toBe("pass123");
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(loginUser),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

    render(<AdminApp />);

    // Wait for login form to appear
    await waitFor(() => {
      expect(screen.getByTestId("admin-login")).toBeTruthy();
    });

    // Fill in the form
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    fireEvent.change(emailInput, { target: { value: "editor@m199.org" } });
    fireEvent.change(passwordInput, { target: { value: "pass123" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

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
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: "bad@m199.org" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

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

  it("does NOT render the legacy posts or outings nav items (WU3 cleanup)", async () => {
    await renderShell();
    expect(screen.queryByTestId("nav-posts")).toBeNull();
    expect(screen.queryByTestId("nav-outings")).toBeNull();
  });

  it("clicking Responsibles nav shows ResponsiblesPage and hides LandingSettings", async () => {
    await renderShell();

    // Landing Settings should be visible by default
    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    // Click Responsibles nav
    const responsiblesNav = screen.getByTestId("nav-responsibles");
    fireEvent.click(responsiblesNav);

    // Responsibles page should now be visible
    await waitFor(() => {
      expect(screen.getByTestId("responsibles-page")).toBeTruthy();
    });

    // Landing Settings should be hidden
    expect(screen.queryByTestId("landing-settings-form")).toBeNull();

    // The Responsibles nav button should now be disabled (active section
    // is Responsibles — the disabled flag prevents re-navigation).
    expect((responsiblesNav as HTMLButtonElement).disabled).toBe(true);

    // Shell should still be intact
    expect(screen.getByTestId("admin-shell")).toBeTruthy();
    expect(screen.getByTestId("admin-user-name")).toBeTruthy();
    expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeTruthy();
  });

  it("guards navigation and beforeunload while landing changes are unsaved", async () => {
    await renderShell();
    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Título principal"), {
      target: { value: "Título sin guardar" },
    });
    expect(screen.getByTestId("landing-settings-dirty")).toBeTruthy();

    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    fireEvent.click(screen.getByTestId("nav-responsibles"));
    expect(
      await screen.findByRole("alertdialog", { name: "Cambios sin guardar" }),
    ).toBeTruthy();
    expect(screen.queryByTestId("responsibles-page")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByTestId("landing-settings-form")).toBeTruthy();

    fireEvent.click(screen.getByTestId("nav-responsibles"));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Descartar y salir" }));

    await waitFor(() => {
      expect(screen.getByTestId("responsibles-page")).toBeTruthy();
    });
  });

  it("guards logout while landing changes are unsaved", async () => {
    await renderShell();
    await waitFor(() => {
      expect(screen.getByTestId("landing-settings-form")).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText("Título principal"), {
      target: { value: "Título sin guardar" },
    });

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));
    expect(
      await screen.findByRole("alertdialog", { name: "Cambios sin guardar" }),
    ).toBeTruthy();
    expect(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.some(
        ([url]) => url === "/auth/logout",
      ),
    ).toBe(false);
  });

  it("renders placeholder nav items for out-of-scope sections as disabled", async () => {
    await renderShell();

    // The only remaining placeholder is Files. Legacy content sections were
    // removed from the admin shell.
    const placeholders = [{ label: "Archivos", testId: "files" }];

    for (const { label, testId: placeholderId } of placeholders) {
      const testId = `nav-placeholder-${placeholderId}`;
      const el = screen.getByTestId(testId);

      // Assert it is a button (not a link — these sections are unavailable)
      expect(el.tagName).toBe("BUTTON");

      // Assert text includes label + "(coming soon)" marker
      expect(el.textContent).toMatch(new RegExp(`${label}.*próximamente`, "i"));

      // Assert it is disabled (unavailable, not just unselected)
      expect((el as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("renders Responsibles as an enabled section and passes the current user", async () => {
    await renderShell();
    fireEvent.click(screen.getByTestId("nav-responsibles"));
    await waitFor(() => {
      expect(screen.getByTestId("responsibles-page")).toBeTruthy();
    });
    expect(
      screen.getByText(/administra las personas responsables/i),
    ).toBeTruthy();
    expect(
      (screen.getByTestId("nav-responsibles") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("renders logout button", async () => {
    await renderShell();
    const logoutButton = screen.getByRole("button", { name: /cerrar sesión/i });
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

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));

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
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
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
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "pw" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    // Button and inputs should be disabled during submission
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /ingresar/i });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    expect(
      (screen.getByLabelText(/correo electrónico/i) as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TRIANGULATE — login timeout shows error instead of permanent submitting
  // -----------------------------------------------------------------------

  it("shows error after login timeout instead of staying submitting forever", async () => {
    // Set login timeout to 0 so it fires immediately after submit
    TIMEOUTS.login = 0;

    // Refresh fails → login form shown; login fetch never resolves (hung endpoint)
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
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
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    // The zero-delay timeout fires: error shown, submitting cleared
    await waitFor(() => {
      expect(screen.getByTestId("admin-login-error")).toBeTruthy();
    });

    // Sign In button should be re-enabled
    const btn = screen.getByRole("button", { name: /ingresar/i });
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
    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));

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
