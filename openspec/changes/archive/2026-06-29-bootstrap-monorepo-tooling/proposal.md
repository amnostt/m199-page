# Proposal: Bootstrap Monorepo Tooling

## Intent

Create the first runnable Misión 1-99 MVP workspace so future feature work is not built on ad hoc scripts. The repo already documents `apps/web`, `apps/api`, and `packages/db`; this change turns that plan into a small installable baseline without implementing product behavior.

## Scope

### In Scope
- Root pnpm workspace and package metadata targeting current Node LTS.
- Empty package shells for `apps/web`, `apps/api`, and `packages/db`.
- Vite React shell under `apps/web`.
- Shared TypeScript, lint, format, and basic test script conventions.
- Prisma package wiring, including `packages/db/prisma.config.ts` for explicit env loading.
- `.env.example` for local development variables.

### Out of Scope
- Admin/public feature screens, API endpoints, auth, uploads, migrations, and CI polish.
- `packages/shared` unless duplication appears later.
- Production deployment, database provisioning, or real seed data.

## Capabilities

### New Capabilities
- None. This is tooling/runtime bootstrap, not a new product capability.

### Modified Capabilities
- `mvp-technical-foundation`: update the technical baseline from documentation-only planning to an installable monorepo skeleton; no product behavior requirements change.

## Approach

Use the minimal workspace bootstrap from exploration: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`; root scripts orchestrate install, lint, format, typecheck, test, and build; `apps/web` starts as Vite React. Keep `apps/api` skeletal and defer NestJS module implementation. Wire `packages/db` around the existing Prisma schema and add Prisma 7-compatible config/env loading.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json`, `pnpm-workspace.yaml` | New | Workspace metadata and scripts. |
| `apps/web` | New | Vite React app shell. |
| `apps/api` | New | API package placeholder only. |
| `packages/db` | Modified | Prisma package config and scripts. |
| config files | New | TypeScript, ESLint, Prettier, test baseline. |
| `.env.example` | New | Local env contract. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Review exceeds 400 lines | Med | Keep CI and feature code out. |
| Prisma env loading breaks | Med | Add explicit `prisma.config.ts`. |
| Tooling choices overreach | Low | Use minimal scripts and defer polish. |

## Rollback Plan

Revert this change folder and all new workspace/app/config files. Existing docs and Prisma schema remain valid as planning artifacts.

## Dependencies

- pnpm workspace support.
- Current Node LTS compatible with Vite’s documented Node engine requirement.

## Success Criteria

- [ ] Fresh install succeeds with pnpm.
- [ ] Root scripts for lint, format, typecheck, test, and build exist and run against empty shells.
- [ ] `apps/web` starts as a Vite React shell.
- [ ] No product behavior is implemented.
