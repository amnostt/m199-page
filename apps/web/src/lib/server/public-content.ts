import { resolveApiBaseUrl, type ApiBaseUrl } from "./env.js";

export class PublicContentFetchError extends Error {
  constructor(readonly status: number) {
    super(`Public content request failed with status ${String(status)}`);
    this.name = "PublicContentFetchError";
  }
}

function resolveEndpoint(apiBaseUrl: ApiBaseUrl, path: string): URL {
  const base = new URL(apiBaseUrl);
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  return new URL(path.replace(/^\//, ""), base);
}

export async function fetchPublicContent<T>(path: string): Promise<T> {
  const response = await fetch(resolveEndpoint(resolveApiBaseUrl(), path));
  if (!response.ok) throw new PublicContentFetchError(response.status);
  return (await response.json()) as T;
}

export function formatPublicDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
