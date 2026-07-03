# Exploration: Dockerized local/dev database workflow

### Current State
The workspace already has the core Prisma/PostgreSQL foundation: `pnpm` workspaces, `packages/db` with Prisma 7 config, an existing schema, migration/client scripts, and root `.env.example` documentation that still assumes a manually installed local PostgreSQL 16+ instance. `packages/db/prisma.config.ts` reads `DATABASE_URL` from the root `.env`, and `docs/technical-foundation.md` documents the non-Docker workflow.

There is currently no Docker/Compose file, no DB container scripts, and no separate test-database convention to preserve or extend. The existing `packages/db/vitest.setup.ts` is explicitly hermetic and sets only safe test defaults, so this slice should stay out of test DB provisioning.

### Affected Areas
- `docker-compose.yml` or `compose.yml` — new local/dev PostgreSQL service definition.
- `package.json` — likely root scripts for `db:up`, `db:down`, or `db:reset`.
- `.env.example` — document the Docker-backed `DATABASE_URL` contract and local Postgres defaults.
- `docs/technical-foundation.md` — add Docker workflow instructions; keep the non-Docker path if still valid.
- `packages/db/prisma.config.ts` — likely no functional change unless env loading conventions shift.
- `packages/db/vitest.setup.ts` — should remain test-hermetic; no separate test DB slice here.
- `openspec/changes/database-operational-foundation/` — new SDD artifacts for this Dockerized slice.

### Approaches
1. **Compose-only local DB service** — add a PostgreSQL service plus volume/port mapping; apps still run on the host.
   - Pros: smallest scope, fits the current Prisma/env setup, no app-container complexity.
   - Cons: does not dockerize the API/web runtime.
   - Effort: Low

2. **Full dev stack** — Dockerize database plus API/web runtime in the same slice.
   - Pros: fully reproducible developer environment.
   - Cons: much larger surface, harder to keep under review budget, unnecessary for the stated DB-only goal.
   - Effort: High

### Recommendation
Use the **Compose-only local DB service**. The proposal should cover a PostgreSQL container, persistent volume, startup/shutdown commands, and clear env documentation while keeping app runtime on the host and excluding any separate test database.

### Risks
- Docker host/port mismatches may conflict with the current `localhost`-based `DATABASE_URL` convention.
- If the proposal tries to include API/web containers, scope and review size will expand quickly.
- The existing docs currently describe a manual PostgreSQL install, so they must be reconciled with the Docker workflow.
- The change should not accidentally introduce a test DB convention through compose profiles or extra env files.

### Ready for Proposal
Yes — tell `sdd-propose` to scope this as a Dockerized local/dev PostgreSQL workflow only: compose service, persistent storage, env/docs updates, and no separate test database.
