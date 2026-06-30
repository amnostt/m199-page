# Exploration: bootstrap monorepo/tooling

### Current State
The repo is still doc-first: `docs/technical-foundation.md`, `docs/development-roadmap.md`, and `packages/db/prisma/schema.prisma` exist, but there is no root `package.json`, no workspace definition, no `apps/` tree, no test runner, no linter/formatter, and no CI. The current docs already assume a future monorepo with `apps/web`, `apps/api`, and `packages/db`, so this change is the first real runtime/bootstrap step.

### Affected Areas
- `package.json` — root scripts and workspace orchestration.
- `pnpm-workspace.yaml` — monorepo package boundaries.
- `tsconfig.base.json` (or equivalent) — shared TypeScript baseline.
- `eslint.config.*` / `prettier.config.*` — lint/format conventions.
- `apps/web` — public/admin UI package scaffold.
- `apps/api` — NestJS API scaffold.
- `packages/db` — Prisma package wiring, including `prisma.config.ts` for Prisma 7.
- `.env.example` — shared env contract for local/dev.
- `.github/workflows/ci.yml` — only if CI is included in this slice.

### Approaches
1. **Minimal workspace bootstrap** — create the workspace, base TS/lint/format config, package shells, and root scripts; defer CI polish.
   - Pros: lowest risk, easiest to keep under the 400-line review budget, establishes the first runnable skeleton.
   - Cons: CI and some environment checks remain for the next change.
   - Effort: Medium

2. **Tooling-complete bootstrap** — add workspace, shared configs, env examples, Prisma 7 config, and a basic CI pipeline in the same change.
   - Pros: one-stop foundation, faster path to “install/test/build” on day one.
   - Cons: more moving parts, higher chance of exceeding review budget, more setup decisions must be resolved now.
   - Effort: High

### Recommendation
Use the **minimal workspace bootstrap** and keep the first slice focused on structure + scripts. Recommended shape: `apps/web`, `apps/api`, `packages/db`, and optionally `packages/shared` later if duplication appears. For Prisma 7, plan `packages/db/prisma.config.ts` to own `DATABASE_URL` loading (Prisma 7 does not rely on schema-local URLs), while `schema.prisma` stays provider-only. This gives us a clean monorepo baseline without overcommitting before the first apps exist.

### Risks
- Prisma 7 config will fail if `prisma.config.ts` does not explicitly load env vars.
- Choosing the wrong web framework now (Vite React vs Next.js) could force rework later.
- Adding CI, linting, and testing all at once may push the change over the 400-line review budget.

### Ready for Proposal
Yes — but the orchestrator should first confirm: (1) pnpm is the package manager, (2) the Node version target, and (3) whether `apps/web` should start as Vite React or Next.js.
