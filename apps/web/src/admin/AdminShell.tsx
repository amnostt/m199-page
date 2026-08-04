import {
  BookOpenText,
  CalendarDays,
  Files,
  LogOut,
  Newspaper,
  Settings2,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Separator } from "../components/ui/separator.js";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "../components/ui/sidebar.js";
import { TooltipProvider } from "../components/ui/tooltip.js";
import type { AuthUser } from "./adminTypes.js";
import { LandingSettingsPage } from "./LandingSettingsPage.js";
import { PostsPage } from "./PostsPage.js";
import { OutingsPage } from "./OutingsPage.js";
import { ResponsiblesPage } from "./ResponsiblesPage.js";
import { VersesPage } from "./VersesPage.js";

export type AdminSection =
  "landing" | "posts" | "outings" | "responsibles" | "verses";

type AdminNavItem = {
  section: AdminSection;
  label: string;
  icon: LucideIcon;
};

const sections: AdminNavItem[] = [
  { section: "landing", label: "Landing Settings", icon: Settings2 },
  { section: "verses", label: "Verses", icon: BookOpenText },
  { section: "responsibles", label: "Responsibles", icon: UsersRound },
  { section: "posts", label: "Posts", icon: Newspaper },
  { section: "outings", label: "Outings", icon: CalendarDays },
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
  const label = sections.find(
    ({ section }) => section === activeSection,
  )?.label;

  return (
    <TooltipProvider>
      <SidebarProvider data-testid="admin-shell" className="min-h-svh w-full">
        <Sidebar collapsible="icon" data-testid="admin-sidebar">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Misión 1-99"
                  render={<div aria-label="Misión 1-99" />}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground"
                  >
                    1-99
                  </span>
                  <span className="font-heading text-base font-semibold">
                    Misión 1-99
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sections.map(
                    ({ section, label: sectionLabel, icon: Icon }) => {
                      const isActive = activeSection === section;

                      return (
                        <SidebarMenuItem key={section}>
                          <SidebarMenuButton
                            type="button"
                            render={<button disabled={isActive} />}
                            data-testid={`nav-${section === "landing" ? "landing-settings" : section}`}
                            isActive={isActive}
                            disabled={isActive}
                            tooltip={sectionLabel}
                            className="disabled:opacity-100"
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => onNavigate(section)}
                          >
                            <Icon aria-hidden="true" />
                            <span>{sectionLabel}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    },
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      render={<button disabled aria-disabled="true" />}
                      disabled
                      aria-disabled="true"
                      data-testid="nav-placeholder-files"
                      tooltip="Files (coming soon)"
                    >
                      <Files aria-hidden="true" />
                      <span>Files (coming soon)</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip={user.displayName}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  render={<div aria-label={user.displayName} />}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground"
                  >
                    1-99
                  </span>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span
                      data-testid="admin-user-name"
                      className="truncate font-medium"
                    >
                      {user.displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  type="button"
                  tooltip="Logout"
                  data-testid="admin-logout"
                  onClick={onLogout}
                >
                  <LogOut aria-hidden="true" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            {logoutError && (
              <span
                className="px-2 text-sm text-destructive"
                role="alert"
                data-testid="admin-logout-error"
              >
                Logout failed. Please try again.
              </span>
            )}
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger
                className="-ml-1"
                aria-label="Toggle admin sidebar"
              />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  Administration
                </p>
                <h1 className="truncate text-sm font-semibold">{label}</h1>
              </div>
            </div>
          </header>

          <main
            className="min-w-0 flex-1 p-[clamp(1rem,3vw,2rem)]"
            data-testid="admin-content"
          >
            <SectionContent section={activeSection} user={user} />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
