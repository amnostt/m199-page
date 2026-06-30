/**
 * @m199/db — Database package source entry point.
 *
 * Uses async factory `getPrisma()` with dynamic imports so Prisma Client
 * resolution is deferred until after API config validation (BF-01, BF-02).
 * Consumers call `await getPrisma()` explicitly — no eager singleton.
 */

import type { PrismaClient } from "@prisma/client";

/** Package version identifier used by the test baseline. */
export const DB_PACKAGE_VERSION = "0.0.0" as const;

let _prisma: PrismaClient | undefined;

/**
 * Async factory: dynamically imports @prisma/client and @prisma/adapter-pg,
 * then creates and caches a PrismaClient singleton with the Pg adapter.
 *
 * Call AFTER env validation — `DATABASE_URL` must be set in process.env.
 */
export async function getPrisma(): Promise<PrismaClient> {
  if (_prisma) return _prisma;

  const [{ PrismaClient }, { PrismaPg }] = await Promise.all([
    import("@prisma/client"),
    import("@prisma/adapter-pg"),
  ]);

  const adapter = new PrismaPg({
    connectionString: process.env["DATABASE_URL"]!,
  });

  _prisma = new PrismaClient({ adapter });
  return _prisma;
}
