import "reflect-metadata";
import { ConfigModule } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DbModule } from "../db/db.module.js";
import { DbService } from "../db/db.service.js";
import { PublicationsModule } from "./publications.module.js";
import { PublicationsService } from "./publications.service.js";
import { PublicationType } from "./dto/publication.dto.js";

const enabled = process.env["RUN_POSTGRES_INTEGRATION"] === "1";
const integration = enabled ? describe : describe.skip;

integration("public publications PostgreSQL boundary", () => {
  let module: TestingModule;
  let service: PublicationsService;
  let db: DbService;

  beforeAll(async () => {
    if (!process.env["DATABASE_URL"] || !process.env["JWT_SECRET"])
      throw new Error("DATABASE_URL and JWT_SECRET are required");
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        DbModule,
        PublicationsModule,
      ],
    }).compile();
    await module.init();
    service = module.get(PublicationsService);
    db = module.get(DbService);
  });

  afterAll(async () => {
    await module?.close();
    await db?.client.$disconnect().catch(() => undefined);
  });

  it("returns only PUBLISHED rows in stable chronological pages", async () => {
    const client = db.client as unknown as {
      publication: { findMany(args: unknown): Promise<{ slug: string }[]> };
    };
    const published = await client.publication.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    });
    const drafts = await client.publication.findMany({
      where: { status: "DRAFT" },
      select: { slug: true },
    });
    const first = await service.findManyPublic({ page: 1, limit: 2 });
    const second = await service.findManyPublic({ page: 2, limit: 2 });
    const ids = [...first.items, ...second.items].map((item) => item.slug);
    expect(
      ids.every((slug) => published.some((item) => item.slug === slug)),
    ).toBe(true);
    expect(ids.some((slug) => drafts.some((item) => item.slug === slug))).toBe(
      false,
    );
    expect(
      first.items.every((item: { publishedAt: string }) => item.publishedAt),
    ).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      first.items.length
        ? first.items[0]!.publishedAt >=
            (first.items[1]?.publishedAt ?? first.items[0]!.publishedAt)
        : true,
    ).toBe(true);
    expect(first.hasMore).toBe(first.total > 2);
    expect(second.page).toBe(2);
  });

  it("returns only published rows of the requested type", async () => {
    const result = await service.findManyPublic({
      page: 1,
      limit: 50,
      type: PublicationType.OUTING,
    });
    expect(
      result.items.every((item) => item.type === PublicationType.OUTING),
    ).toBe(true);
    expect(result.total).toBe(
      await (
        db.client as unknown as {
          publication: {
            count(args: {
              where: { status: string; type: PublicationType };
            }): Promise<number>;
          };
        }
      ).publication.count({
        where: { status: "PUBLISHED", type: PublicationType.OUTING },
      }),
    );
  });

  it("returns a published detail and hides missing and DRAFT slugs", async () => {
    const client = db.client as unknown as {
      publication: {
        findFirst(args: {
          where: { status: string };
          select: { slug: true };
        }): Promise<{ slug: string } | null>;
      };
    };
    const published = await client.publication.findFirst({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    });
    const draft = await client.publication.findFirst({
      where: { status: "DRAFT" },
      select: { slug: true },
    });
    if (published) {
      const result = await service.findOnePublicBySlug(published.slug);
      expect(result).not.toHaveProperty("status");
      expect(result).not.toHaveProperty("missionIds");
      expect(result).toHaveProperty("content");
    }
    await expect(
      service.findOnePublicBySlug("definitely-missing"),
    ).rejects.toThrow();
    if (draft)
      await expect(service.findOnePublicBySlug(draft.slug)).rejects.toThrow();
  });
});
