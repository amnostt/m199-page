import "reflect-metadata";
import { ConfigModule } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DbModule } from "../db/db.module.js";
import { DbService } from "../db/db.service.js";
import { MissionsModule } from "./missions.module.js";
import { MissionsService } from "./missions.service.js";

const enabled = process.env["RUN_POSTGRES_INTEGRATION"] === "1";
const integration = enabled ? describe : describe.skip;

integration("public missions PostgreSQL boundary", () => {
  let module: TestingModule;
  let service: MissionsService;
  let db: DbService;

  beforeAll(async () => {
    if (!process.env["DATABASE_URL"] || !process.env["JWT_SECRET"])
      throw new Error("DATABASE_URL and JWT_SECRET are required");
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        DbModule,
        MissionsModule,
      ],
    }).compile();
    await module.init();
    service = module.get(MissionsService);
    db = module.get(DbService);
  });

  afterAll(async () => {
    await module?.close();
    await db?.client.$disconnect().catch(() => undefined);
  });

  it("returns ACTIVE missions in stable pages with a closed public shape", async () => {
    const first = await service.findManyPublic({ page: 1, limit: 2 });
    const second = await service.findManyPublic({ page: 2, limit: 2 });
    const client = db.client as unknown as {
      mission: {
        findMany(
          args: unknown,
        ): Promise<Array<{ id: string; status: string; createdAt: Date }>>;
      };
    };
    const expected = await client.mission.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, status: true, createdAt: true },
    });
    const actual = [...first.items, ...second.items];

    expect(actual.map(({ id }) => id)).toEqual(
      expected.slice(0, 4).map(({ id }) => id),
    );
    expect(actual.every(({ status }) => status === "ACTIVE")).toBe(true);
    expect(first.hasMore).toBe(first.total > 2);
    expect(
      actual.every(
        (item) =>
          !("heroImageId" in item) &&
          !("createdAt" in item) &&
          !("updatedAt" in item),
      ),
    ).toBe(true);
    expect(Object.keys(first.items[0] ?? {}).sort()).toEqual([
      "heroImageUrl",
      "heroPhrase",
      "id",
      "profileImageUrl",
      "slug",
      "status",
      "title",
    ]);
  });

  it("returns the exact closed projection for an ACTIVE public detail", async () => {
    const client = db.client as unknown as {
      mission: {
        findFirst(args: {
          where: { status: string };
          select: { slug: true };
        }): Promise<{ slug: string } | null>;
      };
    };
    const active = await client.mission.findFirst({
      where: { status: "ACTIVE" },
      select: { slug: true },
    });
    if (!active)
      throw new Error("At least one ACTIVE mission fixture is required");
    const detail = await service.findOnePublicBySlug(active.slug);
    expect(Object.keys(detail).sort()).toEqual([
      "finished",
      "gallery",
      "heroImageUrl",
      "heroPhrase",
      "id",
      "profileImageUrl",
      "publications",
      "slug",
      "status",
      "title",
    ]);
    expect(detail).not.toHaveProperty("heroImageId");
    expect(detail).not.toHaveProperty("createdAt");
    expect(detail).not.toHaveProperty("updatedAt");
    expect(detail.status).toBe("ACTIVE");
    expect(detail.slug).toBe(active.slug);
    expect(detail.heroImageUrl).toMatch(/^\/files\//);
  });

  it("404s an unknown public slug", async () => {
    await expect(
      service.findOnePublicBySlug("definitely-missing-slug"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("returns ARCHIVED missions with finished marker and exact closed shape", async () => {
    const client = db.client as unknown as {
      mission: {
        findFirst(args: {
          where: { status: string };
          select: { slug: true };
        }): Promise<{ slug: string } | null>;
      };
    };
    const archived = await client.mission.findFirst({
      where: { status: "ARCHIVED" },
      select: { slug: true },
    });
    if (!archived) return;
    const detail = await service.findOnePublicBySlug(archived.slug);
    expect(detail.status).toBe("ARCHIVED");
    expect(detail.finished).toBe(true);
    expect(Object.keys(detail).sort()).toEqual([
      "finished",
      "gallery",
      "heroImageUrl",
      "heroPhrase",
      "id",
      "profileImageUrl",
      "publications",
      "slug",
      "status",
      "title",
    ]);
  });

  it("exposes one PUBLISHED Publication under both linked Mission details", async () => {
    type ManyToManyClient = {
      fileAsset: {
        findFirst(args: unknown): Promise<{ id: string } | null>;
        findMany(args: unknown): Promise<Array<{ id: string }>>;
      };
      mission: {
        create(args: unknown): Promise<{ id: string; slug: string }>;
        updateMany(args: unknown): Promise<unknown>;
      };
      publication: {
        create(args: unknown): Promise<{ id: string; slug: string }>;
        deleteMany(args: unknown): Promise<unknown>;
      };
      publicationMission: {
        createMany(args: unknown): Promise<unknown>;
        deleteMany(args: unknown): Promise<unknown>;
      };
      $transaction<T>(
        callback: (tx: ManyToManyClient) => Promise<T>,
      ): Promise<T>;
    };
    const client = db.client as unknown as ManyToManyClient;
    const prefix = `many-to-many-public-mission-${Date.now()}`;
    const image = await client.fileAsset.findFirst({
      where: { category: "MISSION_HERO" },
      select: { id: true },
    });
    if (!image) throw new Error("A mission hero image fixture is required");
    const publicationImages = await client.fileAsset.findMany({
      where: { category: "PUBLICATION_FEATURED_IMAGE" },
      select: { id: true },
    });
    if (publicationImages.length < 2)
      throw new Error("Two publication featured image fixtures are required");
    const publishedImage = publicationImages[0];
    const draftImage = publicationImages[1];
    if (!publishedImage || !draftImage)
      throw new Error("Two publication featured image fixtures are required");

    try {
      const fixture = await client.$transaction(async (tx) => {
        const missions = await Promise.all(
          ["one", "two"].map((suffix) =>
            tx.mission.create({
              data: {
                slug: `${prefix}-${suffix}`,
                title: `Mission ${suffix}`,
                heroImageId: image.id,
                heroPhrase: `Phrase ${suffix}`,
                status: "ACTIVE",
              },
              select: { id: true, slug: true },
            }),
          ),
        );
        const publication = await tx.publication.create({
          data: {
            slug: `${prefix}-publication`,
            title: "Shared publication",
            excerpt: "Shared by two missions",
            content: "<p>Shared</p>",
            type: "POST",
            images: { create: { fileAssetId: publishedImage.id, position: 0 } },
            status: "PUBLISHED",
            publishedAt: new Date(),
            scope: "GENERAL",
          },
          select: { id: true, slug: true },
        });
        const draft = await tx.publication.create({
          data: {
            slug: `${prefix}-draft-publication`,
            title: "Draft publication",
            excerpt: "Not public",
            content: "<p>Draft</p>",
            type: "POST",
            images: { create: { fileAssetId: draftImage.id, position: 0 } },
            status: "DRAFT",
            scope: "GENERAL",
          },
          select: { id: true, slug: true },
        });
        await tx.publicationMission.createMany({
          data: [
            ...missions.map(({ id }) => ({
              publicationId: publication.id,
              missionId: id,
            })),
            { publicationId: draft.id, missionId: missions[0]!.id },
          ],
          skipDuplicates: true,
        });
        return { missions, publication, draft };
      });

      for (const mission of fixture.missions) {
        const detail = await service.findOnePublicBySlug(mission.slug);
        expect(detail.publications.map(({ slug }) => slug)).toContain(
          fixture.publication.slug,
        );
        expect(detail.publications.map(({ slug }) => slug)).not.toContain(
          fixture.draft.slug,
        );
        expect(detail.gallery).not.toContainEqual({
          imageUrl: `/files/${draftImage.id}`,
        });
      }
    } finally {
      await client.publicationMission.deleteMany({
        where: { publication: { slug: { startsWith: prefix } } },
      });
      await client.publication.deleteMany({
        where: { slug: { startsWith: prefix } },
      });
      await client.mission.updateMany({
        where: { slug: { startsWith: prefix } },
        data: { status: "ARCHIVED" },
      });
    }
  });
});
