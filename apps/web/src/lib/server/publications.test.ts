import { describe, expect, it } from "vitest";
import {
  PublicationsFetchError,
  fetchPublicationBySlug,
  fetchPublicationsList,
  validatePublicationPublicPayload,
  validatePublicationsListPayload,
} from "./publications.js";

describe("publications fetch helper", () => {
  it("classifies HTTP failures", async () => {
    await expect(
      fetchPublicationsList(new URL("http://localhost/publicaciones"), {
        apiBaseUrl: "http://api.test" as never,
        fetchImpl: async () => new Response(null, { status: 503 }),
      }),
    ).rejects.toMatchObject({ reason: "http_error" });
    expect(PublicationsFetchError).toBeDefined();
  });
  it("fetches and validates a slug detail", async () => {
    const result = await fetchPublicationBySlug("safe slug", {
      apiBaseUrl: "http://api.test" as never,
      fetchImpl: async (input) => {
        expect(String(input)).toContain("publications/public/safe%20slug");
        return new Response(
          JSON.stringify({
            slug: "safe slug",
            title: "Title",
            excerpt: "Excerpt",
            content: "<p>safe</p>",
            type: "POST",
            publishedAt: "2026-01-01",
            featuredImageUrl: null,
            missions: [],
          }),
        );
      },
    });
    expect(result.type).toBe("POST");
  });
});

describe("publications validator contracts", () => {
  const baseDetail = {
    slug: "demo",
    title: "Demo",
    excerpt: "Excerpt",
    content: "<p>safe</p>",
    type: "POST",
    publishedAt: "2026-01-01",
    featuredImageUrl: null,
    missions: [
      { slug: "alpha", title: "Alpha", status: "ACTIVE" },
      { slug: "beta", title: "Beta", status: "ARCHIVED" },
    ],
  } as const;

  it("accepts the detail payload with ACTIVE+ARCHIVED mission links in the closed shape", () => {
    const result = validatePublicationPublicPayload(baseDetail);
    expect(result.missions).toEqual([
      { slug: "alpha", title: "Alpha", status: "ACTIVE" },
      { slug: "beta", title: "Beta", status: "ARCHIVED" },
    ]);
    expect(
      result.missions.map((mission) => Object.keys(mission).sort()),
    ).toEqual(result.missions.map(() => ["slug", "status", "title"]));
    expect(
      result.missions.every(
        (mission) =>
          typeof mission.slug === "string" &&
          typeof mission.title === "string" &&
          (mission.status === "ACTIVE" || mission.status === "ARCHIVED"),
      ),
    ).toBe(true);
  });

  it.each([
    ["missing array", { ...baseDetail, missions: undefined }],
    ["wrong type", { ...baseDetail, missions: "nope" }],
    [
      "invalid status",
      {
        ...baseDetail,
        missions: [{ slug: "alpha", title: "Alpha", status: "PUBLISHED" }],
      },
    ],
    [
      "missing slug",
      {
        ...baseDetail,
        missions: [{ title: "Alpha", status: "ACTIVE" }],
      },
    ],
    [
      "missing title",
      {
        ...baseDetail,
        missions: [{ slug: "alpha", status: "ACTIVE" }],
      },
    ],
    [
      "non-object entry",
      {
        ...baseDetail,
        missions: ["alpha"],
      },
    ],
  ])("rejects %s on the detail validator", (_label, payload) => {
    expect(() => validatePublicationPublicPayload(payload)).toThrow(
      PublicationsFetchError,
    );
  });

  it("keeps the list validator unchanged: missions are not part of the public list payload", () => {
    const listPayload = {
      items: [
        {
          slug: "one",
          title: "One",
          excerpt: "",
          type: "POST",
          publishedAt: "2026-01-01T00:00:00.000Z",
          featuredImageUrl: null,
        },
      ],
      page: 1,
      limit: 10,
      total: 1,
      hasMore: false,
    };
    expect(() => validatePublicationsListPayload(listPayload)).not.toThrow();
    expect(
      validatePublicationsListPayload({
        ...listPayload,
        items: [{ ...listPayload.items[0]!, missions: [] }],
      }),
    ).toEqual({
      ...listPayload,
      items: [{ ...listPayload.items[0]!, missions: [] }],
    });
  });
});
