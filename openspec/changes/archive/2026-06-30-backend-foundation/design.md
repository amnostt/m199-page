# Design: Backend Foundation

## Technical Approach

Thin NestJS API over Express. `ConfigModule.forRoot({ validate })` validates env FIRST. `DbService.onModuleInit()` uses `await import('@m199/db')` — **zero static `@m199/db` imports in `apps/api/`**, satisfying BF-01/BF-02. Global `ValidationPipe` (backed by `class-validator`/`class-transformer`) and `APP_FILTER`-registered `AllExceptionsFilter` define the error contract. A minimal `ValidationProofModule` proves the pipe with an internal DTO + echo controller — no product behavior. `GET /health` reports readiness, no DB access.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| DB import isolation (BF-02) | Static factory vs `await import()` in `onModuleInit()` | Static `import` resolves `@m199/db` at module-load (violates BF-02). Dynamic `await import('@m199/db')` defers until AFTER ConfigModule validation. | `await import('@m199/db')` in `onModuleInit()` — no static `@m199/db` in `apps/api/` |
| `@m199/db` export | Eager singleton vs async factory | Eager reads `DATABASE_URL` at import time. Factory uses dynamic `import('@prisma/client')` — resolution deferred. | Async `getPrisma()` factory |
| HTTP adapter | Express vs Fastify | Fastify needs extra adapter. Express is NestJS default. | Express (default) |
| Config validation | Joi vs custom `validate()` | Joi adds dep. Custom ~25 lines covers required keys. | Custom `validate()` |
| Health check | Terminus vs custom | Terminus adds dep. Custom reports uptime+env per BF-05. | Custom `HealthController` |
| Error envelope | Built-in vs custom `AllExceptionsFilter` | Built-in leaks internals. Custom normalizes to `{ statusCode, message, timestamp, path }`. | Custom `AllExceptionsFilter` |
| Filter registration | `useGlobalFilters()` vs `APP_FILTER` | `useGlobalFilters()` excludes filter from DI. `APP_FILTER` makes it injectable in `@nestjs/testing`. | `APP_FILTER` provider in AppModule |
| Validation deps | Defer vs install now | Deferring `class-validator` means `ValidationPipe` can't prove itself. Install now with scope-locked proof. | Install `class-validator` + `class-transformer` now |

## Data Flow

```
main.ts → bootstrap()
  ├─ ConfigModule.forRoot({ validate })   ← sync, FIRST
  ├─ AppModule resolves APP_FILTER (DI)
  ├─ useGlobalPipes(new ValidationPipe())
  ├─ DbService.onModuleInit()             ← AFTER config
  │    └─ await import('@m199/db') → getPrisma() → import('@prisma/client')
  └─ app.listen(port)
```

## File Changes

| File | Action |
|------|--------|
| `apps/api/package.json` | Modify — Add NestJS deps + `class-validator`, `class-transformer`, `@nestjs/testing` |
| `apps/api/tsconfig.json` | Modify — Add `experimentalDecorators`, `emitDecoratorMetadata` |
| `apps/api/src/main.ts` | Create — Bootstrap, global pipe, listen |
| `apps/api/src/app.module.ts` | Create — `ConfigModule`, `DbModule`, `HealthModule`, `ValidationProofModule`, `APP_FILTER` provider |
| `apps/api/src/config/env.validation.ts` | Create — Sync validate `NODE_ENV`, `PORT`, `DATABASE_URL` |
| `apps/api/src/config/env.interface.ts` | Create — `EnvConfig` type |
| `apps/api/src/common/filters/all-exceptions.filter.ts` | Create — Normalize all errors, no stack traces |
| `apps/api/src/common/validation-proof/` | Create — `EchoDto`, `EchoController`, module (internal proof only) |
| `apps/api/src/db/db.module.ts` | Create — `@Global()` module for `DbService` |
| `apps/api/src/db/db.service.ts` | Create — `onModuleInit()` `await import('@m199/db')`; guarded `client` getter |
| `apps/api/src/health/` | Create — Module + controller; `GET /health` no DB |
| `apps/api/src/index.ts` | Delete |
| `apps/api/src/index.test.ts` | Delete |
| `packages/db/src/index.ts` | Modify — Replace eager singleton with async `getPrisma()` using dynamic `import('@prisma/client')` |
| `packages/db/src/index.test.ts` | Modify — Test factory contract |
| `.env.example` | Modify — Add `NODE_ENV`, `PORT` |
| `apps/api/src/config/env.validation.test.ts` | Create — ~40 lines vitest |
| `apps/api/src/health/health.controller.test.ts` | Create — ~25 lines `@nestjs/testing` |
| `apps/api/src/db/db.service.test.ts` | Create — ~35 lines mocked `getPrisma` |
| `apps/api/src/common/filters/all-exceptions.filter.test.ts` | Create — ~30 lines `APP_FILTER` override |
| `apps/api/src/common/validation-proof/echo.controller.test.ts` | Create — ~20 lines ValidationPipe 400 shape |

## Interfaces / Contracts

```typescript
// DbService — BF-02 core contract (no static @m199/db import)
@Injectable()
export class DbService implements OnModuleInit {
  private _client?: PrismaClient;
  async onModuleInit() {
    const { getPrisma } = await import('@m199/db');
    this._client = await getPrisma();
  }
  get client(): PrismaClient; // throws if !_client
}

// @m199/db — revised export (no static @prisma/client import)
export async function getPrisma(): Promise<PrismaClient>;

// EchoDto — internal validation proof only
export class EchoDto { @IsString() message: string; }
```

## Testing Strategy

| Layer | What | Approach | Lines |
|-------|------|----------|-------|
| Unit | Config validation | Plain vitest `validate()` | ~40 |
| Unit | HealthController shape | `Test.createTestingModule` | ~25 |
| Unit | DbService init guard | Mocked `getPrisma` | ~35 |
| Unit | AllExceptionsFilter envelope | `APP_FILTER` override | ~30 |
| Integration | ValidationPipe + DTO | EchoController, invalid body → 400 | ~20 |

Total: ~150 lines. All `@nestjs/testing` + vitest — no `supertest`.

## Review Budget Risk

Estimated **~370–420 lines** total. Medium risk against 400-line budget.

**Task-slicing expectation** for `sdd-tasks`: split into 2 PR slices:
1. **Slice 1**: Bootstrap, config, filter, `.env.example`, delete placeholders + tests (~230 lines).
2. **Slice 2**: DB boundary refactor, health, validation proof + tests (~170 lines).

## Migration / Rollout

None. Rollback: revert changed files, `pnpm install`.

## Open Questions

- [ ] `useDefineForClassFields: true` with NestJS decorators — verify at apply time.
- [ ] `@nestjs/testing` mock patterns with vitest — verify at apply time.
