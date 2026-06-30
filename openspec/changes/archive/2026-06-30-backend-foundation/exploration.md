# Exploration: backend-foundation

### Current State
`apps/api` is still a placeholder shell: it exports a version constant, has a smoke test, and imports `@m199/db` only as a type-boundary proof. There are no NestJS dependencies, no modules, no config/env layer, no validation pipes, no exception filters, and no health endpoint yet.

`@m199/db` already owns Prisma client construction, but it reads `process.env.DATABASE_URL` during module import. `packages/db/prisma.config.ts` loads the root `.env` for Prisma CLI workflows, not for API runtime bootstrap, so API startup must ensure env loading happens before any runtime import path touches `@m199/db`.

The roadmap and technical foundation both expect NestJS for Step 3, so the real gap is not “whether to build a backend foundation,” but “how much of NestJS to land in the first slice.”

### Affected Areas
- `docs/development-roadmap.md` — Step 3 scope/exit criteria.
- `docs/technical-foundation.md` — planned API architecture and module boundary expectations.
- `apps/api/package.json` — currently only TypeScript/Vitest and `@m199/db`.
- `apps/api/src/index.ts` — placeholder entrypoint and import boundary proof.
- `apps/api/src/index.test.ts` — only a smoke test exists.
- `apps/api/tsconfig.json` / `apps/api/vitest.config.ts` — current baseline tooling.
- `packages/db/src/index.ts` — runtime Prisma client creation timing.
- `packages/db/prisma.config.ts` — Prisma CLI env loading only.
- `.env.example` — current env contract.
- `openspec/changes/backend-foundation/` — this exploration/change folder.

### Approaches
1. **Introduce NestJS now** — add the real API foundation: `AppModule`, global config/env loading, validation, exception handling, a thin Prisma service boundary over `@m199/db`, and a `/health` endpoint.
   - Pros: matches the roadmap/technical foundation, avoids a second bootstrap later, gives future auth/product modules a stable framework.
   - Cons: adds dependencies and framework boilerplate, more moving parts in the first slice.
   - Effort: Medium

2. **Build a lighter pre-Nest foundation** — add app-level env/config helpers, custom validation/error utilities, and a simple health route first; defer NestJS until later.
   - Pros: smallest initial diff, fastest path to “something running.”
   - Cons: creates temporary architecture debt, duplicates work when NestJS arrives, and drifts from the roadmap’s stated API direction.
   - Effort: Low/Medium

### Recommendation
Use **NestJS now**, but keep the first slice intentionally thin: framework bootstrap, global env/config validation, a consistent validation/error envelope, `@m199/db` integration through a dedicated service/provider, and a minimal `/health` check.

Non-goals for slice 1: auth, product modules, CRUD endpoints, file uploads, session logic, detailed business DTO catalogs, and production deployment concerns.

### Risks
- `@m199/db` imports can fail early if `DATABASE_URL` is not loaded before runtime bootstrap.
- Health-check scope is still undecided: app liveliness only vs DB connectivity too; the first slice should keep it narrow.
- Validation/error-shape standardization can expand fast; over-design here risks blowing the 400-line review budget.
- Current API tests are only smoke tests, so Nest integration coverage must stay focused or the slice grows too large.

### Ready for Proposal
Yes — move to `sdd-propose` with a narrow NestJS-first backend foundation proposal and explicit non-goals for auth/product work.
