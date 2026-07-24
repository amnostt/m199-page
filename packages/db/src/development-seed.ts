import bcrypt from "bcryptjs";

import { seedLandingSettings } from "./landing-seed.js";

export const DEVELOPMENT_ADMIN_EMAIL = "admin@example.com";
export const DEVELOPMENT_ADMIN_PASSWORD = "qawsedrf";
export const DEVELOPMENT_ADMIN_PASSWORD_SALT_ROUNDS = 10;

const SEEDED_PUBLISHED_AT = new Date("2026-07-24T12:00:00.000Z");
const SEEDED_FEATURED_AT = new Date("2026-07-01T12:00:00.000Z");

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
  post: {
    upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<SeedRow>;
  };
  featuredPost: {
    upsert(args: {
      where: { postId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<SeedRow>;
  };
  outing: {
    upsert(args: {
      where: { id: string };
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

const PUBLISHED_POST = {
  id: "seed-post-published",
  slug: "welcome-to-mision-1-99",
  title: "Welcome to Misión 1-99",
  description: "A published demo post for local development.",
  content:
    "<p>This published post gives the public site and admin editor a deterministic starting point.</p>",
  status: "PUBLISHED",
  tags: ["demo", "welcome"],
  publishedAt: SEEDED_PUBLISHED_AT,
};

const DRAFT_POST = {
  id: "seed-post-draft",
  slug: "draft-community-update",
  title: "Draft community update",
  description: "A draft demo post for testing editorial workflows.",
  content:
    "<p>This draft is intentionally unpublished so the admin lifecycle can be exercised locally.</p>",
  status: "DRAFT",
  tags: ["demo", "draft"],
  publishedAt: null,
};

const FEATURED_OUTING = {
  id: "seed-outing-featured",
  slug: "community-service-day",
  title: "Community Service Day",
  dateTime: new Date("2026-08-15T14:00:00.000Z"),
  location: "Local community center",
  description:
    "A published demo outing connected to the landing page featured outing slot.",
  status: "PUBLISHED",
  likesCount: 0,
  publishedAt: SEEDED_PUBLISHED_AT,
};

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

  const publishedPost = await client.post.upsert({
    where: { id: PUBLISHED_POST.id },
    create: { ...PUBLISHED_POST, createdById: admin.id },
    update: { ...PUBLISHED_POST, createdById: admin.id },
  });

  await client.post.upsert({
    where: { id: DRAFT_POST.id },
    create: { ...DRAFT_POST, createdById: admin.id },
    update: { ...DRAFT_POST, createdById: admin.id },
  });

  await client.featuredPost.upsert({
    where: { postId: publishedPost.id },
    create: {
      id: "seed-featured-post",
      postId: publishedPost.id,
      slot: "SLOT_1",
      featuredAt: SEEDED_FEATURED_AT,
    },
    update: {
      slot: "SLOT_1",
      featuredAt: SEEDED_FEATURED_AT,
    },
  });

  const outing = await client.outing.upsert({
    where: { id: FEATURED_OUTING.id },
    create: { ...FEATURED_OUTING, createdById: admin.id },
    update: { ...FEATURED_OUTING, createdById: admin.id },
  });

  await seedLandingSettings(client);
  await client.landingSettings.update({
    where: { id: 1 },
    data: { featuredOutingId: outing.id },
  });

  await client.verse.upsert({
    where: { id: LATEST_VERSE.id },
    create: { ...LATEST_VERSE, createdById: admin.id },
    update: { ...LATEST_VERSE, createdById: admin.id },
  });
}

/**
 * Seeds one coherent local graph in a transaction. No sessions, likes,
 * revisions, downloads, or orphan FileAsset rows are created.
 */
export async function seedDevelopmentData(
  client: DevelopmentSeedClient,
): Promise<void> {
  await client.$transaction(seedData);
}
