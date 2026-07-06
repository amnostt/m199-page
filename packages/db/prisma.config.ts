import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load root .env relative to this config's location inside packages/db/.
// dotenv's cwd is packages/db/ when run via `pnpm --filter @m199/db`.
config({ path: "../../.env" });

/**
 * Prisma 7 configuration for the Misión 1-99 database package.
 *
 * - Loads DATABASE_URL from the environment (via dotenv, from root `.env`).
 * - Points to the hardened `prisma/schema.prisma` artifact.
 * - Migration history is stored under `prisma/migrations/`.
 * - Seed command is declared here because Prisma 7 uses `migrations.seed`
 *   when a prisma.config.ts file is present.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
