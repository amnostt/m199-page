# Design: Compose-Only Database Operational Foundation

## Technical Approach

Add a repository-root Compose PostgreSQL service as the only local/dev database runtime while keeping all application and Prisma commands host-run. Root `pnpm db:*` scripts become the official lifecycle interface. `packages/db` continues to own Prisma schema, config, migrations, and client generation; this change only aligns its existing `DATABASE_URL` contract with the Compose-backed defaults.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Root `compose.yml` with only PostgreSQL | Smallest Docker surface; contributors still need host Node/pnpm | **Chosen** — matches scope and avoids API/web container creep |
| API/web containers in Compose | More production-like, but expands runtime ownership | **Rejected** — explicitly out of scope |
| Named volume for Postgres data | Data persists until destructive reset; reset needs clear warning | **Chosen** — required by spec and supports daily dev continuity |
| Anonymous or test database service | Could isolate tests, but adds profile/CI semantics | **Rejected** — no separate test DB, test profile, or CI DB provisioning |
| Root scripts wrap Compose | One official interface to document and verify | **Chosen** — avoids asking contributors to memorize raw Docker commands |
| Modify Prisma package ownership | Could centralize all db commands at root only | **Rejected** — `packages/db` already owns Prisma; root scripts should manage service lifecycle only |

## Data Flow

```text
pnpm db:up ──► docker compose up -d db
                         │
                         ▼
              PostgreSQL container :5432
                         │
                         ▼
        named volume m199_postgres_data

.env DATABASE_URL ──► packages/db/prisma.config.ts ──► host-run Prisma commands
apps/api host runtime ──► @m199/db getPrisma() ──► localhost PostgreSQL
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `compose.yml` | Create | Define one local/dev `db` PostgreSQL service, stable localhost port, env defaults, and persistent named volume. |
| `package.json` | Modify | Add root `db:up`, `db:down`, `db:reset`, and `db:status` scripts wrapping Docker Compose. Keep existing quality scripts unchanged. |
| `.env.example` | Modify | Replace manual PostgreSQL setup with Docker-backed defaults matching Compose credentials/database/port; document persistence and reset behavior. |
| `docs/technical-foundation.md` | Modify | Update Database Operational Foundation section to make root `pnpm db:*` the official workflow and keep Prisma commands host-run. |
| `packages/db/prisma.config.ts` | No change expected | Existing root `.env` loading and `DATABASE_URL` ownership already match the intended Compose contract. Modify only if implementation finds a path mismatch. |

## Interfaces / Contracts

Root database lifecycle contract:

```jsonc
{
  "scripts": {
    "db:up": "docker compose up -d db",
    "db:down": "docker compose down",
    "db:reset": "docker compose down -v && docker compose up -d db",
    "db:status": "docker compose ps db"
  }
}
```

Environment contract:

```env
DATABASE_URL="postgresql://m199:m199@localhost:5432/m199?schema=public"
```

Compose contract: service name `db`, PostgreSQL image scoped to local/dev, host port `5432`, database/user/password matching `.env.example`, named volume such as `m199_postgres_data`. No seed command, test DB, app containers, or product endpoints.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Existing package behavior remains intact | Run `pnpm test`; no new DB-coupled unit tests. |
| Integration | Compose lifecycle and persistence | Manually verify `pnpm db:up`, `pnpm db:status`, `pnpm db:down`; create/apply migrations from `packages/db` against the Compose URL. |
| Destructive workflow | Reset removes persisted local data only when explicit | Verify `pnpm db:reset` recreates the service and volume; docs warn about data loss. |
| E2E | Not applicable | No product flow or browser/API container behavior is introduced. |

## Migration / Rollout

No production migration required. Existing Prisma migrations remain owned by `packages/db` and are not changed for this operational slice. Rollout is documentation-first: contributors copy `.env.example`, run `pnpm db:up`, then run existing host Prisma commands as needed. Rollback removes `compose.yml` and root db scripts, restores manual PostgreSQL docs/env guidance, and optionally deletes the local Docker volume.

## Open Questions

- [ ] Should `db:down` stop containers only, or also remove the network? The design uses `docker compose down` while preserving the named volume.
