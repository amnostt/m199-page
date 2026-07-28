import type { AuthUser } from "./adminTypes.js";
import { LandingSettingsPage } from "./LandingSettingsPage.js";
import { PostsPage } from "./PostsPage.js";
import { OutingsPage } from "./OutingsPage.js";
import { ResponsiblesPage } from "./ResponsiblesPage.js";
import { VersesPage } from "./VersesPage.js";
export type AdminSection =
  "landing" | "posts" | "outings" | "responsibles" | "verses";
const sections: Array<[AdminSection, string]> = [
  ["landing", "Landing Settings"],
  ["verses", "Verses"],
  ["responsibles", "Responsibles"],
  ["posts", "Posts"],
  ["outings", "Outings"],
];
export interface AdminShellProps {
  user: AuthUser;
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  onLogout: () => void;
  logoutError: boolean;
}
function SectionContent({
  section,
  user,
}: {
  section: AdminSection;
  user: AuthUser;
}) {
  if (section === "landing") return <LandingSettingsPage />;
  if (section === "posts") return <PostsPage />;
  if (section === "outings") return <OutingsPage />;
  if (section === "verses") return <VersesPage />;
  return <ResponsiblesPage currentUserId={user.id} />;
}
export function AdminShell({
  user,
  activeSection,
  onNavigate,
  onLogout,
  logoutError,
}: AdminShellProps) {
  const label = sections.find(([section]) => section === activeSection)?.[1];
  return (
    <div
      className="grid min-h-screen grid-cols-1 md:grid-cols-[15rem_1fr]"
      data-testid="admin-shell"
    >
      <aside
        className="border-b border-border bg-card p-4 md:row-span-3 md:border-r md:border-b-0"
        data-testid="admin-sidebar"
      >
        <strong className="font-heading">Misión 1-99</strong>
        <nav className="mt-4 grid gap-2" aria-label="Admin sections">
          {sections.map(([section, sectionLabel]) => (
            <button
              key={section}
              type="button"
              data-testid={`nav-${section === "landing" ? "landing-settings" : section}`}
              onClick={() => onNavigate(section)}
              disabled={activeSection === section}
              className="min-h-10 rounded-md border border-input bg-card px-3 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:bg-accent disabled:text-accent-foreground disabled:opacity-100"
            >
              {sectionLabel}
            </button>
          ))}
          <button
            type="button"
            disabled
            className="min-h-10 rounded-md border border-input bg-muted px-3 py-2 text-left opacity-60"
            data-testid="nav-placeholder-files"
          >
            Files (coming soon)
          </button>
        </nav>
      </aside>
      <header className="flex items-center justify-between border-b border-border bg-card p-4">
        <p className="text-muted-foreground">Administration</p>
        <strong data-testid="admin-user-name">{user.displayName}</strong>
      </header>
      <main
        className="min-w-0 p-[clamp(1rem,3vw,2rem)]"
        data-testid="admin-content"
      >
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Admin portal</p>
          <h1 className="font-heading text-3xl font-bold leading-tight">
            {label}
          </h1>
        </div>
        <div>
          <SectionContent section={activeSection} user={user} />
        </div>
      </main>
      <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-card p-4 md:col-start-2">
        <button
          type="button"
          className="min-h-10 rounded-md border border-input bg-card px-3 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          data-testid="admin-logout"
          onClick={onLogout}
        >
          Logout
        </button>
        {logoutError && (
          <span
            className="text-destructive"
            role="alert"
            data-testid="admin-logout-error"
          >
            Logout failed. Please try again.
          </span>
        )}
      </footer>
    </div>
  );
}
