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

function renderShell(activeSection: AdminSection = "landing") {
  return render(
    <AdminShell
      user={USER}
      activeSection={activeSection}
      onNavigate={vi.fn()}
      onLogout={vi.fn()}
      logoutError={false}
    />,
  );
}

beforeEach(() => {
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
    expect(screen.getByText("Files (coming soon)")).toBeTruthy();
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
        screen.getByRole("button", { name: /toggle admin sidebar/i }),
      ).toBeTruthy();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /toggle admin sidebar/i }),
    );

    await waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).toBeTruthy();
    });
    expect(screen.getByTestId("nav-landing-settings")).toBeTruthy();
  });
});
