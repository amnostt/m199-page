# Configurable Database Host Port

## Objective

Allow this workspace's local PostgreSQL container to publish on a configurable host port without weakening destructive database safeguards.

## Problem

The local Compose service, example connection URL, and reset safety guard assume host port `5432`, which conflicts with other local projects.

## Why

Developers need to run multiple Docker-based projects concurrently while preserving a safe, predictable local database workflow.

## Scope

- Parameterize the PostgreSQL host port in `compose.yml`.
- Document the environment variable and keep `DATABASE_URL` aligned.
- Update the local database safety guard and its focused tests.
- Preserve PostgreSQL's container port `5432` and all existing credentials/database-name checks.

## Constraints

- Do not read or modify the local `.env` file.
- Do not run destructive database reset commands.
- Do not weaken local-host, username, password, or database validation.
- Preserve unrelated worktree changes.

## Authorized Scope

- `compose.yml`
- `.env.example`
- `packages/db/src/local-database.ts`
- Focused tests for local database URL validation
- `scripts/db-reset.ts`
- `scripts/db-reset.test.ts`
- This task document

## TDD Mode

- Mode: disabled
- Source: Engram testing capabilities, explicitly disabled by the maintainer on 2026-07-22
- Runner: `pnpm --filter @m199/db test`
- Policy: ordinary focused tests and functional checks remain required

## Tasks

- [x] DBPORT-1 Parameterize the Compose host port with a documented default.
- [x] DBPORT-2 Keep the example connection contract and reset safety guard aligned with the configured host port.
- [x] DBPORT-3 Add focused coverage and run applicable configuration, test, type, format, and diff checks.

## Acceptance Criteria

- Compose publishes `${POSTGRES_HOST_PORT}` to container port `5432`, with a stable local default.
- `.env.example` documents the port and its matching `DATABASE_URL`.
- `pnpm db:reset` validates the configured host port while retaining every other safety invariant.
- Focused tests cover the default, configured-port success, and mismatched-port rejection paths.
- No destructive reset is executed during verification.

## Applicable Checks

- `docker compose config`
- `pnpm --filter @m199/db test`
- `pnpm --filter @m199/db typecheck`
- `pnpm format:check`
- `git diff --check`

## Progress

DBPORT-1 complete: Compose now publishes PostgreSQL on
`${POSTGRES_HOST_PORT:-5433}` while retaining container port `5432`.

DBPORT-2 complete: `.env.example` uses the same `5433` default, and the reset
guard compares `DATABASE_URL` against the configured host port while retaining
the existing host, credential, and database checks.

DBPORT-3 complete: focused tests cover the default port, a configured port, and
a mismatched port. Required checks were attempted; sandbox limitations and
equivalent successful checks are recorded below.

One bounded correction round tightened configured-port validation to decimal
integers in the range `1..65535`, added `.env` fallback coverage, and propagated
the resolved port to every reset subprocess so the seed guard receives the same
expected port as the initial reset guard.

## Verification Evidence

- `docker compose config`: unavailable in this execution environment
  (`operation not permitted`, exit 127), including after approval.
- `pnpm --filter @m199/db test`: pnpm lifecycle spawning unavailable
  (`spawn EPERM`); equivalent `pnpm --dir packages/db exec vitest run` passed
  all 62 tests across 8 files after the correction.
- Focused reset/guard suite passed 21 tests across 2 files:

  ```sh
  pnpm exec vitest run scripts/db-reset.test.ts packages/db/src/local-database.test.ts
  ```

- `pnpm --filter @m199/db typecheck`: pnpm lifecycle spawning unavailable
  (`spawn EPERM`); equivalent `pnpm --dir packages/db exec tsc --noEmit`
  passed.
- `pnpm format:check`: pnpm lifecycle spawning unavailable (`spawn EPERM`);
  equivalent `pnpm exec prettier --check .` passed.
- `git diff --check`: passed.
- Complete diff inspected: no secrets, generated files, or out-of-scope files
  were added.

## Next Step

Run `docker compose config` in an environment that permits Docker CLI execution,
then copy `POSTGRES_HOST_PORT=5433` and the aligned `DATABASE_URL` into the local
`.env` (or choose another matching free port).
