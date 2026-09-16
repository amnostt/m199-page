import { resolveApiBaseUrl, type ApiBaseUrl } from "./env.js";

export type PublicationListItem = {
  slug: string;
  title: string;
  excerpt: string;
  type: string;
  publishedAt: string;
  featuredImageUrl: string | null;
  activityDate?: string;
};
export type PublicationsList = {
  items: PublicationListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
export type PublicationPublicDetail = PublicationListItem & {
  content: string;
  missions: { slug: string; title: string; status: "ACTIVE" | "ARCHIVED" }[];
  imageUrls: string[];
};
export class PublicationsFetchError extends Error {
  constructor(
    readonly reason: "network" | "http_error" | "invalid_payload" | "not_found",
  ) {
    super(`Publications request failed: ${reason}`);
    this.name = "PublicationsFetchError";
  }
}

export function validatePublicationsListPayload(
  raw: unknown,
): PublicationsList {
  if (!raw || typeof raw !== "object")
    throw new PublicationsFetchError("invalid_payload");
  const value = raw as Record<string, unknown>;
  if (
    !Array.isArray(value.items) ||
    !["number"].includes(typeof value.page) ||
    typeof value.limit !== "number" ||
    typeof value.total !== "number" ||
    typeof value.hasMore !== "boolean"
  )
    throw new PublicationsFetchError("invalid_payload");
  if (value.items.some((item) => !isPublicListItem(item)))
    throw new PublicationsFetchError("invalid_payload");
  return value as PublicationsList;
}
export async function fetchPublicationsList(
  url: URL,
  options: { apiBaseUrl?: ApiBaseUrl; fetchImpl?: typeof fetch } = {},
): Promise<PublicationsList> {
  const base = new URL(options.apiBaseUrl ?? resolveApiBaseUrl());
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  const endpoint = new URL("publications/public", base);
  endpoint.search = url.search;
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint);
    if (!response.ok) throw new PublicationsFetchError("http_error");
    return validatePublicationsListPayload(await response.json());
  } catch (error) {
    if (error instanceof PublicationsFetchError) throw error;
    throw new PublicationsFetchError("network");
  }
}

export function validatePublicationPublicPayload(
  raw: unknown,
): PublicationPublicDetail {
  if (!raw || typeof raw !== "object")
    throw new PublicationsFetchError("invalid_payload");
  const value = raw as Record<string, unknown>;
  if (
    typeof value.slug !== "string" ||
    typeof value.title !== "string" ||
    typeof value.excerpt !== "string" ||
    typeof value.content !== "string" ||
    typeof value.type !== "string" ||
    typeof value.publishedAt !== "string" ||
    !(
      typeof value.featuredImageUrl === "string" ||
      value.featuredImageUrl === null
    ) ||
    (value.imageUrls !== undefined &&
      (!Array.isArray(value.imageUrls) ||
        value.imageUrls.some((image) => typeof image !== "string"))) ||
    !Array.isArray(value.missions) ||
    value.missions.some(
      (mission) =>
        !mission ||
        typeof mission !== "object" ||
        typeof (mission as Record<string, unknown>).slug !== "string" ||
        typeof (mission as Record<string, unknown>).title !== "string" ||
        !["ACTIVE", "ARCHIVED"].includes(
          (mission as Record<string, unknown>).status as string,
        ),
    )
  )
    throw new PublicationsFetchError("invalid_payload");
  if (!isPublicListItem(value))
    throw new PublicationsFetchError("invalid_payload");
  const imageUrls = (raw as Record<string, unknown>).imageUrls;
  return {
    ...value,
    imageUrls: Array.isArray(imageUrls)
      ? imageUrls.filter((image): image is string => typeof image === "string")
      : value.featuredImageUrl
        ? [value.featuredImageUrl]
        : [],
  } as PublicationPublicDetail;
}

function isPublicListItem(value: unknown): value is PublicationListItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.slug === "string" &&
    typeof item.title === "string" &&
    typeof item.excerpt === "string" &&
    typeof item.type === "string" &&
    typeof item.publishedAt === "string" &&
    (item.featuredImageUrl === null ||
      typeof item.featuredImageUrl === "string") &&
    (item.activityDate === undefined || typeof item.activityDate === "string")
  );
}

export async function fetchPublicationBySlug(
  slug: string,
  options: { apiBaseUrl?: ApiBaseUrl; fetchImpl?: typeof fetch } = {},
): Promise<PublicationPublicDetail> {
  const base = new URL(options.apiBaseUrl ?? resolveApiBaseUrl());
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  const endpoint = new URL(
    `publications/public/${encodeURIComponent(slug)}`,
    base,
  );
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint);
    if (response.status === 404) throw new PublicationsFetchError("not_found");
    if (!response.ok) throw new PublicationsFetchError("http_error");
    return validatePublicationPublicPayload(await response.json());
  } catch (error) {
    if (error instanceof PublicationsFetchError) throw error;
    throw new PublicationsFetchError("network");
  }
}
