import { resolveApiBaseUrl, type ApiBaseUrl } from "./env.js";

export type MissionListItem = {
  id: string;
  slug: string;
  title: string;
  heroImageUrl: string;
  profileImageUrl: string | null;
  heroPhrase: string;
  status: "ACTIVE";
};
export type MissionsList = {
  items: MissionListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
export type MissionPublication = {
  slug: string;
  title: string;
  excerpt: string;
  type: string;
  publishedAt: string;
  featuredImageUrl: string | null;
};
export type MissionPublicDetail = MissionListItem & {
  finished: boolean;
  publications: MissionPublication[];
  gallery: { imageUrl: string }[];
};
export class MissionsFetchError extends Error {
  constructor(
    readonly reason: "network" | "http_error" | "invalid_payload" | "not_found",
  ) {
    super(`Missions request failed: ${reason}`);
    this.name = "MissionsFetchError";
  }
}
export function validateMissionsListPayload(raw: unknown): MissionsList {
  if (!raw || typeof raw !== "object")
    throw new MissionsFetchError("invalid_payload");
  const value = raw as Record<string, unknown>;
  if (
    !Array.isArray(value.items) ||
    typeof value.page !== "number" ||
    typeof value.limit !== "number" ||
    typeof value.total !== "number" ||
    typeof value.hasMore !== "boolean"
  )
    throw new MissionsFetchError("invalid_payload");
  return value as MissionsList;
}
export function validateMissionPublicPayload(
  raw: unknown,
): MissionPublicDetail {
  if (!raw || typeof raw !== "object")
    throw new MissionsFetchError("invalid_payload");
  const value = raw as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.slug !== "string" ||
    typeof value.title !== "string" ||
    typeof value.heroImageUrl !== "string" ||
    (value.profileImageUrl !== null &&
      typeof value.profileImageUrl !== "string") ||
    typeof value.heroPhrase !== "string" ||
    !["ACTIVE", "ARCHIVED"].includes(value.status as string) ||
    typeof value.finished !== "boolean" ||
    value.finished !== (value.status === "ARCHIVED") ||
    !Array.isArray(value.publications) ||
    !Array.isArray(value.gallery) ||
    value.publications.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof (item as Record<string, unknown>).slug !== "string" ||
        typeof (item as Record<string, unknown>).title !== "string" ||
        typeof (item as Record<string, unknown>).excerpt !== "string" ||
        typeof (item as Record<string, unknown>).type !== "string" ||
        typeof (item as Record<string, unknown>).publishedAt !== "string" ||
        ((item as Record<string, unknown>).featuredImageUrl !== null &&
          typeof (item as Record<string, unknown>).featuredImageUrl !==
            "string"),
    ) ||
    value.gallery.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof (item as Record<string, unknown>).imageUrl !== "string",
    )
  )
    throw new MissionsFetchError("invalid_payload");
  return value as MissionPublicDetail;
}
export async function fetchMissionsList(
  url: URL,
  options: { apiBaseUrl?: ApiBaseUrl; fetchImpl?: typeof fetch } = {},
): Promise<MissionsList> {
  const base = new URL(options.apiBaseUrl ?? resolveApiBaseUrl());
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  const endpoint = new URL("missions/public", base);
  endpoint.search = url.search;
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint);
    if (!response.ok) throw new MissionsFetchError("http_error");
    return validateMissionsListPayload(await response.json());
  } catch (error) {
    if (error instanceof MissionsFetchError) throw error;
    throw new MissionsFetchError("network");
  }
}
export async function fetchMissionBySlug(
  slug: string,
  options: { apiBaseUrl?: ApiBaseUrl; fetchImpl?: typeof fetch } = {},
): Promise<MissionPublicDetail> {
  const base = new URL(options.apiBaseUrl ?? resolveApiBaseUrl());
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  const endpoint = new URL(`missions/public/${encodeURIComponent(slug)}`, base);
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint);
    if (response.status === 404) throw new MissionsFetchError("not_found");
    if (!response.ok) throw new MissionsFetchError("http_error");
    return validateMissionPublicPayload(await response.json());
  } catch (error) {
    if (error instanceof MissionsFetchError) throw error;
    throw new MissionsFetchError("network");
  }
}
