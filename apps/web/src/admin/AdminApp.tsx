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
import {
  login,
  logout,
  refreshSession,
  REFRESH_DEADLINE_MS,
} from "./session.js";
import { AdminProviders } from "./AdminProviders.js";
import { AdminShell, type AdminSection } from "./AdminShell.js";

// ---------------------------------------------------------------------------
// Timeout constants — prevent permanent loading/submitting when auth
// endpoints hang. After the timeout the user sees a recoverable fallback
// (login form or inline error) instead of an infinite spinner.
//
// Exported as a writable object so tests can set them to 0 without
// needing fake timers.
// ---------------------------------------------------------------------------

export const TIMEOUTS = {
  // Presentation fallback is aligned with the coordinator's logical caller
  // deadline; refresh-family authority remains server-side.
  bootstrap: REFRESH_DEADLINE_MS,
  login: 15_000,
};

// ---------------------------------------------------------------------------
// AdminLogin — inline email/password form
// ---------------------------------------------------------------------------

function AdminLogin({ onLogin }: { onLogin: (user: AuthUser) => void }) {
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
    <main
      className="admin-ui grid min-h-screen place-items-center bg-background p-4"
      data-testid="admin-login"
    >
      <section className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-card-foreground">
        <h1 className="mb-6 font-heading text-3xl font-bold">Admin Login</h1>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label
            className="grid gap-1.5 text-sm font-semibold"
            htmlFor="admin-email"
          >
            Email
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
              className="min-h-10 rounded-md border border-input bg-background px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
            />
          </label>
          <label
            className="grid gap-1.5 text-sm font-semibold"
            htmlFor="admin-password"
          >
            Password
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
              className="min-h-10 rounded-md border border-input bg-background px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
            />
          </label>
          <button
            className="min-h-11 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            Sign In
          </button>
        </form>
        {error && (
          <div
            className="mt-4 text-sm text-destructive"
            role="alert"
            data-testid="admin-login-error"
          >
            Invalid credentials. Try again.
          </div>
        )}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// AdminShell — sidebar navigation with active section switching.
// ---------------------------------------------------------------------------

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
      <div
        className="admin-ui grid min-h-screen place-items-center bg-background text-muted-foreground"
        data-testid="admin-loading"
      >
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
    <AdminProviders>
      <AdminShell
        user={user}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={handleLogout}
        logoutError={logoutError}
      />
    </AdminProviders>
  );
}
