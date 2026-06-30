import { config } from "dotenv";

// Load root .env so PrismaClient can resolve DATABASE_URL during tests.
// vitest runs from packages/db/, so the .env is two levels up.
config({ path: "../../.env" });
