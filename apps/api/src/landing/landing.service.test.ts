import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DbService } from "../db/db.service.js";
import { LandingService } from "./landing.service.js";

interface LandingSettingsRow {
  id: number;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageId: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  verseText: string | null;
  verseReference: string | null;
}

interface FileAssetRow {
  id: string;
  category: string;
}

const FULL_SETTINGS: LandingSettingsRow = {
  id: 1,
  heroTitle: "Misión 1-99",
  heroSubtitle: "Transformando vidas",
  heroImageId: "img-001",
  mission: "Nuestra misión es servir",
  vision: "Ser referencia en la comunidad",
  description: "Somos una organización dedicada a...",
  featuredVideoUrl: "https://youtube.com/watch?v=abc",
  contactEmail: "info@m199.org",
  contactPhone: "+54 11 1234-5678",
  verseText: "Todo lo puedo en Cristo que me fortalece",
  verseReference: "Filipenses 4:13",
};

interface MockDbOverrides {
  settingsReturn?: LandingSettingsRow | null;
  fileAssetReturn?: FileAssetRow | null;
}

function makeDbValue(overrides: MockDbOverrides = {}) {
  const findFirst = vi
    .fn<() => Promise<LandingSettingsRow | null>>()
    .mockResolvedValue(overrides.settingsReturn ?? null);
  const upsert = vi
    .fn<
      (args: {
        where: { id: number };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<LandingSettingsRow>
    >()
    .mockImplementation(async (args) => ({
      ...(overrides.settingsReturn ?? FULL_SETTINGS),
      ...args.update,
    }));
  const fileAssetFindUnique = vi
    .fn<(args: { where: { id: string } }) => Promise<FileAssetRow | null>>()
    .mockImplementation(async ({ where }) => {
      const asset = overrides.fileAssetReturn ?? null;
      return asset?.id === where.id ? asset : null;
    });

  const client = {
    landingSettings: { findFirst, upsert },
    fileAsset: { findUnique: fileAssetFindUnique },
  };

  return { client, findFirst, upsert, fileAssetFindUnique };
}

async function buildService(overrides: MockDbOverrides = {}) {
  const dbValue = makeDbValue(overrides);
  const module = await Test.createTestingModule({
    providers: [LandingService, { provide: DbService, useValue: dbValue }],
  }).compile();

  return { service: module.get(LandingService), mocks: dbValue };
}

describe("LandingService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("settings", () => {
    it("returns the singleton settings row", async () => {
      const { service } = await buildService({ settingsReturn: FULL_SETTINGS });

      await expect(service.getSettings()).resolves.toEqual(FULL_SETTINGS);
    });

    it("upserts only provided fields", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
      });

      await service.updateSettings({
        verseText: "Nuevo texto",
        verseReference: "Juan 3:16",
      });

      expect(mocks.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        create: {
          id: 1,
          verseText: "Nuevo texto",
          verseReference: "Juan 3:16",
        },
        update: {
          verseText: "Nuevo texto",
          verseReference: "Juan 3:16",
        },
      });
    });

    it("validates a landing hero asset before saving settings", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
        fileAssetReturn: { id: "hero-asset", category: "LANDING_HERO" },
      });

      await service.updateSettings({ heroImageId: "hero-asset" });

      expect(mocks.fileAssetFindUnique).toHaveBeenCalledWith({
        where: { id: "hero-asset" },
      });
      expect(mocks.upsert).toHaveBeenCalledOnce();
    });

    it("rejects a missing hero asset before saving settings", async () => {
      const { service, mocks } = await buildService({
        settingsReturn: FULL_SETTINGS,
      });

      await expect(
        service.updateSettings({ heroImageId: "missing-asset" }),
      ).rejects.toThrow('FileAsset with id "missing-asset" not found');
      expect(mocks.upsert).not.toHaveBeenCalled();
    });
  });

  describe("public payload", () => {
    it("uses the configured verse without querying a verse entity", async () => {
      const { service } = await buildService({
        settingsReturn: FULL_SETTINGS,
      });

      const result = await service.getPublicPayload();

      expect(result.heroImageUrl).toBe("/files/img-001");
      expect(result.currentVerse).toEqual({
        text: "Todo lo puedo en Cristo que me fortalece",
        reference: "Filipenses 4:13",
      });
      expect(result).not.toHaveProperty("featuredOuting");
      expect(result).not.toHaveProperty("featuredPosts");
    });

    it("returns no verse when either configured field is empty", async () => {
      const { service } = await buildService({
        settingsReturn: {
          ...FULL_SETTINGS,
          verseText: "  ",
          verseReference: "Juan 3:16",
        },
      });

      await expect(service.getPublicPayload()).resolves.toMatchObject({
        currentVerse: null,
      });
    });

    it("trims configured verse fields in the public payload", async () => {
      const { service } = await buildService({
        settingsReturn: {
          ...FULL_SETTINGS,
          verseText: "  Texto  ",
          verseReference: "  Juan 3:16  ",
        },
      });

      await expect(service.getPublicPayload()).resolves.toMatchObject({
        currentVerse: { text: "Texto", reference: "Juan 3:16" },
      });
    });

    it("returns null sections when settings do not exist", async () => {
      const { service } = await buildService({ settingsReturn: null });

      await expect(service.getPublicPayload()).resolves.toEqual({
        heroTitle: null,
        heroSubtitle: null,
        heroImageUrl: null,
        mission: null,
        vision: null,
        description: null,
        featuredVideoUrl: null,
        contactEmail: null,
        contactPhone: null,
        currentVerse: null,
      });
    });
  });
});
