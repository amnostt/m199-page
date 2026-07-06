import { getPrisma } from "../src/index.js";
import { seedLandingSettings } from "../src/landing-seed.js";

let prisma: Awaited<ReturnType<typeof getPrisma>> | undefined;

async function main(): Promise<void> {
  prisma = await getPrisma();
  await seedLandingSettings(prisma);
}

main()
  .catch((error: unknown) => {
    console.error("Landing seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
