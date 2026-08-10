import bcrypt from "bcryptjs";

import { seedLandingSettings } from "./landing-seed.js";

export const DEVELOPMENT_ADMIN_EMAIL = "admin@example.com";
export const DEVELOPMENT_ADMIN_PASSWORD = "qawsedrf";
export const DEVELOPMENT_ADMIN_PASSWORD_SALT_ROUNDS = 10;

const SEEDED_PUBLISHED_AT = new Date("2026-07-24T12:00:00.000Z");

type SeedRow = { id: string };

type LandingTextFields = {
  heroTitle: string | null;
  heroSubtitle: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export type DevelopmentSeedClient = {
  responsibleUser: {
    upsert(args: {
      where: { email: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<SeedRow>;
  };
  fileAsset: {
    upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<SeedRow>;
  };
  mission: {
    upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<SeedRow>;
  };
  publication: {
    upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<SeedRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<SeedRow>;
  };
  publicationMission: {
    upsert(args: {
      where: {
        publicationId_missionId: { publicationId: string; missionId: string };
      };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<SeedRow>;
  };
  verse: {
    upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<SeedRow>;
  };
  landingSettings: {
    findUnique(args: {
      where: { id: 1 };
    }): Promise<Partial<LandingTextFields> | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    update(args: {
      where: { id: 1 };
      data: Record<string, unknown>;
    }): Promise<unknown>;
  };
  $transaction<T>(
    callback: (transaction: DevelopmentSeedClient) => Promise<T>,
  ): Promise<T>;
};

const SEED_FILE_ASSETS = {
  missionHero: {
    id: "seed-file-asset-mission-hero",
    category: "MISSION_HERO",
    originalFilename: "mission-hero.svg",
    storagePath: "seed/mission-hero.svg",
    url: "https://placehold.invalid/seed/mission-hero.svg",
  },
  publicationPost: {
    id: "seed-file-asset-publication-post",
    category: "PUBLICATION_FEATURED_IMAGE",
    originalFilename: "publication-post.svg",
    storagePath: "seed/publication-post.svg",
    url: "https://placehold.invalid/seed/publication-post.svg",
  },
  publicationOuting: {
    id: "seed-file-asset-publication-outing",
    category: "PUBLICATION_FEATURED_IMAGE",
    originalFilename: "publication-outing.svg",
    storagePath: "seed/publication-outing.svg",
    url: "https://placehold.invalid/seed/publication-outing.svg",
  },
  publicationEvent: {
    id: "seed-file-asset-publication-event",
    category: "PUBLICATION_FEATURED_IMAGE",
    originalFilename: "publication-event.svg",
    storagePath: "seed/publication-event.svg",
    url: "https://placehold.invalid/seed/publication-event.svg",
  },
} as const;

const SEED_FILE_ASSETS_LIST = Object.values(SEED_FILE_ASSETS).map((asset) => ({
  ...asset,
  mimeType: "image/svg+xml" as const,
  extension: "svg" as const,
  fileSize: 4096,
}));

const SEED_MISSION = {
  id: "seed-mission-1",
  slug: "seed-mission-1",
  title: "Misión 1-99 — Primera comunidad",
  heroImageId: SEED_FILE_ASSETS.missionHero.id,
  heroPhrase: "Acompañamos con esperanza, servicio y fe.",
  status: "ACTIVE",
} as const;

const SEED_PUBLICATION_POST = {
  id: "seed-publication-post-1",
  slug: "seed-publication-post-1",
  title: "Bienvenidos a Misión 1-99",
  excerpt: "Una publicación inicial para la portada pública.",
  content:
    "<p>Esta publicación publicada aporta un punto de partida determinista al sitio público y al editor administrativo.</p>",
  featuredImageId: SEED_FILE_ASSETS.publicationPost.id,
  type: "POST",
  status: "PUBLISHED",
  scope: "GENERAL",
  startDate: null,
  endDate: null,
  activityStatus: null,
  documentationStatus: null,
  publishedAt: SEEDED_PUBLISHED_AT,
} as const;

const SEED_PUBLICATION_OUTING = {
  id: "seed-publication-outing-1",
  slug: "seed-publication-outing-1",
  title: "Salida comunitaria de servicio",
  excerpt: "Una salida publicada vinculada a la primera misión.",
  content: "<p>Esta salida publicada se enlaza a la misión seed-mission-1.</p>",
  featuredImageId: SEED_FILE_ASSETS.publicationOuting.id,
  type: "OUTING",
  status: "PUBLISHED",
  scope: "GENERAL",
  startDate: new Date("2026-09-01T00:00:00.000Z"),
  endDate: new Date("2026-09-01T00:00:00.000Z"),
  activityStatus: "UPCOMING",
  documentationStatus: "PENDING_DOCUMENTATION",
  publishedAt: SEEDED_PUBLISHED_AT,
} as const;

const SEED_PUBLICATION_EVENT = {
  id: "seed-publication-event-1",
  slug: "seed-publication-event-1",
  title: "Encuentro mensual de voluntarios",
  excerpt: "Un evento publicado vinculado a la primera misión.",
  content: "<p>Este evento publicado se enlaza a la misión seed-mission-1.</p>",
  featuredImageId: SEED_FILE_ASSETS.publicationEvent.id,
  type: "EVENT",
  status: "PUBLISHED",
  scope: "GENERAL",
  startDate: new Date("2026-10-15T00:00:00.000Z"),
  endDate: new Date("2026-10-16T00:00:00.000Z"),
  activityStatus: "UPCOMING",
  documentationStatus: "PENDING_DOCUMENTATION",
  publishedAt: SEEDED_PUBLISHED_AT,
} as const;

const LATEST_VERSE = {
  id: "seed-verse-latest",
  text: "Let us not grow weary of doing good.",
  reference: "Galatians 6:9",
  date: new Date("2026-07-24T00:00:00.000Z"),
  publishedAt: SEEDED_PUBLISHED_AT,
  status: "PUBLISHED",
};

async function seedData(client: DevelopmentSeedClient): Promise<void> {
  const passwordHash = await bcrypt.hash(
    DEVELOPMENT_ADMIN_PASSWORD,
    DEVELOPMENT_ADMIN_PASSWORD_SALT_ROUNDS,
  );

  const admin = await client.responsibleUser.upsert({
    where: { email: DEVELOPMENT_ADMIN_EMAIL },
    create: {
      email: DEVELOPMENT_ADMIN_EMAIL,
      displayName: "Local Development Administrator",
      passwordHash,
      status: "ACTIVE",
    },
    update: {
      displayName: "Local Development Administrator",
      passwordHash,
      status: "ACTIVE",
    },
  });

  for (const file of SEED_FILE_ASSETS_LIST) {
    await client.fileAsset.upsert({
      where: { id: file.id },
      create: { ...file, uploadedById: admin.id },
      update: { ...file, uploadedById: admin.id },
    });
  }

  await client.mission.upsert({
    where: { id: SEED_MISSION.id },
    create: { ...SEED_MISSION },
    update: { ...SEED_MISSION },
  });

  await client.publication.upsert({
    where: { id: SEED_PUBLICATION_POST.id },
    create: { ...SEED_PUBLICATION_POST, authorId: admin.id },
    update: { ...SEED_PUBLICATION_POST, authorId: admin.id },
  });

  const linkedPublications = [SEED_PUBLICATION_OUTING, SEED_PUBLICATION_EVENT];
  for (const publication of linkedPublications) {
    const result = await client.publication.upsert({
      where: { id: publication.id },
      create: { ...publication, authorId: admin.id },
      update: { ...publication, authorId: admin.id },
    });
    await client.publicationMission.upsert({
      where: {
        publicationId_missionId: {
          publicationId: result.id,
          missionId: SEED_MISSION.id,
        },
      },
      create: { publicationId: result.id, missionId: SEED_MISSION.id },
      update: {},
    });
    // The PublicationMission scope-sync trigger promotes each linked
    // Publication to scope=MISSION after the join row is written.
    await client.publication.update({
      where: { id: result.id },
      data: { scope: "MISSION" },
    });
  }

  await seedLandingSettings(client);

  await client.verse.upsert({
    where: { id: LATEST_VERSE.id },
    create: { ...LATEST_VERSE, createdById: admin.id },
    update: { ...LATEST_VERSE, createdById: admin.id },
  });
}

/**
 * Seeds one coherent local graph in a transaction. No legacy Post/Outing
 * rows, featuredOutingId wiring, or sessions/likes/revisions/downloads are
 * created. FileAsset rows are limited to the deterministic Mission/Publication
 * featured images.
 */
export async function seedDevelopmentData(
  client: DevelopmentSeedClient,
): Promise<void> {
  await client.$transaction(seedData);
}
