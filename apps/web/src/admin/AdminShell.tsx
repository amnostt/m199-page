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
    <div className="admin-shell" data-testid="admin-shell">
      <aside className="admin-sidebar" data-testid="admin-sidebar">
        <strong>Misión 1-99</strong>
        <nav aria-label="Admin sections">
          {sections.map(([section, sectionLabel]) => (
            <button
              key={section}
              type="button"
              data-testid={`nav-${section === "landing" ? "landing-settings" : section}`}
              onClick={() => onNavigate(section)}
              disabled={activeSection === section}
            >
              {sectionLabel}
            </button>
          ))}
          <button type="button" disabled data-testid="nav-placeholder-files">
            Files (coming soon)
          </button>
        </nav>
      </aside>
      <header className="admin-header">
        <p>Administration</p>
        <strong data-testid="admin-user-name">{user.displayName}</strong>
      </header>
      <main className="admin-main" data-testid="admin-content">
        <div className="admin-page-heading">
          <p>Admin portal</p>
          <h1>{label}</h1>
        </div>
        <div className="admin-page-content">
          <SectionContent section={activeSection} user={user} />
        </div>
      </main>
      <footer className="admin-footer">
        <button type="button" data-testid="admin-logout" onClick={onLogout}>
          Logout
        </button>
        {logoutError && (
          <span role="alert" data-testid="admin-logout-error">
            Logout failed. Please try again.
          </span>
        )}
      </footer>
    </div>
  );
}
