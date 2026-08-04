// ---------------------------------------------------------------------------
// AdminShell — authenticated sidebar shell composition tests.
//
// Canonical Sidebar 07 closure: identity in footer, header trigger/title,
// SidebarRail, and mobile Sheet focus restoration. Routes, auth, callbacks,
// test IDs, accessible names, and content are preserved.
// ---------------------------------------------------------------------------

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { AdminShell, type AdminSection } from "./AdminShell.js";

const USER = {
  id: "u1",
  email: "admin@m199.org",
  displayName: "Admin User",
};

function renderShell(
  activeSection: AdminSection = "landing",
  overrides: Partial<{
    logoutError: boolean;
    onNavigate: (section: AdminSection) => void;
    onLogout: () => void;
  }> = {},
) {
  const onNavigate = overrides.onNavigate ?? vi.fn();
  const onLogout = overrides.onLogout ?? vi.fn();
  return {
    onNavigate,
    onLogout,
    view: render(
      <AdminShell
        user={USER}
        activeSection={activeSection}
        onNavigate={onNavigate}
        onLogout={onLogout}
        logoutError={overrides.logoutError ?? false}
      />,
    ),
  };
}

beforeEach(() => {
  // Reset to a known desktop viewport so mobile logic in later tests stays
  // opt-in. The mobile responsive test resets it to 375 explicitly.
  window.innerWidth = 1280;
  window.innerHeight = 800;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width") && window.innerWidth < 768,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.innerWidth = 1280;
  window.innerHeight = 800;
});

describe("AdminShell", () => {
  it("renders the canonical navigation with active state, identity, and disabled Files", () => {
    renderShell("posts");

    expect(screen.getByTestId("admin-sidebar")).toBeTruthy();
    expect(screen.getByTestId("admin-user-name").textContent).toBe(
      USER.displayName,
    );
    expect(screen.getByTestId("nav-posts").getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      (screen.getByTestId("nav-posts") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId("nav-placeholder-files") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText("Archivos (próximamente)")).toBeTruthy();
  });

  it("uses navigation and logout callbacks without changing shell ownership", () => {
    const onNavigate = vi.fn();
    const onLogout = vi.fn();
    render(
      <AdminShell
        user={USER}
        activeSection="landing"
        onNavigate={onNavigate}
        onLogout={onLogout}
        logoutError={false}
      />,
    );

    fireEvent.click(screen.getByTestId("nav-posts"));
    fireEvent.click(screen.getByTestId("admin-logout"));

    expect(onNavigate).toHaveBeenCalledWith("posts");
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("opens the responsive mobile sidebar from the accessible trigger", async () => {
    window.innerWidth = 375;
    renderShell();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /alternar barra lateral de administración/i,
        }),
      ).toBeTruthy();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /alternar barra lateral de administración/i,
      }),
    );

    await waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).toBeTruthy();
    });
    expect(screen.getByTestId("nav-landing-settings")).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Sidebar 07 canonical closure. RED tests below assert application
  // composition that the prior shell did not implement. They run against the
  // current source and are expected to fail.
  // ---------------------------------------------------------------------------

  it("places the authenticated identity inside the sidebar footer (not the header)", () => {
    const { view } = renderShell("landing");
    const sidebar = screen.getByTestId("admin-sidebar");
    const userName = screen.getByTestId("admin-user-name");
    const footer = sidebar.querySelector('[data-slot="sidebar-footer"]');
    expect(footer).toBeTruthy();
    expect(footer?.contains(userName)).toBe(true);
    expect(sidebar.querySelector('[data-slot="sidebar-header"]')).toBeTruthy();
    // The header brand "Misión 1-99" stays; the user identity does not.
    expect(
      sidebar.querySelector('[data-slot="sidebar-header"]')?.contains(userName),
    ).toBe(false);
    view.unmount();
  });

  it("renders the footer identity with display name and email together", () => {
    renderShell("landing");
    const footer = screen
      .getByTestId("admin-sidebar")
      .querySelector('[data-slot="sidebar-footer"]');
    expect(footer?.textContent).toContain(USER.displayName);
    expect(footer?.textContent).toContain(USER.email);
  });

  it("keeps the logout control inside the sidebar footer", () => {
    renderShell("landing");
    const footer = screen
      .getByTestId("admin-sidebar")
      .querySelector('[data-slot="sidebar-footer"]');
    expect(footer?.contains(screen.getByTestId("admin-logout"))).toBe(true);
  });

  it("mounts the canonical SidebarRail inside the sidebar", () => {
    renderShell("landing");
    const sidebar = screen.getByTestId("admin-sidebar");
    expect(sidebar.querySelector('[data-slot="sidebar-rail"]')).toBeTruthy();
  });

  it("treats the placeholder Files item as non-clickable via aria-disabled", () => {
    renderShell("landing");
    const placeholder = screen.getByTestId("nav-placeholder-files");
    expect(placeholder.getAttribute("aria-disabled")).toBe("true");
    expect((placeholder as HTMLButtonElement).disabled).toBe(true);
  });

  it("only marks the active section as aria-current and disabled", () => {
    renderShell("verses");
    const allNav = [
      "nav-landing-settings",
      "nav-verses",
      "nav-responsibles",
      "nav-posts",
      "nav-outings",
    ];
    expect(screen.getByTestId("nav-verses").getAttribute("aria-current")).toBe(
      "page",
    );
    for (const id of allNav) {
      const btn = screen.getByTestId(id);
      if (id === "nav-verses") {
        expect((btn as HTMLButtonElement).disabled).toBe(true);
      } else {
        expect(btn.getAttribute("aria-current")).toBeNull();
        expect((btn as HTMLButtonElement).disabled).toBe(false);
      }
    }
  });

  it("restores focus to the sidebar trigger after closing the mobile Sheet", async () => {
    window.innerWidth = 375;
    renderShell("landing");

    const trigger = await waitFor(() =>
      screen.getByRole("button", {
        name: /alternar barra lateral de administración/i,
      }),
    );
    (trigger as HTMLButtonElement).focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).toBeTruthy();
    });

    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).toBeNull();
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("renders the logout error inside the sidebar footer", () => {
    renderShell("landing", { logoutError: true });
    const footer = screen
      .getByTestId("admin-sidebar")
      .querySelector('[data-slot="sidebar-footer"]');
    expect(footer?.contains(screen.getByTestId("admin-logout-error"))).toBe(
      true,
    );
  });
});
