import { describe, expect, it } from "vitest";
import {
  MissionsFetchError,
  fetchMissionBySlug,
  validateMissionPublicPayload,
} from "./missions.js";

const activeDetail = {
  id: "m-1",
  slug: "one",
  title: "One",
  heroImageUrl: "/files/f-1",
  heroPhrase: "Phrase",
  status: "ACTIVE",
  finished: false,
  publications: [],
  gallery: [],
};

describe("missions fetch helper", () => {
  it("classifies a 404 from the API as not_found", async () => {
    await expect(
      fetchMissionBySlug("missing", {
        apiBaseUrl: "http://api.test" as never,
        fetchImpl: async () => new Response(null, { status: 404 }),
      }),
    ).rejects.toMatchObject({ reason: "not_found" });
    await expect(
      fetchMissionBySlug("missing", {
        apiBaseUrl: "http://api.test" as never,
        fetchImpl: async () => new Response(null, { status: 404 }),
      }),
    ).rejects.toBeInstanceOf(MissionsFetchError);
  });

  it("classifies an upstream HTTP failure as http_error", async () => {
    await expect(
      fetchMissionBySlug("one", {
        apiBaseUrl: "http://api.test" as never,
        fetchImpl: async () => new Response("down", { status: 503 }),
      }),
    ).rejects.toMatchObject({ reason: "http_error" });
  });

  it("classifies a thrown fetch error as network", async () => {
    await expect(
      fetchMissionBySlug("one", {
        apiBaseUrl: "http://api.test" as never,
        fetchImpl: async () => {
          throw new TypeError("network failure");
        },
      }),
    ).rejects.toMatchObject({ reason: "network" });
  });

  it("classifies a malformed JSON payload as network (parser failure)", async () => {
    await expect(
      fetchMissionBySlug("one", {
        apiBaseUrl: "http://api.test" as never,
        fetchImpl: async () => new Response("not json", { status: 200 }),
      }),
    ).rejects.toMatchObject({ reason: "network" });
  });

  it("classifies a schema-invalid 200 payload as invalid_payload", async () => {
    await expect(
      fetchMissionBySlug("one", {
        apiBaseUrl: "http://api.test" as never,
        fetchImpl: async () =>
          new Response(JSON.stringify({ id: "m-1" }), {
            status: 200,
          }),
      }),
    ).rejects.toMatchObject({ reason: "invalid_payload" });
  });

  it("URL-encodes the slug and resolves an ACTIVE detail payload", async () => {
    const result = await fetchMissionBySlug("safe slug", {
      apiBaseUrl: "http://api.test" as never,
      fetchImpl: async (input) => {
        expect(String(input)).toContain("missions/public/safe%20slug");
        return new Response(JSON.stringify(activeDetail));
      },
    });
    expect(result).toEqual(activeDetail);
  });

  it("accepts coherent ACTIVE and ARCHIVED finished markers", () => {
    expect(validateMissionPublicPayload(activeDetail).finished).toBe(false);
    expect(
      validateMissionPublicPayload({
        ...activeDetail,
        status: "ARCHIVED",
        finished: true,
      }).status,
    ).toBe("ARCHIVED");
    expect(() =>
      validateMissionPublicPayload({
        ...activeDetail,
        status: "ARCHIVED",
        finished: false,
      }),
    ).toThrow(MissionsFetchError);
  });

  it("rejects payloads missing required fields through the validator", () => {
    expect(() => validateMissionPublicPayload(null)).toThrow(
      MissionsFetchError,
    );
    expect(() =>
      validateMissionPublicPayload({ id: "m-1", slug: "one" }),
    ).toThrow(MissionsFetchError);
  });
});
