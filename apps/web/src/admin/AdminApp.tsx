// ---------------------------------------------------------------------------
// AdminApp — admin session bootstrap, login fallback, and shell composition.
//
// On mount: POST /auth/refresh with credentials.
//   - 200 AuthUser → AdminShell
//   - 401/403/error → AdminLogin
//
// AdminLogin: email/password form calling login().
// AdminShell: sidebar with Landing Settings active, placeholder items for
//   out-of-scope sections, and logout button.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import type { AuthUser } from "./adminTypes.js";
import { login, logout, refreshSession } from "./session.js";
import { LandingSettingsPage } from "./LandingSettingsPage.js";
import { PostsPage } from "./PostsPage.js";
import { OutingsPage } from "./OutingsPage.js";
import { ResponsiblesPage } from "./ResponsiblesPage.js";
import { VersesPage } from "./VersesPage.js";

// ---------------------------------------------------------------------------
// Timeout constants — prevent permanent loading/submitting when auth
// endpoints hang. After the timeout the user sees a recoverable fallback
// (login form or inline error) instead of an infinite spinner.
//
// Exported as a writable object so tests can set them to 0 without
// needing fake timers.
// ---------------------------------------------------------------------------

export const TIMEOUTS = {
  bootstrap: 15_000,
  login: 15_000,
};

// ---------------------------------------------------------------------------
// AdminLogin — inline email/password form
// ---------------------------------------------------------------------------

function AdminLogin({
  onLogin,
}: {
  onLogin: (user: AuthUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(false);
    setSubmitting(true);

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setSubmitting(false);
      setError(true);
    }, TIMEOUTS.login);

    try {
      const user = await login(email, password);
      if (timedOut) return;
      onLogin(user);
    } catch {
      if (timedOut) return;
      setError(true);
    } finally {
      clearTimeout(timeoutId);
      if (!timedOut) setSubmitting(false);
    }
  };

  return (
    <div data-testid="admin-login">
      <h1>Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={submitting}
        />
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={submitting}
        />
        <button type="submit" disabled={submitting}>
          Sign In
        </button>
      </form>
      {error && (
        <div data-testid="admin-login-error">Invalid credentials. Try again.</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdminShell — sidebar navigation with active section switching.
// ---------------------------------------------------------------------------

export type AdminSection =
  | "landing"
  | "posts"
  | "outings"
  | "responsibles"
  | "verses";

const PLACEHOLDER_SECTIONS = ["Files"];

function AdminShell({
  user,
  activeSection,
  onNavigate,
  onLogout,
  logoutError,
}: {
  user: AuthUser;
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  onLogout: () => void;
  logoutError: boolean;
}) {
  return (
    <div data-testid="admin-shell">
      <header>
        <span data-testid="admin-user-name">{user.displayName}</span>
      </header>
      <nav data-testid="admin-sidebar">
        <ul>
          <li>
            <button
              type="button"
              data-testid="nav-landing-settings"
              onClick={() => onNavigate("landing")}
              disabled={activeSection === "landing"}
            >
              Landing Settings
            </button>
          </li>
          <li>
            <button
              type="button"
              data-testid="nav-verses"
              onClick={() => onNavigate("verses")}
              disabled={activeSection === "verses"}
            >
              Verses
            </button>
          </li>
          <li>
            <button
              type="button"
              data-testid="nav-responsibles"
              onClick={() => onNavigate("responsibles")}
              disabled={activeSection === "responsibles"}
            >
              Responsibles
            </button>
          </li>
          <li>
            <button
              type="button"
              data-testid="nav-posts"
              onClick={() => onNavigate("posts")}
              disabled={activeSection === "posts"}
            >
              Posts
            </button>
          </li>
          <li>
            <button
              type="button"
              data-testid="nav-outings"
              onClick={() => onNavigate("outings")}
              disabled={activeSection === "outings"}
            >
              Outings
            </button>
          </li>
          {PLACEHOLDER_SECTIONS.map((label) => (
            <li key={label}>
              <button
                type="button"
                disabled
                data-testid={`nav-placeholder-${label.toLowerCase()}`}
              >
                {label} (coming soon)
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main data-testid="admin-content">
        {activeSection === "landing" ? (
          <LandingSettingsPage />
        ) : activeSection === "posts" ? (
          <PostsPage />
        ) : activeSection === "outings" ? (
          <OutingsPage />
        ) : activeSection === "verses" ? (
          <VersesPage />
        ) : (
          <ResponsiblesPage currentUserId={user.id} />
        )}
      </main>
      <footer>
        <button
          type="button"
          data-testid="admin-logout"
          onClick={onLogout}
        >
          Logout
        </button>
        {logoutError && (
          <span data-testid="admin-logout-error">
            Logout failed. Please try again.
          </span>
        )}
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdminApp — top-level admin component
// ---------------------------------------------------------------------------

export function AdminApp() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutError, setLogoutError] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>("landing");

  // Bootstrap: attempt refresh on mount with bounded timeout.
  // If the auth endpoint hangs the timeout clears the loading state
  // so the user sees the login form instead of an infinite spinner.
  useEffect(() => {
    let cancelled = false;
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      if (!cancelled) setLoading(false);
    }, TIMEOUTS.bootstrap);

    refreshSession()
      .then((data) => {
        if (!cancelled && !timedOut) setUser(data);
      })
      .catch(() => {
        // Refresh failed — user stays null (login shown)
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const handleLogout = async () => {
    setLogoutError(false);
    try {
      await logout();
      setUser(null);
    } catch {
      setLogoutError(true);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div data-testid="admin-loading">
        <p>Loading…</p>
      </div>
    );
  }

  // Not authenticated — show login
  if (!user) {
    return <AdminLogin onLogin={setUser} />;
  }

  // Authenticated — show shell
  return (
    <AdminShell
      user={user}
      activeSection={activeSection}
      onNavigate={setActiveSection}
      onLogout={handleLogout}
      logoutError={logoutError}
    />
  );
}
