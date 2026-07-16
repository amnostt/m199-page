import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminFetch } from "./session.js";
import { createVerse, deleteVerse, listVerses } from "./versesApi.js";

vi.mock("./session.js", () => ({ adminFetch: vi.fn() }));

describe("versesApi", () => {
  beforeEach(() => vi.mocked(adminFetch).mockReset());

  it("lists verses through the authenticated transport", async () => {
    vi.mocked(adminFetch).mockResolvedValue([]);
    await listVerses();
    expect(adminFetch).toHaveBeenCalledWith("/verses/admin");
  });

  it("creates with the trimmed approved fields", async () => {
    vi.mocked(adminFetch).mockResolvedValue({});
    await createVerse({ text: "A verse", reference: " John 3:16 " });
    expect(adminFetch).toHaveBeenCalledWith("/verses/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "A verse", reference: " John 3:16 " }),
    });
  });

  it("URL-encodes the ID for a bodyless delete", async () => {
    vi.mocked(adminFetch).mockResolvedValue(undefined);
    await deleteVerse("id/with spaces");
    expect(adminFetch).toHaveBeenCalledWith("/verses/admin/id%2Fwith%20spaces", {
      method: "DELETE",
    });
  });
});
