# Proposal: Database Operational Foundation

## Intent

Finish roadmap Step 2 by turning the hardened Prisma schema into a local/dev PostgreSQL workflow that contributors can migrate, generate, and type-check before backend feature work begins.

## Scope

### In Scope
- Define the local/dev PostgreSQL contract in `.env.example` and docs.
- Add a first Prisma migration workflow under `packages/db` without changing domain intent.
- Add Prisma Client generation owned by `packages/db` and consumed by `apps/api` only through an explicit package boundary.
- Decide on minimal seed scaffolding only if it proves migrations/client wiring; no product content.

### Out of Scope
- API endpoints, auth flows, NestJS/Express modules, upload handling, product seed data, production provisioning, Docker/dev containers, CI deployment, and runtime feature behavior.
- Expanding the schema beyond the already-hardened MVP model.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `mvp-technical-foundation`: Allow operational database scaffolding for local/dev PostgreSQL, migrations, Prisma Client generation, and API package consumption while preserving the no-product-feature boundary.

## Approach

Use the minimal operational foundation from exploration. Keep `packages/db/prisma.config.ts` as the Prisma 7 owner for schema, datasource URL, migrations path, and optional seed command. Add scripts for `prisma migrate dev`, `prisma migrate deploy` readiness, `prisma generate`, validation, and a narrow API typecheck/import smoke path. Prefer `@m199/db` as the ownership boundary so `apps/api` consumes database access through the package instead of owning Prisma config.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.env.example` | Modified | Document required local PostgreSQL URL expectations. |
| `packages/db/prisma.config.ts` | Modified | Add migrations path and optional seed wiring. |
| `packages/db/prisma/migrations/` | New | First migration history for existing schema. |
| `packages/db/package.json` | Modified | Add migrate/generate/seed scripts and client dependencies. |
| `packages/db/src/` | New | Export Prisma Client ownership boundary if needed. |
| `apps/api/*` | Modified | Consume the DB package only as a smoke/type boundary. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Local PostgreSQL setup blocks verification | Med | Document exact env contract and commands; no provisioning promise. |
| Prisma 7 CLI/config mismatch | Med | Keep config-owned URL/migrations/seed behavior aligned with current Prisma docs. |
| Seed scope becomes product data | Med | Permit only operational proof data or omit seed entirely. |
| Backend feature creep | High | Limit API work to import/typecheck smoke consumption. |

## Rollback Plan

Revert `packages/db` script/config/client changes, remove generated migration/seed files, undo API smoke consumption, and restore `.env.example` wording. No production data rollback is required because this targets local/dev only.

## Dependencies

- Local PostgreSQL instance reachable through `DATABASE_URL`.
- Prisma 7 CLI/client packages compatible with the workspace.

## Success Criteria

- [ ] A contributor can configure `.env`, run migration workflow, and generate Prisma Client locally.
- [ ] `apps/api` proves consumption through the agreed `@m199/db` boundary without endpoints or auth logic.
- [ ] Seed is absent or limited to operational scaffolding with no product content.
- [ ] Existing validation/typecheck commands remain green.
