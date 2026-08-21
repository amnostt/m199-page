import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DbService } from "../db/db.service.js";
import { MissionsService, type MissionRow } from "./missions.service.js";

const active: MissionRow = {
  id: "m-1",
  slug: "one",
  title: "One",
  heroImageId: "f-1",
  profileImageId: null,
  heroPhrase: "Phrase",
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const archived = {
  ...active,
  id: "m-2",
  slug: "two",
  status: "ARCHIVED" as const,
};

function fixture(rows: MissionRow[] = [active, archived]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const count = vi.fn().mockResolvedValue(rows.length);
  const findUnique = vi.fn().mockResolvedValue(active);
  const create = vi.fn().mockResolvedValue(active);
  const update = vi.fn().mockResolvedValue(active);
  const fileFindUnique = vi
    .fn()
    .mockResolvedValue({ id: "f-1", category: "MISSION_HERO" });
  return {
    client: {
      mission: { findMany, findUnique, create, update, count },
      fileAsset: { findUnique: fileFindUnique },
    },
    findMany,
    count,
    findUnique,
    create,
    update,
    fileFindUnique,
  };
}

async function build(db: ReturnType<typeof fixture>) {
  const module = await Test.createTestingModule({
    providers: [MissionsService, { provide: DbService, useValue: db }],
  }).compile();
  return module.get(MissionsService);
}

describe("MissionsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters each list by status and orders newest first with id tie-breaker", async () => {
    const db = fixture();
    const service = await build(db);
    await service.findByStatus("ACTIVE");
    expect(db.findMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  });

  it("returns only archived missions in admin order", async () => {
    const db = fixture();
    db.findMany.mockImplementation(async ({ where }) =>
      [active, archived].filter((mission) => mission.status === where.status),
    );
    const service = await build(db);

    await expect(service.findByStatus("ARCHIVED")).resolves.toEqual([archived]);
  });

  it("creates directly as ACTIVE after validating MISSION_HERO", async () => {
    const db = fixture();
    const service = await build(db);
    await service.create({
      title: "One",
      slug: "one",
      heroImageId: "f-1",
      heroPhrase: "Phrase",
    });
    expect(db.fileFindUnique).toHaveBeenCalledWith({ where: { id: "f-1" } });
    expect(db.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "ACTIVE" }),
    });
  });

  it("validates an optional profile image as OTHER", async () => {
    const db = fixture();
    db.fileFindUnique
      .mockResolvedValueOnce({ id: "f-1", category: "MISSION_HERO" })
      .mockResolvedValueOnce({ id: "p-1", category: "OTHER" });
    const service = await build(db);

    await service.create({
      title: "One",
      slug: "one",
      heroImageId: "f-1",
      profileImageId: "p-1",
      heroPhrase: "Phrase",
    });

    expect(db.fileFindUnique).toHaveBeenNthCalledWith(2, {
      where: { id: "p-1" },
    });
    expect(db.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ profileImageId: "p-1" }),
    });
  });

  it("rejects a profile image that is not an OTHER asset", async () => {
    const db = fixture();
    db.fileFindUnique
      .mockResolvedValueOnce({ id: "f-1", category: "MISSION_HERO" })
      .mockResolvedValueOnce({ id: "p-1", category: "MISSION_HERO" });
    const service = await build(db);

    await expect(
      service.create({
        title: "One",
        slug: "one",
        heroImageId: "f-1",
        profileImageId: "p-1",
        heroPhrase: "Phrase",
      }),
    ).rejects.toThrow("must have category OTHER");
    expect(db.create).not.toHaveBeenCalled();
  });

  it("allows an update to remove the optional profile image", async () => {
    const db = fixture();
    const service = await build(db);

    await service.update("m-1", { profileImageId: null });

    expect(db.update).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: expect.objectContaining({ profileImageId: null }),
    });
  });

  it("rejects a create whose file is not MISSION_HERO", async () => {
    const db = fixture();
    db.fileFindUnique.mockResolvedValue({
      id: "f-1",
      category: "LANDING_HERO",
    });
    const service = await build(db);

    await expect(
      service.create({
        title: "One",
        slug: "one",
        heroImageId: "f-1",
        heroPhrase: "Phrase",
      }),
    ).rejects.toThrow("must have category MISSION_HERO");
    expect(db.create).not.toHaveBeenCalled();
  });

  it("translates duplicate slugs to conflict", async () => {
    const db = fixture();
    db.create.mockRejectedValue({ code: "P2002" });
    const service = await build(db);
    await expect(
      service.create({
        title: "Two",
        slug: "two",
        heroImageId: "f-1",
        heroPhrase: "Phrase",
      }),
    ).rejects.toThrow('Slug "two" already exists');
  });

  it("validates merged update fields and returns 404 for missing ids", async () => {
    const db = fixture();
    const service = await build(db);
    await service.update("m-1", { title: "Changed" });
    expect(db.update).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: expect.objectContaining({
        slug: "one",
        heroImageId: "f-1",
        heroPhrase: "Phrase",
      }),
    });
    db.findUnique.mockResolvedValueOnce(null);
    await expect(service.update("missing", {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("allows only real archive/reactivate transitions", async () => {
    const db = fixture();
    const service = await build(db);
    await expect(service.updateStatus("m-1", "ARCHIVED")).resolves.toBe(active);
    await expect(service.updateStatus("m-1", "ACTIVE")).rejects.toBeInstanceOf(
      ConflictException,
    );
    db.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.updateStatus("missing", "ARCHIVED"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps public summaries to an explicit allowlist and file URL", async () => {
    const db = fixture();
    const service = await build(db);
    const result = await service.findPublicByStatus("ACTIVE");
    expect(result[0]).toEqual({
      id: "m-1",
      slug: "one",
      title: "One",
      heroImageUrl: "/files/f-1",
      profileImageUrl: null,
      heroPhrase: "Phrase",
      status: "ACTIVE",
    });
    expect(result[0]).not.toHaveProperty("heroImageId");
  });

  it("returns only archived public summaries in archived-list order", async () => {
    const db = fixture();
    db.findMany.mockImplementation(async ({ where }) =>
      [active, archived].filter((mission) => mission.status === where.status),
    );
    const service = await build(db);

    await expect(service.findPublicByStatus("ARCHIVED")).resolves.toEqual([
      expect.objectContaining({ id: "m-2", status: "ARCHIVED" }),
    ]);
  });

  it("returns a paginated active-only closed projection", async () => {
    const db = fixture([active]);
    db.findMany.mockResolvedValue([active]);
    const service = await build(db);
    db.count.mockResolvedValue(3);
    await expect(
      service.findManyPublic({ page: 2, limit: 1 }),
    ).resolves.toEqual({
      items: [expect.objectContaining({ id: "m-1", status: "ACTIVE" })],
      page: 2,
      limit: 1,
      total: 3,
      hasMore: true,
    });
    expect(db.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE" },
        skip: 1,
        take: 2,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  it("returns ACTIVE and ARCHIVED mission details with a closed projection", async () => {
    const db = fixture();
    const service = await build(db);
    await expect(service.findOnePublicBySlug("one")).resolves.toEqual(
      expect.objectContaining({ id: "m-1", status: "ACTIVE", finished: false }),
    );
    expect(db.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "one" },
      }),
    );
    db.findUnique.mockResolvedValueOnce(archived);
    await expect(service.findOnePublicBySlug("two")).resolves.toEqual(
      expect.objectContaining({
        id: "m-2",
        status: "ARCHIVED",
        finished: true,
      }),
    );
  });

  it("404s missing public details", async () => {
    const db = fixture();
    db.findUnique.mockResolvedValue(null);
    const service = await build(db);
    await expect(service.findOnePublicBySlug("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
