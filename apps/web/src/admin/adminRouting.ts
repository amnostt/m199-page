export type AdminSection =
  "landing" | "responsibles" | "missions" | "publications";

const ADMIN_SECTION_PATHS: Record<AdminSection, string> = {
  landing: "/admin",
  responsibles: "/admin/responsables",
  missions: "/admin/misiones",
  publications: "/admin/publicaciones",
};

function normalizePathname(pathname: string): string {
  if (pathname.length > 1) return pathname.replace(/\/+$/, "");
  return pathname;
}

export function getAdminSection(pathname: string): AdminSection {
  const normalizedPathname = normalizePathname(pathname);

  for (const [section, path] of Object.entries(ADMIN_SECTION_PATHS)) {
    if (normalizedPathname === path) return section as AdminSection;
  }

  return "landing";
}

export function isKnownAdminPath(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);
  return Object.values(ADMIN_SECTION_PATHS).includes(normalizedPathname);
}

export function getAdminPath(section: AdminSection): string {
  return ADMIN_SECTION_PATHS[section];
}
