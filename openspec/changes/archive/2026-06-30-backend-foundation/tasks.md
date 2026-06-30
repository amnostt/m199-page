# Tasks: Backend Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 370–420 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Bootstrap + Config + Errors (~230 lines) → PR 2: DB + Health + Validation Proof (~170 lines) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | NestJS bootstrap, config validation, error envelope, delete placeholders + tests | PR 1 | Base: `main`; standalone verify via env validation + filter tests (~230 lines) |
| 2 | @m199/db async factory, DB boundary, health endpoint, validation proof + tests | PR 2 | Depends on PR 1; base: PR 1 branch; standalone verify via service + controller tests (~170 lines) |

## Phase 1: Dependencies, Config & Env Validation

- [x] 1.1 Add to `apps/api/package.json`: @nestjs/core, @nestjs/common, @nestjs/platform-express, @nestjs/config, @nestjs/testing, class-validator, class-transformer, reflect-metadata, rxjs; add `start:dev` script via `tsx watch src/main.ts`
- [x] 1.2 Add `experimentalDecorators: true`, `emitDecoratorMetadata: true` to `apps/api/tsconfig.json`; verify `useDefineForClassFields` (override to `false` if validation proof fails)
- [x] 1.3 Add `NODE_ENV`, `PORT` keys to `.env.example` alongside existing `DATABASE_URL`
- [x] 1.4 Create `apps/api/src/config/env.interface.ts` — `EnvConfig` type with `NODE_ENV`, `PORT`, `DATABASE_URL`
- [x] 1.5 Create `apps/api/src/config/env.validation.ts` — sync `validate(config)` checking all three vars present, `PORT` numeric; throw on missing/invalid

## Phase 2: NestJS Bootstrap & Error Conventions

- [x] 2.1 Create `apps/api/src/main.ts` — `bootstrap()`: `ConfigModule.forRoot({ validate, isGlobal: true })`, `app.useGlobalPipes(new ValidationPipe({ whitelist: true }))`, `app.listen(port)`
- [x] 2.2 Create `apps/api/src/app.module.ts` — imports `ConfigModule`, `DbModule`, `HealthModule`, `ValidationProofModule`; `APP_FILTER` provider for `AllExceptionsFilter`
- [x] 2.3 Create `apps/api/src/common/filters/all-exceptions.filter.ts` — `@Catch()` all, return `{ statusCode, message, timestamp, path }`, strip stack traces
- [x] 2.4 Delete `apps/api/src/index.ts` and `apps/api/src/index.test.ts`

## Phase 3: DB Boundary & @m199/db Refactor

- [x] 3.1 Refactor `packages/db/src/index.ts` — replace eager singleton with async `getPrisma()` using `await import('@prisma/client')`; keep `DB_PACKAGE_VERSION`
- [x] 3.2 Create `apps/api/src/db/db.service.ts` — `onModuleInit()`: `const { getPrisma } = await import('@m199/db')` → set `_client`; guarded `client` getter throws before init
- [x] 3.3 Create `apps/api/src/db/db.module.ts` — `@Global()`, provide+export `DbService`

## Phase 4: Health & Validation Proof

- [x] 4.1 Create `apps/api/src/health/health.controller.ts` — `@Get()` returns `{ status: 'ok', uptime, env }`, zero DB imports
- [x] 4.2 Create `apps/api/src/health/health.module.ts` — register controller only
- [x] 4.3 Create `apps/api/src/common/validation-proof/echo.dto.ts` — `class EchoDto { @IsString() message: string }`
- [x] 4.4 Create `apps/api/src/common/validation-proof/echo.controller.ts` — `@Post('echo')` with `@Body() dto: EchoDto`, returns dto
- [x] 4.5 Create `apps/api/src/common/validation-proof/validation-proof.module.ts` — register controller

## Phase 5: Testing

- [x] 5.1 Create `apps/api/src/config/env.validation.test.ts` — valid passes; missing `DATABASE_URL` throws; invalid `PORT` throws (~40 lines)
- [x] 5.2 Create `apps/api/src/common/filters/all-exceptions.filter.test.ts` — verify `{ statusCode, message, timestamp, path }` envelope, no stack traces (~30 lines)
- [x] 5.3 Update `packages/db/src/index.test.ts` — test `getPrisma()` returns PrismaClient instance via mocked `@prisma/client` import
- [x] 5.4 Create `apps/api/src/db/db.service.test.ts` — mock `getPrisma` via `vi.mock('@m199/db')`; verify `client` throws before `onModuleInit()`, works after (~35 lines)
- [x] 5.5 Create `apps/api/src/health/health.controller.test.ts` — `Test.createTestingModule` with `ConfigModule.forRoot`, verify 200 shape, zero DB deps (~25 lines)
- [x] 5.6 Create `apps/api/src/common/validation-proof/echo.controller.test.ts` — invalid body → 400 with `message` array from ValidationPipe (~20 lines)

## Phase 6: Corrective (Post-Verify Fixes)

- [x] 6.1 Add `apps/api/src/app.module.test.ts` — AppModule compile/bootstrap test covering BF-01 (valid bootstrap), BF-02 (import-order: missing DATABASE_URL fails before @m199/db resolves), BF-06 (AppModule compile)
- [x] 6.2 Remove static `@m199/db` import in `apps/api/src/db/db.service.test.ts` — replace with `vi.hoisted` + `getPrismaMock` pattern, keeping runtime source invariant (zero static `@m199/db` imports in `apps/api/`)
- [x] 6.3 Align `apps/api/src/health/health.controller.test.ts` — maintain direct instantiation with documented deviation; NestJS v11 DI does not resolve `ConfigService` via `useValue`/`useMocker` without full `ConfigModule.forRoot`
- [x] 6.4 Remove stale Slice 1 stub comments in `validation-proof.module.ts`, `echo.controller.ts`, and `app.module.ts`
- [x] 6.5 Add `apps/api/src/main.test.ts` — BF-01 runtime bootstrap test: mocks `NestFactory.create`, exports `bootstrap()` from `main.ts`, guards auto-execution during vitest, asserts `app.listen(3001)` for valid config and no listen on failed create (~55 lines)
