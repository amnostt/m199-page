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
import { login, logout } from "./session.js";

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

    try {
      const user = await login(email, password);
      onLogin(user);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
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
// AdminShell — sidebar navigation with active Landing Settings and
// placeholder entries for out-of-scope sections.
// ---------------------------------------------------------------------------

const PLACEHOLDER_SECTIONS = [
  "Posts",
  "Outings",
  "Verses",
  "Responsibles",
  "Files",
];

function AdminShell({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  return (
    <div data-testid="admin-shell">
      <header>
        <span data-testid="admin-user-name">{user.displayName}</span>
      </header>
      <nav data-testid="admin-sidebar">
        <ul>
          <li>
            <a href="/admin" data-testid="nav-landing-settings">
              Landing Settings
            </a>
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
        <p>Select a section from the sidebar.</p>
      </main>
      <footer>
        <button
          type="button"
          data-testid="admin-logout"
          onClick={onLogout}
        >
          Logout
        </button>
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

  // Bootstrap: attempt refresh on mount
  useEffect(() => {
    let cancelled = false;

    fetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as AuthUser;
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        // Refresh failed — user stays null (login shown)
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout().catch(() => {
      /* best-effort */
    });
    setUser(null);
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
  return <AdminShell user={user} onLogout={handleLogout} />;
}
