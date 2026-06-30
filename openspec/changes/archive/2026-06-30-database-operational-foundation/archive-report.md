## Archive Report

**Change**: `database-operational-foundation`
**Archived**: 2026-06-30
**Verdict**: PASS WITH WARNINGS
**Artifact store**: Hybrid (OpenSpec + Engram)

### Executive Summary

Completed the database operational foundation SDD cycle. The change adds Prisma migration workflow, Prisma Client generation, a `@m199/db` package ownership boundary, local/dev PostgreSQL environment contract documentation, and a seed safeguard — all as operational scaffolding under the existing `mvp-technical-foundation` spec. No product features, endpoints, auth flows, or seed data were introduced.

### Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `mvp-technical-foundation` | Updated | 5 ADDED, 3 MODIFIED, 0 REMOVED, 0 RENAMED requirements |

**Added requirements**:
1. Local/Dev PostgreSQL Environment Contract
2. Prisma Migration Workflow
3. Prisma Client Generation
4. Database Package Ownership Boundary
5. Seed Safeguard

**Modified requirements**:
1. MVP Exclusions — now allows local/dev operational DB workflow while excluding production deployment
2. Artifact Validation — now includes DB operational workflow verification
3. Installable Workspace Baseline — now allows local/dev operational DB scaffolding

### Archive Contents

| Artifact | Path | Status |
|----------|------|--------|
| exploration.md | archive/ | ✅ Present |
| proposal.md | archive/ | ✅ Present |
| specs/mvp-technical-foundation/spec.md | archive/ | ✅ Present (delta) |
| design.md | archive/ | ✅ Present |
| tasks.md | archive/ | ✅ Present (13/13 tasks complete) |
| verify-report.md | archive/ | ✅ Present (PASS WITH WARNINGS) |
| archive-report.md | archive/ | ✅ This file |

### Engram Traceability

| Artifact | Engram Observation ID |
|----------|----------------------|
| apply-progress | #183 |
| verify-report | #187 |
| archive-report | (saved with topic_key `sdd/database-operational-foundation/archive-report`) |

### Warnings Preserved (from verify-report)

1. **Review budget exceeded** — mechanical diff (~639 lines) exceeded the 400-line review budget due to auto-generated migration SQL (306 lines) and pnpm-lockfile. Hand-written implementation surface is ~108 lines. Accepted: single-PR delivery was approved during apply gate; reviewers can focus hand-written changes.

2. **Static/docs scenarios lack automated tests** — static/documentation scenarios (env contract discoverability, migration history preservation, seed safeguard, exclusion compliance) were verified by source inspection plus tool execution, not by dedicated automated tests. Accepted: no product runtime behavior was added in this operational-foundation slice.

3. **Negative-path generation failure not forced** — the scenario requiring Prisma Client generation to fail on invalid schema was not destructively forced during verification. Valid-path `db:validate` and `db:generate` passed. Accepted: destructive schema corruption testing is deferred to a future test-hardening change.

### Deviations from Design

- **@prisma/adapter-pg**: Prisma 7 requires a driver adapter. Design listed only `@prisma/client`, `dotenv`, and `prisma` as dependencies. Added `@prisma/adapter-pg` with `PrismaPg` adapter for correct PrismaClient instantiation. Valid adaptation, not scope drift.

- **vitest.setup.ts**: Design's open question about dotenv in vitest was resolved — created setup file loading `.env` for test DATABASE_URL resolution.

- **Migration SQL size**: Forecast estimated ~100-250 lines; actual is 306 lines due to full 12-model schema complexity. Mechanical only.

### Files Changed (from apply-progress)

| File | Action |
|------|--------|
| `.env.example` | Modified — PostgreSQL 16+ prerequisite, `createdb` instructions |
| `docs/technical-foundation.md` | Modified — DB Operational Foundation section, updated exclusions/checklist |
| `packages/db/package.json` | Modified — deps, scripts, `exports` field |
| `packages/db/prisma.config.ts` | Modified — `migrations.path`, updated JSDoc |
| `packages/db/src/index.ts` | Modified — PrismaClient singleton with PrismaPg adapter |
| `packages/db/src/index.test.ts` | Modified — prisma export assertion |
| `packages/db/vitest.config.ts` | Modified — `setupFiles` |
| `packages/db/vitest.setup.ts` | Created — dotenv loader |
| `apps/api/package.json` | Modified — `@m199/db` workspace dep |
| `apps/api/src/index.ts` | Modified — `@m199/db` import type-boundary proof |
| `packages/db/prisma/migrations/` | Created — first migration `20260630160259_initial_migration` |
| `pnpm-lock.yaml` | Modified — lockfile |

### Verification Commands (all passed)

- `pnpm --filter @m199/db db:validate` → Schema valid
- `pnpm --filter @m199/db db:generate` → Prisma Client v7.8.0 generated
- `pnpm --filter @m199/api typecheck` → No errors
- `pnpm test` → 4/4 passed

### SDD Cycle Complete

All 13 tasks complete, all verification commands pass, spec compliance is 15/16 (1 partial, no critical), main spec updated as source of truth, change folder archived with full audit trail. Ready for the next change.
