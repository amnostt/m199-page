# Tasks: Compose-Only Database Operational Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 55–85 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full Compose DB operational foundation | Single PR | ~60 lines across 4 files; all phases fit within budget |

## Phase 1: Infrastructure Foundation

- [x] 1.1 Create `compose.yml` with PostgreSQL 16 service (`db` container, host port `5432`, user/password/database all `m199`, named volume `m199_postgres_data`). No seed, test DB, or app containers.
- [x] 1.2 Update `.env.example`: replace manual PostgreSQL prerequisite paragraph with Docker Compose workflow; set `DATABASE_URL=postgresql://m199:m199@localhost:5432/m199?schema=public`; document that data persists until `pnpm db:reset`.

## Phase 2: Root Scripts

- [x] 2.1 Add root `package.json` scripts: `db:up` (`docker compose up -d db`), `db:down` (`docker compose down`), `db:reset` (`docker compose down -v && docker compose up -d db`), `db:status` (`docker compose ps db`).

## Phase 3: Documentation

- [x] 3.1 Update `docs/technical-foundation.md` Database Operational Foundation section: replace manual PostgreSQL prerequisite with root `pnpm db:*` as official workflow; keep Prisma host-run commands under `packages/db`; note reset destroys local data.

## Phase 4: Integration Verification

Map to spec scenarios. Run with Docker available.

- [x] 4.1 Start: `pnpm db:up` → verify PostgreSQL reachable at `postgresql://m199:m199@localhost:5432/m199` (spec: Database starts through pnpm).
- [x] 4.2 Persistence: stop with `pnpm db:down`, restart with `pnpm db:up` → verify prior data intact (spec: Data survives restart).
- [x] 4.3 Status: `pnpm db:status` → reports container state (spec: Database lifecycle commands are discoverable).
- [x] 4.4 Reset: `pnpm db:reset` → destroys volume, recreates service, data is gone (spec: Env and docs are discoverable — reset behavior documented).
- [x] 4.5 Migration: `pnpm --filter @m199/db db:migrate:dev` against Compose URL → inspect `packages/db/prisma/migrations/` for versioned SQL (spec: First migration applied locally, Migration history preserved).
- [x] 4.6 Client gen: `pnpm --filter @m199/db db:generate` → regenerates Prisma Client successfully (spec: Scaffolding allowed).
- [x] 4.7 Baseline: `pnpm install && pnpm test && pnpm typecheck` from clean checkout with Docker → all pass (spec: Fresh install, Complete validation pass).
- [x] 4.8 Exclusion audit: inspect files — no seed workflow, test DB, API/web containers, or product features introduced (spec: Exclusion stays out of scope, Product behavior absent).
