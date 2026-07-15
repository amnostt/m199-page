import { describe, expect, it, vi, beforeEach } from "vitest";
import { adminFetch } from "./session.js";
import {
  createResponsible,
  listResponsibles,
  updateResponsibleStatus,
} from "./responsiblesApi.js";

vi.mock("./session.js", () => ({ adminFetch: vi.fn() }));

describe("responsiblesApi", () => {
  beforeEach(() => vi.mocked(adminFetch).mockReset());

  it("lists responsibles through the authenticated transport", async () => {
    vi.mocked(adminFetch).mockResolvedValue([]);
    await listResponsibles();
    expect(adminFetch).toHaveBeenCalledWith("/responsibles");
  });

  it("creates with only the approved fields", async () => {
    vi.mocked(adminFetch).mockResolvedValue({});
    await createResponsible({
      email: "a@example.com",
      displayName: "A",
      password: "password",
    });
    expect(adminFetch).toHaveBeenCalledWith("/responsibles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@example.com",
        displayName: "A",
        password: "password",
      }),
    });
  });

  it("encodes IDs and sends only status for PATCH", async () => {
    vi.mocked(adminFetch).mockResolvedValue({});
    await updateResponsibleStatus("id/with spaces", "INACTIVE");
    expect(adminFetch).toHaveBeenCalledWith(
      "/responsibles/id%2Fwith%20spaces",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INACTIVE" }),
      },
    );
  });
});
