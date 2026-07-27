export type DocumentTheme = "public" | "admin";

export function resolveDocumentTheme(pathname: string): DocumentTheme {
  return pathname === "/admin" || pathname.startsWith("/admin/")
    ? "admin"
    : "public";
}
