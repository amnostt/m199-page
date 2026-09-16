import { resolveApiBaseUrl, type ApiBaseUrl } from "./env.js";

export type PublicPublicationKind = "POST" | "OUTING" | "EVENT" | string;
export type PublicationTimelineLabel =
  "Próximamente" | "Es hoy" | "Revive lo que hicimos";

const PUBLIC_TIME_ZONE = "America/Lima";
const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVITY_TYPES = new Set(["OUTING", "EVENT"]);

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

export function formatPublicDate(value: string): string {
  const date = CIVIL_DATE_PATTERN.test(value)
    ? new Date(`${value}T12:00:00-05:00`)
    : new Date(value);
  return date.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: PUBLIC_TIME_ZONE,
  });
}

function toLimaCivilDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PUBLIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeCivilDate(value: string | undefined): string {
  return value && CIVIL_DATE_PATTERN.test(value) ? value : "";
}

/**
 * Classify a publication using Lima's civil calendar, not the server's local
 * timezone. `now` is injectable so SSR and tests have deterministic output.
 */
export function getPublicationTimelineLabel(
  publication: {
    type: PublicPublicationKind;
    activityDate?: string | null;
    publishedAt?: string | null;
  },
  now: Date = new Date(),
): PublicationTimelineLabel | null {
  if (!ACTIVITY_TYPES.has(publication.type)) return "Revive lo que hicimos";
  const activityDate = normalizeCivilDate(
    publication.activityDate ?? undefined,
  );
  if (!activityDate) return null;
  const today = toLimaCivilDate(now);
  if (activityDate > today) return "Próximamente";
  if (activityDate === today) return "Es hoy";
  return "Revive lo que hicimos";
}

export function getPublicationCta(type: PublicPublicationKind): string {
  if (type === "EVENT") return "Ver evento";
  if (type === "OUTING") return "Ver salida";
  return "Ver publicación";
}

export function getPublicationDate(publication: {
  type: PublicPublicationKind;
  activityDate?: string | null;
  publishedAt: string;
}): string {
  return ACTIVITY_TYPES.has(publication.type) && publication.activityDate
    ? publication.activityDate
    : publication.publishedAt;
}
