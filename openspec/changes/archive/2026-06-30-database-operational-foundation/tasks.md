# Tasks: Database Operational Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200–350 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full DB operational foundation | PR 1 | Under 400-line budget; auto-generated migration SQL is ~100–250 lines |

## Phase 1: Environment Contract & Documentation

- [x] 1.1 Update `.env.example`: add PostgreSQL 16+ prerequisite comment above `DATABASE_URL` line; keep existing URL template
- [x] 1.2 Add "Database Operational Foundation" section to `docs/technical-foundation.md`: PostgreSQL 16+ prerequisite, `DATABASE_URL` config via `.env.example`, `pnpm` migration/generate/validate commands, `@m199/db` package boundary
- [x] 1.3 Update `docs/technical-foundation.md` MVP Exclusions: remove "migrations, Prisma config, generated Prisma client" from excluded list; these are now operational scaffolding
- [x] 1.4 Update `docs/technical-foundation.md` Acceptance Checklist: add migration workflow and client generation verification items

## Phase 2: Database Package Core

- [x] 2.1 Modify `packages/db/package.json`: add `@prisma/client: "^7.5.0"` to `dependencies`; add scripts `db:migrate:dev`, `db:migrate:deploy`, `db:generate`; add `"exports": { ".": "./src/index.ts" }`
- [x] 2.2 Modify `packages/db/prisma.config.ts`: add `migrations: { path: 'prisma/migrations' }` to `defineConfig`; update JSDoc to reflect migrations are now enabled
- [x] 2.3 Modify `packages/db/src/index.ts`: import `PrismaClient` from `@prisma/client`, instantiate and export `prisma` singleton, keep existing `DB_PACKAGE_VERSION` export

## Phase 3: Migration History

- [x] 3.1 Run `pnpm --filter @m199/db db:migrate:dev` to generate and apply first migration from hardened schema; verify generated SQL appears under `packages/db/prisma/migrations/`
- [x] 3.2 Verify migration history: `packages/db/prisma/migrations/` contains versioned SQL directory with `migration.sql`

## Phase 4: API Integration & Verification

- [x] 4.1 Modify `apps/api/package.json`: add `"@m199/db": "workspace:*"` to `dependencies`
- [x] 4.2 Modify `apps/api/src/index.ts`: add `import { prisma } from '@m199/db'` with `void prisma` type-boundary proof; keep existing `API_PACKAGE_VERSION` export
- [x] 4.3 Update `packages/db/src/index.test.ts`: add vitest assertion that `prisma` export is truthy (type-only boundary — no live DB required for unit test)
- [x] 4.4 Run verification sequence: `pnpm install`, `pnpm --filter @m199/db db:validate`, `pnpm --filter @m199/db db:generate`, `pnpm --filter @m199/api typecheck`, `pnpm test`

**Gate**: `.env.example` is a documented template, not a runtime source. Prisma 7 reads `DATABASE_URL` via `prisma.config.ts` dotenv loading from `.env` (copy of `.env.example`). Migration/generate commands require `.env` to exist with a real PostgreSQL connection string.
