# Design: Bootstrap Monorepo Tooling

## Technical Approach

Bootstrap the documented monorepo shape with the smallest runnable workspace: root pnpm orchestration, shared TypeScript/tooling config, a Vite React web shell, an API package placeholder, and Prisma package wiring around the existing `packages/db/prisma/schema.prisma`. This satisfies the installable workspace and shared tooling requirements while preserving the MVP exclusions: no screens, routes, auth, migrations, seed data, or production deployment.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| pnpm workspace with `apps/*` and `packages/*` | Matches documented repo boundaries and keeps package discovery explicit. | Use `pnpm-workspace.yaml` and root scripts as the only orchestration layer. |
| Vite React web shell vs. Next.js | Vite is smaller for a baseline shell; Next.js would add routing/deployment opinions too early. | Create `apps/web` as a non-product Vite React + TypeScript shell. |
| Skeletal `apps/api` vs. NestJS scaffold | A NestJS scaffold would inflate line count and imply API behavior. | Create package metadata and empty TypeScript entry/check only; defer NestJS modules. |
| Prisma 7 `prisma.config.ts` vs. schema URL | Prisma 7 config owns env loading; current schema already has provider-only datasource. | Add `packages/db/prisma.config.ts` with `dotenv/config`, `defineConfig`, and `env('DATABASE_URL')`. |
| Minimal tooling vs. CI-ready setup | CI increases review size and configuration choices. | Add local scripts only; defer CI to a later change. |

## Data Flow

```text
Root pnpm scripts
  ├─ filter apps/web ──→ Vite dev/build/typecheck
  ├─ filter apps/api ──→ TypeScript placeholder checks
  └─ filter packages/db ──→ Prisma validate/generate-ready config

apps/web ──future HTTP──> apps/api ──future Prisma──> packages/db
```

No runtime data moves between packages in this change.

## File Changes

| File | Action | Description |
|---|---|---|
| `package.json` | Create | Private workspace metadata, Node/pnpm engines, root `dev`, `build`, `lint`, `format`, `typecheck`, `test` scripts. |
| `pnpm-workspace.yaml` | Create | Include `apps/*` and `packages/*`. |
| `tsconfig.base.json` | Create | Shared strict TypeScript baseline for workspace packages. |
| `eslint.config.*`, `prettier.config.*` | Create | Baseline formatting/lint conventions only. |
| `.env.example` | Create | Document `DATABASE_URL` and app env placeholders without secrets. |
| `apps/web/*` | Create | Minimal Vite React TypeScript shell with package scripts; no product UI. |
| `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/index.ts` | Create | API package placeholder; no endpoints or NestJS modules. |
| `packages/db/package.json` | Create | Prisma package scripts such as validate/generate. |
| `packages/db/prisma.config.ts` | Create | Prisma 7 explicit env loading and schema path. |
| `packages/db/prisma/schema.prisma` | Modify only if required | Keep provider-only datasource; avoid migrations and seed data. |

## Interfaces / Contracts

- Supported runtime: Node compatible with current Vite requirements (`^20.19.0 || >=22.12.0`) and pnpm from the root.
- Root commands MUST exist: `format`, `lint`, `typecheck`, `test`, `build`.
- Workspace package names should be stable and private, e.g. root app plus `@m199/web`, `@m199/api`, `@m199/db`.
- Env contract: `.env.example` declares `DATABASE_URL="postgresql://..."`; actual `.env` remains untracked.
- Prisma config contract: `packages/db/prisma.config.ts` loads env explicitly and points to `prisma/schema.prisma`; no migration path is required until migrations are introduced.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Baseline test command discoverability | Use a no-op/pass-with-no-tests strategy or a tiny smoke test only if needed by the selected runner. |
| Integration | Workspace package wiring | Verify `pnpm install`, root `typecheck`, `lint`, and `build` execute across packages. |
| E2E | Not applicable | No product behavior or routes beyond the Vite shell. |

## Migration / Rollout

No data migration required. Roll out as one reviewable bootstrap slice. Defer CI, NestJS scaffolding, Prisma migrations/client usage, shared package extraction, and product UI/API behavior to later SDD changes to protect the 400-line review budget.

## Open Questions

- [ ] Should implementation pin exact package versions immediately, or allow the package manager to resolve current compatible releases during bootstrap?
