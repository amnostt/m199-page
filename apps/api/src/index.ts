/**
 * @m199/api — Non-product placeholder entry point.
 *
 * This file exists solely so the TypeScript compiler can validate the
 * package baseline. No API endpoints, NestJS modules, middleware, auth
 * guards, or business logic are implemented. Real API behavior ships in
 * later SDD changes.
 *
 * The `prisma` import from `@m199/db` is a type-level boundary proof:
 * it ensures the API package can resolve and compile against the
 * database package without owning Prisma config.
 */

import { prisma } from "@m199/db";

/** Package version identifier used by the test baseline. */
export const API_PACKAGE_VERSION = "0.0.0" as const;

// Type-boundary proof: ensures @m199/db is importable.
// No runtime query is executed.
void prisma;
