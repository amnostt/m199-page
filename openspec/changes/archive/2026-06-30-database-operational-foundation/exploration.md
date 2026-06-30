# Exploration: database-operational-foundation

### Current State
Step 2 is still only partially operational. The schema is hardened and documented, but `packages/db` is still a design-time package: it has `prisma validate`/`format` scripts, a Prisma 7 `prisma.config.ts` that reads `DATABASE_URL` from the root `.env`, and no migration workflow, client-generation workflow, or seed workflow.

The repo already contains local Postgres connection placeholders in `.env` and `.env.example`, but no actual database provisioning or migration history. `apps/api` and `apps/web` are only smoke-test shells today, so there is no Prisma Client consumption path yet.

### Affected Areas
- `docs/development-roadmap.md` — Step 2 remains the source of truth for scope and exit criteria.
- `packages/db/prisma/schema.prisma` — operational database work must preserve the hardened model.
- `packages/db/prisma.config.ts` — owns Prisma 7 env/schema wiring; may need migration/seed config.
- `packages/db/package.json` — missing generate/migrate/seed scripts and client dependency.
- `apps/api/package.json` / `apps/api/src/*` — eventual Prisma Client consumer path.
- `.env` / `.env.example` — local/dev PostgreSQL contract.
- `openspec/changes/database-operational-foundation/` — new change artifacts.

### Approaches
1. **Minimal operational foundation** — add migration workflow, Prisma Client generation, API consumption path, and an optional tiny seed.
   - Pros: smallest review surface, closes Step 2 directly, keeps local/dev setup simple.
   - Cons: still depends on a manually run local PostgreSQL instance.
   - Effort: Medium

2. **Provisioned dev stack** — add Docker/dev container or scripted local DB provisioning alongside migrations, client generation, and seeds.
   - Pros: more reproducible onboarding and test setup.
   - Cons: larger scope, more moving parts, higher risk of exceeding the 400-line review budget.
   - Effort: High

### Recommendation
Use the **minimal operational foundation**. The next change should make Prisma operational without broad infra work: define the migration path, generate and consume the client from the API boundary, and add only minimal seed data if it materially helps verification or developer onboarding.

### Risks
- Prisma 7 config and CLI expectations around migrations/client/seed need to be aligned explicitly, not assumed.
- It is unclear yet whether the client should be owned by `packages/db` and re-exported, or consumed directly from `@prisma/client` in `apps/api`.
- Local PostgreSQL is documented, but there is no provisioning automation, so setup errors may block verification.
- Seeds can easily become product data instead of operational scaffolding.

### Ready for Proposal
Yes — move to `sdd-propose` with a narrow operational scope: local/dev PostgreSQL contract, migrations, client generation/consumption, and a minimal seed decision.
