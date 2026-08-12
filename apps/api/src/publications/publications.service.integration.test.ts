/**
 * PostgreSQL-backed Nest DI integration coverage for PublicationsService.
 *
 * The unit suite (`publications.service.test.ts`) mocks the service directly
 * with `new PublicationsService({ client } as never)`, so it cannot detect
 * dependency-injection regressions in the live runtime. This harness boots the
 * real Nest DI container with `DbModule` + `PublicationsModule` against the
 * local Compose PostgreSQL so the @Inject(DbService) wiring — required because
 * the tsx/esbuild runtime does not emit TypeScript decorator metadata — is
 * exercised end-to-end. Reverting `@Inject(DbService)` on the constructor
 * regresses this suite to `TypeError: Cannot read properties of undefined
 * (reading 'client')` and fails the assertion below.
 *
 * Opt-in command (after the migration is deployed):
 * DATABASE_URL=<database-url> JWT_SECRET=<jwt-secret> \
 *   pnpm --filter @m199/api test:integration
 */
import "reflect-metadata";
import { ConfigModule } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DbModule } from "../db/db.module.js";
import { DbService } from "../db/db.service.js";
import { PublicationsModule } from "./publications.module.js";
import { PublicationsService } from "./publications.service.js";
import { PublicationStatus } from "./dto/publication.dto.js";

const INTEGRATION_ENABLED = process.env["RUN_POSTGRES_INTEGRATION"] === "1";

function requiredEnvironment(name: "DATABASE_URL" | "JWT_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be provided when RUN_POSTGRES_INTEGRATION=1`);
  }
  return value;
}

const integrationDescribe = INTEGRATION_ENABLED ? describe : describe.skip;

integrationDescribe(
  "PublicationsService findMany — PostgreSQL Nest DI integration",
  () => {
    let module: TestingModule;
    let service: PublicationsService;
    let dbService: DbService;

    beforeAll(async () => {
      requiredEnvironment("DATABASE_URL");
      requiredEnvironment("JWT_SECRET");

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
          DbModule,
          PublicationsModule,
        ],
      }).compile();
      await module.init();

      service = module.get(PublicationsService);
      dbService = module.get(DbService);
    });

    afterAll(async () => {
      await module?.close();
      await dbService?.client.$disconnect().catch(() => undefined);
    });

    it("injects DbService through Nest DI and lists publications with missionIds", async () => {
      // If `@Inject(DbService)` is missing on PublicationsService, this throws
      // `TypeError: Cannot read properties of undefined (reading 'client')`.
      const rows = await service.findMany();
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.id).toBeTypeOf("string");
        expect(Array.isArray(row.missionIds)).toBe(true);
        // missionIds is normalized from PublicationMission rows, sorted, and
        // must never leak the join-table shape.
        for (const value of row.missionIds) {
          expect(value).toBeTypeOf("string");
        }
      }
    });

    it("filters by status through Nest DI without injecting undefined dbService", async () => {
      const rows = await service.findMany(PublicationStatus.PUBLISHED);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        // PublicationRow uses an index signature for the remaining scalars,
        // so `status` is not narrowed by TS but is present at runtime.
        expect((row as unknown as { status: string }).status).toBe(
          PublicationStatus.PUBLISHED,
        );
      }
    });
  },
);
