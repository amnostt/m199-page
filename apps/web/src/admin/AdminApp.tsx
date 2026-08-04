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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
      className="admin-ui flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10"
      data-testid="admin-login"
    >
      <div className="w-full max-w-sm md:max-w-4xl">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form className="p-6 md:p-8" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">
                    Administración de Misión 1-99
                  </h1>
                  <FieldDescription>
                    Inicia sesión para administrar el contenido de Misión 1-99.
                  </FieldDescription>
                </div>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="admin-email">
                      Correo electrónico
                    </FieldLabel>
                    <Input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      disabled={submitting}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="admin-password">Contraseña</FieldLabel>
                    <Input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={submitting}
                    />
                  </Field>
                  <Field>
                    <Button type="submit" disabled={submitting}>
                      Ingresar
                    </Button>
                  </Field>
                </FieldGroup>
                {error && (
                  <div
                    className="text-sm text-destructive"
                    role="alert"
                    aria-live="polite"
                    data-testid="admin-login-error"
                  >
                    Las credenciales no son válidas. Intenta de nuevo.
                  </div>
                )}
              </div>
            </form>
            <div className="relative hidden bg-muted md:block">
              <div className="absolute inset-0 flex items-center justify-center bg-foreground p-10">
                <img
                  src="/assets/brand/logo-horizontal.png"
                  alt="Misión 1-99"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
        <p>Cargando…</p>
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
