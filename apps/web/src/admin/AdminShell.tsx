import {
  Files,
  Flag,
  Newspaper,
  LogOut,
  Settings2,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { ResponsiblesPage } from "./ResponsiblesPage.js";
import { MissionsPage } from "./MissionsPage.js";
import { PublicationsPage } from "./PublicationsPage.js";
import type { AdminSection } from "./adminRouting.js";

export type { AdminSection } from "./adminRouting.js";

type AdminNavItem = {
  section: AdminSection;
  label: string;
  icon: LucideIcon;
};

const sections: AdminNavItem[] = [
  {
    section: "landing",
    label: "Configuración de la página de inicio",
    icon: Settings2,
  },
  { section: "responsibles", label: "Responsables", icon: UsersRound },
  { section: "missions", label: "Misiones", icon: Flag },
  { section: "publications", label: "Publicaciones", icon: Newspaper },
];

export interface AdminShellProps {
  user: AuthUser;
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  onLandingDirtyChange?: (dirty: boolean) => void;
  onLogout: () => void;
  logoutError: boolean;
}

function SectionContent({
  section,
  user,
  onLandingDirtyChange,
}: {
  section: AdminSection;
  user: AuthUser;
  onLandingDirtyChange?: (dirty: boolean) => void;
}) {
  if (section === "landing")
    return <LandingSettingsPage onDirtyChange={onLandingDirtyChange} />;
  if (section === "missions") return <MissionsPage />;
  if (section === "publications") return <PublicationsPage />;
  return <ResponsiblesPage currentUserId={user.id} />;
}

export function AdminShell({
  user,
  activeSection,
  onNavigate,
  onLandingDirtyChange,
  onLogout,
  logoutError,
}: AdminShellProps) {
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
              <SidebarGroupLabel>Administración</SidebarGroupLabel>
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
                      tooltip="Archivos (próximamente)"
                    >
                      <Files aria-hidden="true" />
                      <span>Archivos (próximamente)</span>
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
                  tooltip="Cerrar sesión"
                  data-testid="admin-logout"
                  onClick={onLogout}
                >
                  <LogOut aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            {logoutError && (
              <span
                className="px-2 text-sm text-destructive"
                role="alert"
                data-testid="admin-logout-error"
              >
                No se pudo cerrar sesión. Intenta de nuevo.
              </span>
            )}
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header
            className="flex h-12 shrink-0 items-center border-b border-border px-4"
            data-testid="admin-shell-header"
          >
            <SidebarTrigger
              className="-ml-1"
              aria-label="Alternar barra lateral de administración"
            />
          </header>

          <main
            className="min-w-0 flex-1 p-[clamp(1rem,3vw,2rem)]"
            data-testid="admin-content"
          >
            <SectionContent
              section={activeSection}
              user={user}
              onLandingDirtyChange={onLandingDirtyChange}
            />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
