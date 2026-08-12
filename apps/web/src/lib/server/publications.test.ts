import { describe, expect, it } from "vitest";
import {
  PublicationsFetchError,
  fetchPublicationsList,
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
});
