import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicationsService } from "./publications.service.js";
import {
  PublicationScope,
  PublicationStatus,
  PublicationType,
} from "./dto/publication.dto.js";

vi.mock("../file-module/assert-file-category.js", () => ({
  assertFileCategory: vi.fn(),
}));
vi.mock("./sanitizer.js", () => ({
  sanitizePublicationContent: (value: string) =>
    value.replace(/<script.*?>.*?<\/script>/gis, ""),
}));

const base = {
  slug: "hello",
  title: "Hello",
  excerpt: "Excerpt",
  content: "<p>safe</p><script>alert(1)</script>",
  imageIds: ["image"],
  type: PublicationType.POST,
};
function fixture() {
  const row = {
    id: "pub-1",
    ...base,
    status: PublicationStatus.DRAFT,
    scope: PublicationScope.GENERAL,
    publishedAt: null,
    activityDate: null,
    images: [{ fileAssetId: "image", position: 0 }],
    missions: [],
  };
  const publication = {
    findMany: vi.fn().mockResolvedValue([row]),
    findUnique: vi.fn().mockResolvedValue(row),
    create: vi
      .fn()
      .mockImplementation(async ({ data }: { data: Partial<typeof row> }) => ({
        ...row,
        ...data,
      })),
    update: vi
      .fn()
      .mockImplementation(async ({ data }: { data: Partial<typeof row> }) => ({
        ...row,
        ...data,
      })),
    delete: vi.fn().mockResolvedValue(row),
  };
  const mission = { findMany: vi.fn().mockResolvedValue([]) };
  const publicationMission = { deleteMany: vi.fn(), createMany: vi.fn() };
  const publicationImage = { deleteMany: vi.fn(), createMany: vi.fn() };
  const client = { publication, mission, publicationMission } as {
    fileAsset: { findUnique: typeof vi.fn };
    publication: typeof publication;
    mission: typeof mission;
    publicationMission: typeof publicationMission;
    publicationImage: typeof publicationImage;
    $transaction: (callback: (tx: typeof client) => unknown) => unknown;
  };
  client.fileAsset = {
    findUnique: vi.fn().mockResolvedValue({
      id: "image",
      category: "PUBLICATION_FEATURED_IMAGE",
    }),
  };
  client.publicationImage = publicationImage;
  client.$transaction = vi.fn(
    async (callback: (tx: typeof client) => unknown) => callback(client),
  ) as unknown as typeof client.$transaction;
  return { service: new PublicationsService({ client } as never), client, row };
}

describe("PublicationsService", () => {
  beforeEach(() => vi.clearAllMocks());
  it("sanitizes content, defaults to DRAFT, and orders list deterministically", async () => {
    const { service, client } = fixture();
    const created = await service.create(base as never);
    expect(created).toMatchObject({ missionIds: [] });
    expect(created).not.toHaveProperty("missions");
    expect(client.publication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "<p>safe</p>",
          status: "DRAFT",
          publishedAt: null,
        }),
      }),
    );
    await service.findMany();
    expect(client.publication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });
  it("rejects missing activity dates and type changes without confirmation", async () => {
    const { service } = fixture();
    await expect(
      service.create({ ...base, type: PublicationType.OUTING } as never),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update("pub-1", { type: PublicationType.OUTING } as never),
    ).rejects.toThrow("confirmTypeChange");
  });
  it("writes an activity date and ordered images in the same transaction", async () => {
    const { service, client, row } = fixture();
    client.publication.findUnique.mockResolvedValueOnce({
      ...row,
      activityDate: new Date("2026-01-02T00:00:00.000Z"),
      images: [
        { fileAssetId: "image", position: 0 },
        { fileAssetId: "second", position: 1 },
      ],
    } as never);
    const created = await service.create({
      ...base,
      type: PublicationType.OUTING,
      activityDate: "2026-01-02",
      imageIds: ["image", "second"],
    } as never);
    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(client.publication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activityDate: new Date("2026-01-02T00:00:00.000Z"),
        }),
      }),
    );
    expect(client.publicationImage.createMany).toHaveBeenCalledWith({
      data: [
        { publicationId: "pub-1", fileAssetId: "image", position: 0 },
        { publicationId: "pub-1", fileAssetId: "second", position: 1 },
      ],
    });
    expect(created).toMatchObject({
      activityDate: "2026-01-02",
      imageIds: ["image", "second"],
    });
  });
  it("validates scope and ACTIVE mission links", async () => {
    const { service, client, row } = fixture();
    await expect(
      service.updateScope("pub-1", PublicationScope.MISSION, []),
    ).rejects.toThrow("at least one");
    client.mission.findMany.mockResolvedValue([{ id: "m1", status: "ACTIVE" }]);
    client.publication.findUnique
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce({ ...row, missions: [{ missionId: "m1" }] });
    const updated = await service.updateScope(
      "pub-1",
      PublicationScope.MISSION,
      ["m1"],
    );
    expect(client.publicationMission.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ publicationId: "pub-1", missionId: "m1" }],
      }),
    );
    expect(client.publication.update).toHaveBeenCalledWith({
      where: { id: "pub-1" },
      data: { scope: PublicationScope.MISSION },
    });
    expect(updated).toMatchObject({ missionIds: ["m1"] });
    expect(updated).not.toHaveProperty("missions");
  });
  it("updates publication fields, images, and mission links in one transaction", async () => {
    const { service, client, row } = fixture();
    client.mission.findMany.mockResolvedValue([{ id: "m1", status: "ACTIVE" }]);
    client.publication.findUnique
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce({
        ...row,
        title: "Updated",
        missions: [{ missionId: "m1" }],
      });

    const updated = await service.update("pub-1", {
      title: "Updated",
      scope: PublicationScope.MISSION,
      missionIds: ["m1"],
    });

    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(client.publication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pub-1" },
        data: expect.objectContaining({
          title: "Updated",
          scope: PublicationScope.MISSION,
        }),
      }),
    );
    expect(client.publicationMission.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ publicationId: "pub-1", missionId: "m1" }],
      }),
    );
    expect(updated).toMatchObject({
      title: "Updated",
      missionIds: ["m1"],
      imageIds: ["image"],
    });
    expect(updated).not.toHaveProperty("missions");
  });
  it("updates GENERAL scope and clears links in one transaction", async () => {
    const { service, client, row } = fixture();
    const existing = {
      ...row,
      scope: PublicationScope.MISSION,
      missions: [{ missionId: "m1" }],
    };
    client.publication.findUnique
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({
        ...existing,
        scope: PublicationScope.GENERAL,
        missions: [],
      });

    const updated = await service.update("pub-1", {
      scope: PublicationScope.GENERAL,
      missionIds: [],
    });

    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(client.publicationMission.deleteMany).toHaveBeenCalledWith({
      where: { publicationId: "pub-1" },
    });
    expect(client.publication.update).toHaveBeenCalledWith({
      where: { id: "pub-1" },
      data: { scope: PublicationScope.GENERAL },
    });
    expect(updated).toMatchObject({
      scope: PublicationScope.GENERAL,
      missionIds: [],
    });
    expect(updated).not.toHaveProperty("missions");
  });
  it("stamps and clears publishedAt through status transitions", async () => {
    const { service, client } = fixture();
    const published = await service.updateStatus(
      "pub-1",
      PublicationStatus.PUBLISHED,
    );
    expect(client.publication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PUBLISHED",
          publishedAt: expect.any(Date),
        }),
      }),
    );
    expect(published).toMatchObject({ missionIds: [] });
    expect(published).not.toHaveProperty("missions");
    const draft = await service.updateStatus("pub-1", PublicationStatus.DRAFT);
    expect(client.publication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DRAFT", publishedAt: null }),
      }),
    );
    expect(draft).toMatchObject({ missionIds: [] });
    expect(draft).not.toHaveProperty("missions");
  });
  it("maps missing and duplicate records and deletes directly for FK cascade", async () => {
    const { service, client } = fixture();
    client.publication.findUnique.mockResolvedValueOnce(null);
    await expect(service.remove("missing")).rejects.toThrow(NotFoundException);
    client.publication.findUnique.mockResolvedValueOnce({
      id: "pub-1",
      ...base,
      images: [{ fileAssetId: "image", position: 0 }],
      missions: [],
    });
    const error = Object.assign(new Error("duplicate"), { code: "P2002" });
    error.code = "P2002";
    client.publication.create.mockRejectedValueOnce(error);
    await expect(service.create(base as never)).rejects.toThrow(
      ConflictException,
    );
    await service.remove("pub-1");
    expect(client.publication.delete).toHaveBeenCalledWith({
      where: { id: "pub-1" },
    });
    expect(client.publicationMission.deleteMany).not.toHaveBeenCalled();
  });
});
