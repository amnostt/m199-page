# Proposal: Compose-Only Database Operational Foundation

## Intent

Replace the manual local PostgreSQL assumption with a fast, persistent Docker Compose workflow operated through root `pnpm` scripts, so the team can run Prisma migrations/client generation consistently during daily development.

## Scope

### In Scope
- Add a local/dev PostgreSQL Compose service with persistent storage.
- Add root `pnpm` scripts for database up/down/reset/status-style workflow.
- Update `.env.example` and minimal docs for the official pnpm-first workflow.
- Keep Prisma ownership in `packages/db` and host-run app/runtime commands unchanged.

### Out of Scope
- Separate test database, compose test profiles, CI database provisioning, API/web containers.
- Seed data or seed workflow; this is the next follow-up slice.
- Product endpoints, auth flows, production deployment, or domain model expansion.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `mvp-technical-foundation`: Change the local/dev PostgreSQL environment contract from manual setup to Docker Compose + root pnpm scripts while preserving Prisma/package boundaries and no-product-feature exclusions.

## Approach

Use a Compose-only database service: PostgreSQL runs in Docker with a named volume and stable localhost port; API/web/Prisma commands still run on the host. Root scripts become the documented interface, avoiding normal use of raw Docker or Prisma commands. Existing manual PostgreSQL foundation remains historical context, not the current recommended workflow.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `compose.yml` or `docker-compose.yml` | New | Local/dev PostgreSQL service, env, port, volume. |
| `package.json` | Modified | Root `pnpm db:*` operational scripts. |
| `.env.example` | Modified | Docker-backed `DATABASE_URL` defaults and notes. |
| `docs/technical-foundation.md` | Modified | Minimal official pnpm workflow documentation. |
| `packages/db/prisma.config.ts` | Modified | Only if env/command assumptions require alignment. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Port conflict with local PostgreSQL | Med | Document the default port and override path. |
| Data loss from reset script | Med | Make destructive script naming explicit. |
| Workflow scope creep | Med | Exclude app containers, test DB, and seed workflow. |

## Rollback Plan

Remove the Compose file and root `db:*` scripts, restore `.env.example`/docs to the manual PostgreSQL workflow, and leave Prisma schema/migrations untouched. Local Docker volumes can be deleted manually if needed.

## Dependencies

- Docker runtime with Compose support.
- Existing Prisma 7 configuration and `DATABASE_URL` loading from root `.env`.

## Success Criteria

- [ ] A contributor can start/stop the local database through `pnpm` scripts.
- [ ] Data persists across container restarts until an explicit reset.
- [ ] Prisma migration/client generation works against the Compose database.
- [ ] No test DB or seed data workflow is introduced.
