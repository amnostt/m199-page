import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import {
  DEVELOPMENT_ADMIN_EMAIL,
  DEVELOPMENT_ADMIN_PASSWORD,
  seedDevelopmentData,
  type DevelopmentSeedClient,
} from "./development-seed.js";

type SeedCallLog = {
  responsibleUser: Array<Record<string, unknown>>;
  post: Array<Record<string, unknown>>;
  featuredPost: Array<Record<string, unknown>>;
  outing: Array<Record<string, unknown>>;
  verse: Array<Record<string, unknown>>;
  landingSettings: Array<Record<string, unknown>>;
};

function createFakeClient(): DevelopmentSeedClient & {
  rows: Map<string, Record<string, unknown>>;
  calls: SeedCallLog;
} {
  const rows = new Map<string, Record<string, unknown>>();
  const calls: SeedCallLog = {
    responsibleUser: [],
    post: [],
    featuredPost: [],
    outing: [],
    verse: [],
    landingSettings: [],
  };

  const upsert =
    (
      model: keyof SeedCallLog,
      key: (args: Record<string, unknown>) => string,
    ) =>
    async (args: Record<string, unknown>): Promise<{ id: string }> => {
      calls[model]!.push(args);
      const create = args.create as Record<string, unknown>;
      const update = args.update as Record<string, unknown>;
      const id = String(create.id ?? key(args));
      const previous = rows.get(`${model}:${key(args)}`);
      const row = { ...(previous ?? create), ...(previous ? update : {}), id };
      rows.set(`${model}:${key(args)}`, row);
      return { id };
    };

  const client: DevelopmentSeedClient & {
    rows: Map<string, Record<string, unknown>>;
    calls: SeedCallLog;
  } = {
    rows,
    calls,
    responsibleUser: {
      upsert: upsert("responsibleUser", (args) => {
        const where = args.where as { email: string };
        return where.email;
      }),
    },
    post: {
      upsert: upsert("post", (args) => {
        const where = args.where as { id: string };
        return where.id;
      }),
    },
    featuredPost: {
      upsert: upsert("featuredPost", (args) => {
        const where = args.where as { postId: string };
        return where.postId;
      }),
    },
    outing: {
      upsert: upsert("outing", (args) => {
        const where = args.where as { id: string };
        return where.id;
      }),
    },
    verse: {
      upsert: upsert("verse", (args) => {
        const where = args.where as { id: string };
        return where.id;
      }),
    },
    landingSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        rows.set("landingSettings:1", { ...data });
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        rows.set("landingSettings:1", {
          ...(rows.get("landingSettings:1") ?? {}),
          ...data,
        });
      }),
    },
    $transaction: vi.fn(async (callback) => callback(client)),
  };

  return client;
}

describe("development database seed", () => {
  it("creates the deterministic content graph with a production-compatible password hash", async () => {
    const client = createFakeClient();

    await seedDevelopmentData(client);

    const adminCall = client.calls.responsibleUser[0]!;
    const createAdmin = adminCall.create as Record<string, unknown>;
    expect(createAdmin.email).toBe(DEVELOPMENT_ADMIN_EMAIL);
    expect(createAdmin.passwordHash).not.toBe(DEVELOPMENT_ADMIN_PASSWORD);
    await expect(
      bcrypt.compare(
        DEVELOPMENT_ADMIN_PASSWORD,
        String(createAdmin.passwordHash),
      ),
    ).resolves.toBe(true);

    const postCalls = client.calls.post;
    expect(postCalls).toHaveLength(2);
    expect((postCalls[0]!.create as Record<string, unknown>).status).toBe(
      "PUBLISHED",
    );
    expect((postCalls[1]!.create as Record<string, unknown>).status).toBe(
      "DRAFT",
    );
    expect(client.calls.featuredPost).toHaveLength(1);
    expect(
      (client.calls.featuredPost[0]!.create as Record<string, unknown>).postId,
    ).toBe("seed-post-published");
    expect(
      (client.calls.outing[0]!.create as Record<string, unknown>).status,
    ).toBe("PUBLISHED");
    expect(
      (client.rows.get("landingSettings:1") as Record<string, unknown>)
        .featuredOutingId,
    ).toBe("seed-outing-featured");
    expect(
      (client.calls.verse[0]!.create as Record<string, unknown>).status,
    ).toBe("PUBLISHED");
  });

  it("uses only upserts and keeps one row per seeded key across reruns", async () => {
    const client = createFakeClient();

    await seedDevelopmentData(client);
    await seedDevelopmentData(client);

    expect(client.rows.has("responsibleUser:admin@example.com")).toBe(true);
    expect(client.rows.has("post:seed-post-published")).toBe(true);
    expect(client.rows.has("post:seed-post-draft")).toBe(true);
    expect(client.rows.has("featuredPost:seed-post-published")).toBe(true);
    expect(client.rows.has("outing:seed-outing-featured")).toBe(true);
    expect(client.rows.has("verse:seed-verse-latest")).toBe(true);
    expect(client.rows.get("landingSettings:1")).toMatchObject({
      id: 1,
      featuredOutingId: "seed-outing-featured",
    });
    expect(client.calls.responsibleUser).toHaveLength(2);
    expect(client.calls.post).toHaveLength(4);
    expect(client.calls.featuredPost).toHaveLength(2);
    expect(client.calls.outing).toHaveLength(2);
    expect(client.calls.verse).toHaveLength(2);
  });

  it("does not seed sessions, likes, revisions, downloads, or file assets", async () => {
    const client = createFakeClient();

    await seedDevelopmentData(client);

    expect(client.calls).not.toHaveProperty("refreshSession");
    expect(client.calls).not.toHaveProperty("outingLike");
    expect(client.calls).not.toHaveProperty("verseRevision");
    expect(client.calls).not.toHaveProperty("postDownload");
    expect(client.calls).not.toHaveProperty("fileAsset");
  });
});
