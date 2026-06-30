import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load root .env relative to this config's location inside packages/db/.
// dotenv's cwd is packages/db/ when run via `pnpm --filter @m199/db`.
config({ path: "../../.env" });

/**
 * Prisma 7 configuration for the Misión 1-99 database package.
 *
 * - Loads DATABASE_URL from the environment (via dotenv).
 * - Points to the existing `prisma/schema.prisma` design artifact.
 * - No migrations or seed path are configured yet; those are deferred
 *   until real feature work requires database provisioning.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
