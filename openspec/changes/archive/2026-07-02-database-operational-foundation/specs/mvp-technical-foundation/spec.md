# Delta for mvp-technical-foundation

## MODIFIED Requirements

### Requirement: Local/Dev PostgreSQL Environment Contract

The system MUST provide the local/dev PostgreSQL connection contract through Docker Compose with a persistent named volume, root `pnpm` lifecycle scripts, `.env.example` defaults, and minimal workflow documentation.
(Previously: contributors configured a manual local PostgreSQL instance from `.env.example`.)

#### Scenario: Database starts through pnpm

- GIVEN Docker is available and the repository is cloned
- WHEN a contributor runs the documented root database start script
- THEN PostgreSQL starts through Compose and is reachable through the documented `DATABASE_URL`

#### Scenario: Data survives restart

- GIVEN the Compose database contains local data
- WHEN the contributor stops and starts it through root scripts
- THEN the data remains available until an explicit reset script is run

#### Scenario: Env and docs are discoverable

- GIVEN a contributor inspects `.env.example` and the foundation docs
- WHEN they follow the official workflow
- THEN Docker-backed connection defaults, lifecycle scripts, and reset behavior are documented

### Requirement: Prisma Migration Workflow

The system MUST provide a host-run Prisma migration workflow under `packages/db` that creates and applies migrations against the Compose local/dev PostgreSQL instance.
(Previously: the workflow assumed a manually configured local PostgreSQL instance.)

#### Scenario: First migration applied locally

- GIVEN the Compose database is running and `DATABASE_URL` points to it
- WHEN the migration command is executed from `packages/db`
- THEN an initial migration reflecting the existing Prisma schema is created and applied

#### Scenario: Migration history is preserved

- GIVEN the initial migration has been applied
- WHEN a contributor inspects `packages/db/prisma/migrations/`
- THEN the migration history directory contains versioned SQL migration files

### Requirement: Shared Tooling Commands

The foundation MUST expose root-level commands for formatting, linting, type checking, testing, building, and local/dev database lifecycle (`up`, `down`, `reset`, and status-style inspection).
(Previously: root commands covered quality/build tasks but not database lifecycle.)

#### Scenario: Quality commands are discoverable

- GIVEN the workspace package metadata exists
- WHEN a contributor reviews root scripts
- THEN format, lint, typecheck, test, and build commands are available from the root

#### Scenario: Database lifecycle commands are discoverable

- GIVEN the workspace package metadata exists
- WHEN a contributor reviews root scripts
- THEN root `pnpm db:*` scripts expose start, stop, reset, and status-style database operations

#### Scenario: Empty shell compatibility

- GIVEN app and package shells contain no product features
- WHEN root quality commands run
- THEN they complete against the baseline or report only actionable tooling failures

### Requirement: Installable Workspace Baseline

The technical foundation MUST provide an installable monorepo baseline for `apps/web`, `apps/api`, and `packages/db` with Docker Compose local/dev database scaffolding and runtime API foundation, without product behavior.
(Previously: the baseline described operational DB scaffolding without Compose provisioning.)

#### Scenario: Fresh install

- GIVEN a clean checkout with Node, pnpm, and Docker
- WHEN dependencies are installed from the root
- THEN all app/package shells install successfully and the Compose database workflow is available

#### Scenario: Product behavior absent

- GIVEN the workspace baseline is reviewed
- WHEN web, api, and db outputs are inspected
- THEN no admin screens, public flows, auth flows, product endpoints, uploads, seed data, or test DB are introduced; migrations, Prisma generation, and NestJS health-only scaffolding remain allowed

### Requirement: Artifact Validation

The spec, foundation document, model artifact, workspace baseline, and Docker Compose database workflow MUST be reviewable with clear acceptance checks before product implementation begins.
(Previously: validation covered the DB operational workflow without explicitly requiring Compose lifecycle checks.)

#### Scenario: Complete validation pass

- GIVEN the artifacts are ready for review
- WHEN acceptance criteria are checked
- THEN document structure, model coverage, business rules, exclusions, assumptions, workspace install, root scripts, Compose service, migrations, and client generation all pass

#### Scenario: Incomplete validation

- GIVEN any required artifact, script, migration, Compose operation, or client generation step is missing or failing
- WHEN validation runs
- THEN the change MUST remain incomplete until corrected

### Requirement: MVP Exclusions

The foundation MUST NOT implement advanced roles, social login, password recovery, public search, dark mode, presenter mode, embedded images, product UI, auth flows, uploads, product endpoints, production deployment, separate test database, test Compose profiles, CI database provisioning, API/web containers, seed data, or seed workflow. It MAY include local/dev migrations, Docker Compose PostgreSQL provisioning, root database lifecycle scripts, Prisma Client generation, NestJS API bootstrap (health-only), and workspace tooling.
(Previously: exclusions did not explicitly rule out test database/profile and seed workflow scope.)

#### Scenario: Exclusion stays out of scope

- GIVEN an excluded feature or workflow appears
- WHEN it is reviewed
- THEN it is marked deferred and creates no implementation requirement

#### Scenario: Scaffolding allowed

- GIVEN this change is applied
- WHEN files are inspected
- THEN migrations, Prisma generation, Compose PostgreSQL, root db scripts, and shells are present without product features, seed workflow, or test DB
