# Delta for mvp-technical-foundation

## MODIFIED Requirements

### Requirement: MVP Exclusions

The foundation MUST NOT implement advanced roles, social login, password recovery, public search, dark mode, presenter mode, embedded images, product UI, auth flows, uploads, product endpoints, production deployment, or product seed data. It MAY include local/dev migrations, operational scaffolding, Prisma Client generation, runtime shells (including NestJS API bootstrap with an operational health endpoint), and workspace tooling.
(Previously: permitted generic runtime shells; now explicitly names NestJS API scaffolding.)

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Exclusion stays out of scope | An excluded feature appears | It is reviewed | Marked deferred, no implementation reqs |
| Scaffolding allowed | This change is applied | Files are inspected | Migrations, Prisma generation, shells present; no product features/endpoints/auth; NestJS API health-only scaffolding present |

### Requirement: Installable Workspace Baseline

The technical foundation MUST provide an installable monorepo baseline for `apps/web`, `apps/api`, and `packages/db` with operational database scaffolding and runtime API foundation, without product behavior.
(Previously: baseline described operational DB scaffolding without explicitly mentioning runtime API.)

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Fresh install | Clean checkout, Node+pnpm | Dependencies installed from root | All app/package shells install successfully |
| Product behavior absent | Workspace baseline reviewed | Web, api, db outputs inspected | No admin screens, public flows, auth, product endpoints, uploads, seed data; migrations+Prisma gen present; NestJS API with health-only endpoint present as scaffolding |
