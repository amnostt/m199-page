/**
 * @m199/db — Database package source entry point.
 *
 * Owns Prisma Client instantiation and exports a singleton for all
 * workspace consumers. `apps/api` accesses the database exclusively
 * through this module — never by importing `@prisma/client` directly.
 *
 * Prisma 7 requires a driver adapter for PostgreSQL; `PrismaPg`
 * from `@prisma/adapter-pg` provides this.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"]!,
});

/** Singleton PrismaClient instance shared across the workspace. */
export const prisma = new PrismaClient({ adapter });

/** Package version identifier used by the test baseline. */
export const DB_PACKAGE_VERSION = "0.0.0" as const;
