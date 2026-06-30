# Tasks: Bootstrap Monorepo Tooling

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500-900 incl. lockfile |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 workspace/tooling → PR 2 app/db shells |
| Delivery strategy | ask-on-risk (resolved to chained PRs) |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes (resolved)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Root workspace, shared config, env contract | PR 1 | Includes install and root script verification. |
| 2 | `apps/web`, `apps/api`, `packages/db` shells | PR 2 | Depends on PR 1; includes shell/build/Prisma checks. |

## Phase 1: Root Workspace Foundation

- [x] 1.1 Create `package.json` with private workspace metadata, Node/pnpm engines, and root `dev`, `build`, `lint`, `format`, `typecheck`, `test` scripts.
- [x] 1.2 Create `pnpm-workspace.yaml` including `apps/*` and `packages/*`.
- [x] 1.3 Create `tsconfig.base.json` with strict shared TypeScript defaults.
- [x] 1.4 Create `eslint.config.*` and `prettier.config.*` with minimal baseline rules.
- [x] 1.5 Create `.env.example` with `DATABASE_URL` and non-secret app placeholders.

## Phase 2: Package Shells

- [x] 2.1 Create `apps/web/package.json`, `apps/web/tsconfig.json`, and Vite config for a React TypeScript shell.
- [x] 2.2 Create `apps/web/src/*` and `apps/web/index.html` with non-product shell copy only.
- [x] 2.3 Create `apps/api/package.json`, `apps/api/tsconfig.json`, and `apps/api/src/index.ts` as a no-endpoint placeholder.
- [x] 2.4 Create `packages/db/package.json` with Prisma validate/generate-ready scripts.
- [x] 2.5 Create `packages/db/prisma.config.ts` using `dotenv` config, Prisma `defineConfig`, `env('DATABASE_URL')`, and `prisma/schema.prisma`.
- [x] 2.6 Modify `packages/db/prisma/schema.prisma` only if needed to preserve provider-only datasource; do not add migrations or seed data.

## Phase 3: Verification

- [x] 3.1 Run `pnpm install` from repo root and confirm all workspace packages install.
- [x] 3.2 Run root `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; record actionable failures only.
- [x] 3.3 Verify `packages/db/prisma.config.ts` loads env explicitly and Prisma validation uses `.env.example` contract without requiring secrets.
- [x] 3.4 Sanity-check `apps/web` build/dev shell remains non-product and contains no routes, auth, admin screens, uploads, API calls, migrations, or seed data.

## Phase 4: Cleanup

- [x] 4.1 Review generated files and lockfile for accidental product behavior or unnecessary scaffold noise.
- [x] 4.2 Update this `openspec/changes/bootstrap-monorepo-tooling/tasks.md` checklist as tasks complete.
