import { getPrisma } from "../src/index.js";
import {
  seedDevelopmentData,
  type DevelopmentSeedClient,
} from "../src/development-seed.js";
import { assertExpectedLocalDatabaseUrl } from "../src/local-database.js";

let prisma: Awaited<ReturnType<typeof getPrisma>> | undefined;

async function main(): Promise<void> {
  // Development credentials must never be applied to a non-local database.
  assertExpectedLocalDatabaseUrl(process.env["DATABASE_URL"]);
  prisma = await getPrisma();
  await seedDevelopmentData(prisma as unknown as DevelopmentSeedClient);
  console.info(
    "Local development seed complete. Administrator email: admin@example.com (development-only credentials are documented in docs/local-development-seed.md).",
  );
}

main()
  .catch((error: unknown) => {
    console.error("Local development seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
