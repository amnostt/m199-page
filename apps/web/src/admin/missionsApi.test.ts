import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminFetch } from "./session.js";
import {
  createMission,
  listActiveMissions,
  listArchivedMissions,
  updateMission,
  updateMissionStatus,
} from "./missionsApi.js";

vi.mock("./session.js", () => ({ adminFetch: vi.fn() }));

describe("missionsApi", () => {
  beforeEach(() => vi.mocked(adminFetch).mockReset());

  it("lists active and archived missions through adminFetch", async () => {
    vi.mocked(adminFetch).mockResolvedValue([]);
    await listActiveMissions();
    await listArchivedMissions();
    expect(adminFetch).toHaveBeenNthCalledWith(1, "/missions/admin/active");
    expect(adminFetch).toHaveBeenNthCalledWith(2, "/missions/admin/archived");
  });

  it("creates with the mission contract", async () => {
    vi.mocked(adminFetch).mockResolvedValue({});
    const input = {
      title: "Mission",
      slug: "mission",
      heroImageId: "file-1",
      heroPhrase: "Phrase",
    };
    await createMission(input);
    expect(adminFetch).toHaveBeenCalledWith("/missions/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("encodes IDs for updates and status changes", async () => {
    vi.mocked(adminFetch).mockResolvedValue({});
    await updateMission("id/with spaces", { title: "Updated" });
    await updateMissionStatus("id/with spaces", "ARCHIVED");
    expect(adminFetch).toHaveBeenNthCalledWith(
      1,
      "/missions/admin/id%2Fwith%20spaces",
      expect.objectContaining({ body: JSON.stringify({ title: "Updated" }) }),
    );
    expect(adminFetch).toHaveBeenNthCalledWith(
      2,
      "/missions/admin/id%2Fwith%20spaces/status",
      expect.objectContaining({ body: JSON.stringify({ status: "ARCHIVED" }) }),
    );
  });
});
