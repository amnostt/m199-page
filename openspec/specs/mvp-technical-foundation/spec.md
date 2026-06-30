# MVP Technical Foundation Specification

## Purpose

Define the reviewable technical foundation document and initial Prisma/domain model for the Misión 1-99 MVP before runtime application implementation.

## Requirements

### Requirement: Foundation Document Structure

The foundation document MUST describe the monorepo, app/package boundaries, API modules, web feature areas, persistence, auth, uploads, assumptions, and exclusions.

#### Scenario: Reviewer follows the foundation

- GIVEN the technical foundation document exists
- WHEN a reviewer scans the document
- THEN they can identify `apps/web`, `apps/api`, `packages/db`, optional shared packages, and each boundary's responsibility

#### Scenario: Missing decision marker

- GIVEN a product or technical question is unresolved
- WHEN the document references that area
- THEN it MUST mark the assumption or open question explicitly

### Requirement: Initial Domain Model Coverage

The initial Prisma/domain model MUST represent users, refresh sessions, outings, posts, verses, featured content, anonymous likes, post tags/downloads, and file assets with core relationships.

#### Scenario: Entity relationship review

- GIVEN the model artifact is reviewed
- WHEN core MVP entities are traced
- THEN each entity has ownership/association fields needed for admin content and public rendering

#### Scenario: Model overreach check

- GIVEN a proposed entity supports a non-MVP flow
- WHEN it is reviewed
- THEN the artifact MUST defer it or justify why it is required for MVP foundation

### Requirement: Constraint Enforcement Tier

The model and foundation document MUST classify every business invariant into one of two tiers: database-enforceable (Prisma-native uniqueness, indexes, required fields, relation settings) or application-enforceable (service/transaction logic, future SQL migration, or API-level validation).

#### Scenario: Tier classification is explicit

- GIVEN a completed Prisma schema and foundation document
- WHEN a reviewer inspects any business invariant
- THEN the invariant has an explicit DB or Application enforcement label
- AND the label is traceable to a Prisma construct or a documented API/transaction mechanism

#### Scenario: Missing tier triggers failure

- GIVEN a business invariant lacks an enforcement-tier classification
- WHEN the artifact is validated
- THEN the change MUST remain incomplete until every invariant is classified

### Requirement: Business Rule Representation

The model/foundation MUST represent rules for one featured outing, up to three featured posts, inactive responsible users, refresh-session tracking, anonymous likes, file constraints, post tags/downloads, and verse history. Each rule MUST declare whether enforcement is database-native (Prisma) or application-level (API/transaction), and the constraint strategy must match the Prisma schema.

#### Scenario: Featured content constraints

- GIVEN featured content rules are reviewed
- WHEN the reviewer checks the model notes
- THEN the singleton featured outing and max-three featured posts constraints are visible beyond UI behavior
- AND each constraint's enforcement tier is labeled

#### Scenario: Privacy and lifecycle rules

- GIVEN likes, users, sessions, files, posts, and verses are reviewed
- WHEN their rules are inspected
- THEN likes store no public identity, users can deactivate, refresh sessions are separate, files declare size/type metadata, posts support tags/downloads, and verse changes preserve history
- AND each rule has an enforcement-tier label

#### Scenario: Constraint tier traceability

- GIVEN a business rule is classified as DB-enforceable
- WHEN the schema is reviewed
- THEN the corresponding Prisma constraint (unique, index, required field, or relation) is present and documented

### Requirement: MVP Exclusions

The foundation MUST NOT implement advanced roles, social login, email password recovery, public search, dark mode, presenter mode, embedded post images, product UI screens, auth flows, upload handling, API endpoints, production deployment, or real product seed data. It MAY include local/dev database migrations, operational scaffolding, Prisma Client generation, runtime shells, and tooling needed to run the workspace baseline.
(Previously: prohibited all migrations and database provisioning; now allows local/dev operational DB workflow while excluding production deployment and product seed data.)

#### Scenario: Exclusion remains out of scope

- GIVEN an excluded feature appears in the artifact or workspace
- WHEN it is reviewed
- THEN it is marked as deferred and does not add implementation requirements

#### Scenario: Operational scaffolding allowed

- GIVEN this change is applied
- WHEN resulting files are inspected
- THEN local/dev migrations, Prisma Client generation, and package shells are present
- AND no product features, endpoints, or auth flows are implemented

### Requirement: Artifact Validation

The spec, foundation document, model artifact, workspace baseline, and operational database workflow MUST be reviewable with clear acceptance checks before product implementation begins.
(Previously: validation covered documentation/design outputs and workspace baseline; now includes DB operational workflow verification.)

#### Scenario: Complete validation pass

- GIVEN the artifacts are ready for review
- WHEN acceptance criteria are checked
- THEN document structure, model coverage, business rules, exclusions, assumptions, workspace install, root scripts, baseline build, migration workflow, and client generation all pass

#### Scenario: Incomplete validation

- GIVEN any required artifact, script, migration, or client generation step is missing or failing
- WHEN validation runs
- THEN the change MUST remain incomplete until the artifact or workspace is corrected

### Requirement: Installable Workspace Baseline

The technical foundation MUST provide an installable monorepo baseline for `apps/web`, `apps/api`, and `packages/db` with operational database scaffolding and without product behavior.
(Previously: baseline strictly prohibited all migrations and seed data; now allows local/dev operational DB scaffolding.)

#### Scenario: Fresh workspace install

- GIVEN a clean checkout with supported Node and pnpm
- WHEN dependencies are installed from the repository root
- THEN the workspace installs all declared app and package shells successfully

#### Scenario: Product behavior remains absent

- GIVEN the workspace baseline is reviewed
- WHEN reviewers inspect web, api, and db package outputs
- THEN no admin screens, public feature flows, auth flows, API endpoints, uploads, or product seed data are implemented
- AND local/dev migrations and Prisma Client generation are present as operational scaffolding

### Requirement: Shared Tooling Commands

The foundation MUST expose root-level commands for formatting, linting, type checking, testing, and building the workspace.

#### Scenario: Quality commands are discoverable

- GIVEN the workspace package metadata exists
- WHEN a contributor reviews root scripts
- THEN format, lint, typecheck, test, and build commands are available from the root

#### Scenario: Empty shell compatibility

- GIVEN app and package shells contain no product features
- WHEN root quality commands run
- THEN they complete against the baseline or report only actionable tooling failures

### Requirement: Local/Dev PostgreSQL Environment Contract

The system MUST document the local/dev PostgreSQL connection contract in `.env.example` so contributors can configure their environment before running migrations.

#### Scenario: Env contract is discoverable

- GIVEN a contributor clones the repository
- WHEN they inspect `.env.example`
- THEN the `DATABASE_URL` format for a local PostgreSQL instance is documented

#### Scenario: Missing contract blocks workflow

- GIVEN `.env.example` lacks PostgreSQL connection documentation
- WHEN migration workflow is attempted
- THEN the contributor cannot proceed until the env contract is provided

### Requirement: Prisma Migration Workflow

The system MUST provide a Prisma migration workflow under `packages/db` that allows contributors to create and apply migrations from the hardened MVP schema.

#### Scenario: First migration applied locally

- GIVEN a configured `DATABASE_URL` pointing to a local PostgreSQL instance
- WHEN the migration command is executed from `packages/db`
- THEN an initial migration reflecting the existing Prisma schema is created and applied

#### Scenario: Migration history is preserved

- GIVEN the initial migration has been applied
- WHEN a contributor inspects `packages/db/prisma/migrations/`
- THEN the migration history directory contains versioned SQL migration files

### Requirement: Prisma Client Generation

The system MUST generate Prisma Client from the schema and expose it through `@m199/db`.

#### Scenario: Client generated from schema

- GIVEN the Prisma schema is present and valid
- WHEN the generate command executes from `packages/db`
- THEN Prisma Client is generated and importable by TypeScript consumers

#### Scenario: Generation failure blocks consumption

- GIVEN the Prisma schema is invalid or missing
- WHEN the generate command executes
- THEN the process MUST fail with an actionable error before consumers can import stale types

### Requirement: Database Package Ownership Boundary

`@m199/db` MUST own Prisma configuration, schema, migrations, and client generation. `apps/api` MUST consume database access only through this package boundary.

#### Scenario: API consumes DB through package boundary

- GIVEN `packages/db` exports the generated Prisma Client
- WHEN `apps/api` imports from `@m199/db`
- THEN type-safe database access is available without `apps/api` owning Prisma config

#### Scenario: API type-check with DB package

- GIVEN Prisma Client is generated by `packages/db`
- WHEN `apps/api` runs type-checking against `@m199/db` imports
- THEN type resolution succeeds and model types are available

### Requirement: Seed Safeguard

The system MUST NOT include product content, user data, or domain-specific seed data. Seed scaffolding, if present, MUST be limited to operational validation only.

#### Scenario: Seed is absent or minimal

- GIVEN the seed command is defined or omitted in `packages/db`
- WHEN it is inspected or executed
- THEN no product data (users, outings, posts, verses) is inserted

#### Scenario: Operational seed only

- GIVEN a seed file exists
- WHEN it runs
- THEN it MAY insert only schema-validation rows to prove migrations and client wiring work
