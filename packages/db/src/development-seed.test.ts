import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import {
  DEVELOPMENT_ADMIN_EMAIL,
  DEVELOPMENT_ADMIN_PASSWORD,
  seedDevelopmentData,
  type DevelopmentSeedClient,
} from "./development-seed.js";

type FakeClient = DevelopmentSeedClient & {
  rows: Map<string, Record<string, unknown>>;
  calls: Record<string, Array<Record<string, unknown>>>;
};

function createFakeClient(): FakeClient {
  const rows = new Map<string, Record<string, unknown>>();
  const calls: Record<string, Array<Record<string, unknown>>> = {};

  const upsert =
    (model: string, keyOf: (args: Record<string, unknown>) => string) =>
    async (args: Record<string, unknown>) => {
      (calls[model] ??= []).push(args);
      const create = args.create as Record<string, unknown>;
      const update = args.update as Record<string, unknown>;
      const id = String(create.id ?? keyOf(args));
      const k = `${model}:${keyOf(args)}`;
      const previous = rows.get(k);
      rows.set(k, { ...(previous ?? create), ...(previous ? update : {}), id });
      return { id };
    };

  const idKey = (args: Record<string, unknown>): string =>
    (args.where as { id: string }).id;
  const linkKey = (args: Record<string, unknown>): string => {
    const w = args.where as {
      publicationId_missionId: { publicationId: string; missionId: string };
    };
    return `${w.publicationId_missionId.publicationId}:${w.publicationId_missionId.missionId}`;
  };

  const client = {
    rows,
    calls,
    responsibleUser: {
      upsert: upsert("responsibleUser", (a) => {
        return (a.where as { email: string }).email;
      }),
    },
    fileAsset: { upsert: upsert("fileAsset", idKey) },
    mission: { upsert: upsert("mission", idKey) },
    publication: {
      upsert: upsert("publication", idKey),
      update: vi.fn(
        async (args: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const k = `publication:${args.where.id}`;
          rows.set(k, {
            ...(rows.get(k) ?? {}),
            ...args.data,
            id: args.where.id,
          });
          return { id: args.where.id };
        },
      ),
    },
    publicationMission: { upsert: upsert("publicationMission", linkKey) },
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
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(client),
    ),
  } as unknown as FakeClient;

  return client;
}

describe("development database seed", () => {
  it("creates the deterministic Mission/Publication graph with a hashed admin password", async () => {
    const client = createFakeClient();

    await seedDevelopmentData(client);

    const adminCreate = (client.calls.responsibleUser?.[0]?.create ??
      {}) as Record<string, unknown>;
    expect(adminCreate.email).toBe(DEVELOPMENT_ADMIN_EMAIL);
    expect(adminCreate.passwordHash).not.toBe(DEVELOPMENT_ADMIN_PASSWORD);
    await expect(
      bcrypt.compare(
        DEVELOPMENT_ADMIN_PASSWORD,
        String(adminCreate.passwordHash),
      ),
    ).resolves.toBe(true);

    expect(client.calls.fileAsset).toHaveLength(4);
    expect(
      (client.calls.mission?.[0]?.create ?? {}) as Record<string, unknown>,
    ).toMatchObject({
      id: "seed-mission-1",
      slug: "seed-mission-1",
      status: "ACTIVE",
      heroImageId: "seed-file-asset-mission-hero",
    });

    expect(client.calls.publication).toHaveLength(3);
    const byType = (type: string): Record<string, unknown> => {
      const call = client.calls.publication?.find(
        (c) => (c.create as Record<string, unknown>).type === type,
      );
      return (call?.create ?? {}) as Record<string, unknown>;
    };
    expect(byType("POST")).toMatchObject({
      scope: "GENERAL",
      status: "PUBLISHED",
      startDate: null,
      endDate: null,
      activityStatus: null,
      documentationStatus: null,
    });
    expect(byType("OUTING")).toMatchObject({
      scope: "GENERAL",
      startDate: expect.any(Date),
      activityStatus: "UPCOMING",
      documentationStatus: "PENDING_DOCUMENTATION",
    });
    expect(byType("EVENT")).toMatchObject({
      scope: "GENERAL",
      startDate: expect.any(Date),
      activityStatus: "UPCOMING",
      documentationStatus: "PENDING_DOCUMENTATION",
    });

    // Database scope-sync trigger + explicit update promote linked
    // Publications to scope=MISSION after the join rows are written.
    expect(
      client.rows.get("publication:seed-publication-outing-1"),
    ).toMatchObject({ scope: "MISSION" });
    expect(
      client.rows.get("publication:seed-publication-event-1"),
    ).toMatchObject({ scope: "MISSION" });

    expect(client.calls.publicationMission).toHaveLength(2);
    expect(client.rows.get("landingSettings:1")).not.toHaveProperty(
      "featuredOutingId",
    );
  });

  it("uses only upserts and keeps one row per seeded key across reruns", async () => {
    const client = createFakeClient();

    await seedDevelopmentData(client);
    await seedDevelopmentData(client);

    expect(client.rows.has("responsibleUser:admin@example.com")).toBe(true);
    expect(client.rows.has("fileAsset:seed-file-asset-mission-hero")).toBe(
      true,
    );
    expect(client.rows.has("mission:seed-mission-1")).toBe(true);
    expect(client.rows.has("publication:seed-publication-post-1")).toBe(true);
    expect(client.calls.responsibleUser).toHaveLength(2);
    expect(client.calls.fileAsset).toHaveLength(8);
    expect(client.calls.mission).toHaveLength(2);
    expect(client.calls.publication).toHaveLength(6);
    expect(client.calls.publicationMission).toHaveLength(4);
  });

  it("does not seed legacy Post/Outing/featuredOuting wiring and runs in one transaction", async () => {
    const client = createFakeClient();

    await seedDevelopmentData(client);

    for (const legacy of [
      "post",
      "outing",
      "featuredPost",
      "postDownload",
      "outingLike",
      "refreshSession",
      "verse",
    ]) {
      expect(client.calls).not.toHaveProperty(legacy);
    }
    expect(client.rows.get("landingSettings:1")).not.toHaveProperty(
      "featuredOutingId",
    );
    expect(client.$transaction).toHaveBeenCalledTimes(1);
  });

  it("preserves linked publications as scope=MISSION across consecutive runs", async () => {
    const client = createFakeClient();

    await seedDevelopmentData(client);
    await seedDevelopmentData(client);

    expect(
      client.rows.get("publication:seed-publication-post-1"),
    ).toMatchObject({ scope: "GENERAL" });
    expect(
      client.rows.get("publication:seed-publication-outing-1"),
    ).toMatchObject({ scope: "MISSION" });
    expect(
      client.rows.get("publication:seed-publication-event-1"),
    ).toMatchObject({ scope: "MISSION" });
  });

  it("never sends scope in the update path of linked publication upserts", async () => {
    const client = createFakeClient();

    await seedDevelopmentData(client);
    await seedDevelopmentData(client);

    // Regression guard: the BEFORE UPDATE OF "scope" trigger rejects
    // scope=GENERAL while a PublicationMission row exists. The upsert
    // update payload for linked publications must therefore omit scope on
    // every run, not just the first one.
    const linkedCalls = (client.calls.publication ?? []).filter((call) => {
      const create = call.create as Record<string, unknown>;
      return create.type === "OUTING" || create.type === "EVENT";
    });
    expect(linkedCalls).toHaveLength(4); // 2 linked × 2 runs
    for (const call of linkedCalls) {
      expect(call.update).not.toHaveProperty("scope");
    }
  });

  it("orders upsert / link / non-scope sync / scope=MISSION per linked publication", async () => {
    const client = createFakeClient();

    await seedDevelopmentData(client);
    await seedDevelopmentData(client);

    // Each run issues, per linked publication:
    //   1× publication.upsert (create with scope=GENERAL on first run; no-op
    //      update on subsequent runs)
    //   1× publicationMission.upsert (AFTER INSERT scope-sync trigger
    //      promotes on first run; no-op on subsequent runs)
    //   1× publication.update for the non-scope fields (scope is omitted so
    //      the BEFORE UPDATE OF scope trigger never fires here)
    //   1× publication.update for scope=MISSION (idempotent; trigger accepts
    //      MISSION when link_count >= 1)
    // Across 2 linked publications × 2 runs this is 8 publication.update
    // calls: 4 non-scope sync + 4 scope-only updates.
    const updateMock = client.publication.update as unknown as {
      mock: { calls: Array<[{ data: Record<string, unknown> }]> };
    };
    const updateCalls = updateMock.mock.calls;
    expect(updateCalls).toHaveLength(8);

    const nonScopeSyncCalls = updateCalls.filter(
      (call) => !("scope" in call[0].data),
    );
    const scopeOnlyCalls = updateCalls.filter(
      (call) =>
        Object.keys(call[0].data).length === 1 &&
        call[0].data.scope === "MISSION",
    );
    expect(nonScopeSyncCalls).toHaveLength(4);
    expect(scopeOnlyCalls).toHaveLength(4);
  });
});
