# Proposal: Backend Foundation

## Intent

Replace the API placeholder with a thin NestJS-first foundation that future auth and product modules can extend without reworking bootstrap, config, validation, error handling, or database access boundaries.

## Scope

### In Scope
- Add NestJS runtime dependencies and bootstrap entry using `NestFactory` and `AppModule`.
- Load and validate API env/config before any runtime import path touches `@m199/db`.
- Define global validation and error-response shape for future controllers.
- Add a dedicated DB provider/service boundary that consumes `@m199/db` without moving Prisma ownership into `apps/api`.
- Add minimal `/health` endpoint for process/config readiness only; no DB ping unless it stays dependency-light.
- Add focused tests for bootstrap wiring, health controller/service behavior, config validation, and DB provider boundaries.

### Out of Scope
- Auth, sessions, product CRUD/modules, uploads, business DTO catalogs, production deployment, DB migrations/seeds.
- Product endpoints beyond `/health`.

## Capabilities

### New Capabilities
- `backend-api-foundation`: NestJS API bootstrap, config readiness, validation/error conventions, DB boundary, and health endpoint.

### Modified Capabilities
- `mvp-technical-foundation`: Updates API baseline from placeholder shell to allowed runtime scaffolding while preserving product-feature exclusions.

## Approach

Use the exploration recommendation: introduce NestJS now, but keep the slice intentionally thin. Bootstrap config first, then compose `AppModule`, global validation/error handling, a DB service/provider over `@m199/db`, and a minimal health controller. Tests should prove framework wiring without introducing product modules.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/package.json` | Modified | Add NestJS/config/test dependencies and scripts if needed. |
| `apps/api/src/` | Modified | Replace placeholder with `main`, `AppModule`, config, health, error/validation, DB boundary. |
| `packages/db/src/index.ts` | Modified | Only if needed to avoid early env reads before API config loading. |
| `.env.example` | Modified | Document API runtime env contract. |
| `openspec/specs/` | Modified/New | Add backend foundation capability and update MVP foundation expectations. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `@m199/db` reads `DATABASE_URL` too early | High | Ensure env validation precedes DB imports; adjust DB export boundary only if needed. |
| Error/validation shape over-expands | Med | Define minimal envelope only; defer business DTO catalogs. |
| Health endpoint becomes integration scope creep | Med | Default to process/config readiness; defer DB readiness checks. |

## Rollback Plan

Revert the API package changes and proposal/spec deltas, restoring `apps/api/src/index.ts` and its smoke test placeholder. No migrations, product data, or external deployment state are introduced.

## Dependencies

- NestJS core/platform packages and config/validation support.
- Existing `@m199/db` package boundary and `DATABASE_URL` env contract.

## Success Criteria

- [ ] API boots through NestJS with validated config before DB access.
- [ ] `/health` reports process/config readiness only.
- [ ] Global validation/error shape is present and covered by focused tests.
- [ ] DB access is exposed through an API provider/service boundary over `@m199/db`.
- [ ] No auth, product modules, uploads, sessions, migrations, seeds, or deployment work is introduced.
