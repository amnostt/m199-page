import { describe, expect, it, vi } from "vitest";

import { assertFileCategory } from "./assert-file-category.js";

function makeClient(asset: { id: string; category: string } | null) {
  return {
    fileAsset: {
      findUnique: vi.fn().mockResolvedValue(asset),
    },
  };
}

describe("assertFileCategory", () => {
  it("rejects a missing file asset", async () => {
    const client = makeClient(null);

    await expect(
      assertFileCategory(client, "missing-asset", "LANDING_HERO"),
    ).rejects.toThrow('FileAsset with id "missing-asset" not found');
    expect(client.fileAsset.findUnique).toHaveBeenCalledWith({
      where: { id: "missing-asset" },
    });
  });

  it("rejects a file asset with the wrong category", async () => {
    const client = makeClient({
      id: "publication-asset",
      category: "PUBLICATION_FEATURED_IMAGE",
    });

    await expect(
      assertFileCategory(client, "publication-asset", "LANDING_HERO"),
    ).rejects.toThrow(
      'FileAsset "publication-asset" must have category LANDING_HERO',
    );
  });

  it("accepts a file asset with the matching category", async () => {
    const client = makeClient({ id: "hero-asset", category: "LANDING_HERO" });

    await expect(
      assertFileCategory(client, "hero-asset", "LANDING_HERO"),
    ).resolves.toBeUndefined();
  });
});
