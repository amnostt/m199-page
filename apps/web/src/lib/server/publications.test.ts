import { describe, expect, it } from "vitest";
import {
  PublicationsFetchError,
  fetchPublicationsList,
  fetchPublicationBySlug,
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
          }),
        );
      },
    });
    expect(result.type).toBe("POST");
  });
});
