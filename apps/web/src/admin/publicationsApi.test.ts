import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminFetch } from "./session.js";
import {
  createPublication,
  deletePublication,
  listPublications,
  updatePublication,
  updatePublicationScope,
  updatePublicationStatus,
} from "./publicationsApi.js";

vi.mock("./session.js", () => ({ adminFetch: vi.fn() }));

describe("publicationsApi", () => {
  beforeEach(() => vi.mocked(adminFetch).mockReset());

  it("lists with the optional lifecycle filter", async () => {
    vi.mocked(adminFetch).mockResolvedValue([]);
    await listPublications("DRAFT");
    expect(adminFetch).toHaveBeenCalledWith("/publications/admin?status=DRAFT");
  });

  it("creates and transitions through the admin contract", async () => {
    vi.mocked(adminFetch).mockResolvedValue({});
    const input = {
      slug: "hello",
      title: "Hello",
      excerpt: "",
      content: "",
      imageIds: ["image-1"],
      type: "POST" as const,
    };
    await createPublication(input);
    await updatePublicationStatus("id/one", "PUBLISHED");
    await updatePublicationScope("id/one", "MISSION", ["mission-1"]);
    expect(adminFetch).toHaveBeenNthCalledWith(
      1,
      "/publications/admin",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
    expect(adminFetch).toHaveBeenNthCalledWith(
      2,
      "/publications/admin/id%2Fone/status",
      expect.objectContaining({
        body: JSON.stringify({ status: "PUBLISHED" }),
      }),
    );
    expect(adminFetch).toHaveBeenNthCalledWith(
      3,
      "/publications/admin/id%2Fone/scope",
      expect.objectContaining({
        body: JSON.stringify({ scope: "MISSION", missionIds: ["mission-1"] }),
      }),
    );
  });

  it("keeps publication updates and scope updates on distinct routes", async () => {
    vi.mocked(adminFetch).mockResolvedValue({});
    await updatePublication("id/one", { title: "Updated" });
    await updatePublicationScope("id/one", "GENERAL", []);

    expect(adminFetch).toHaveBeenNthCalledWith(
      1,
      "/publications/admin/id%2Fone",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(adminFetch).toHaveBeenNthCalledWith(
      2,
      "/publications/admin/id%2Fone/scope",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("encodes IDs and uses DELETE", async () => {
    vi.mocked(adminFetch).mockResolvedValue(undefined);
    await deletePublication("id/with spaces");
    expect(adminFetch).toHaveBeenCalledWith(
      "/publications/admin/id%2Fwith%20spaces",
      { method: "DELETE" },
    );
  });
});
