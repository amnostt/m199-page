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

### Requirement: Business Rule Representation

The model/foundation MUST represent rules for one featured outing, up to three featured posts, inactive responsible users, refresh-session tracking, anonymous likes, file constraints, post tags/downloads, and verse history.

#### Scenario: Featured content constraints

- GIVEN featured content rules are reviewed
- WHEN the reviewer checks the model notes
- THEN the singleton featured outing and max-three featured posts constraints are visible beyond UI behavior

#### Scenario: Privacy and lifecycle rules

- GIVEN likes, users, sessions, files, posts, and verses are reviewed
- WHEN their rules are inspected
- THEN likes store no public identity, users can deactivate, refresh sessions are separate, files declare size/type metadata, posts support tags/downloads, and verse changes preserve history

### Requirement: MVP Exclusions

The foundation MUST NOT implement advanced roles, social login, email password recovery, public search, dark mode, presenter mode, embedded post images, product UI screens, auth flows, upload handling, API endpoints, migrations, production deployment, database provisioning, or real seed data. It MAY include runtime/package shells and tooling needed to run the workspace baseline.
(Previously: the foundation prohibited runtime app behavior entirely and treated the change as documentation-only.)

#### Scenario: Exclusion remains out of scope

- GIVEN an excluded feature appears in the artifact or workspace
- WHEN it is reviewed
- THEN it is marked as deferred and does not add implementation requirements

#### Scenario: Baseline-only runtime shell

- GIVEN this change is applied
- WHEN resulting files are inspected
- THEN only package shells, tooling, and a non-product web shell are present

### Requirement: Artifact Validation

The spec, foundation document, model artifact, and workspace baseline MUST be reviewable with clear acceptance checks before product implementation begins.
(Previously: validation covered only documentation/design outputs before implementation began.)

#### Scenario: Complete validation pass

- GIVEN the artifacts are ready for review
- WHEN acceptance criteria are checked
- THEN document structure, model coverage, business rules, exclusions, assumptions, workspace install, root scripts, and baseline build all pass

#### Scenario: Incomplete validation

- GIVEN any required entity, rule, exclusion, assumption, workspace install, script, or baseline command is missing or failing
- WHEN validation runs manually or through review checklist
- THEN the change MUST remain incomplete until the artifact or workspace is corrected

### Requirement: Installable Workspace Baseline

The technical foundation MUST provide an installable monorepo baseline for `apps/web`, `apps/api`, and `packages/db` without adding product behavior.

#### Scenario: Fresh workspace install

- GIVEN a clean checkout with supported Node and pnpm
- WHEN dependencies are installed from the repository root
- THEN the workspace installs all declared app and package shells successfully

#### Scenario: Product behavior remains absent

- GIVEN the workspace baseline is reviewed
- WHEN reviewers inspect web, api, and db package outputs
- THEN no admin screens, public feature flows, auth flows, API endpoints, uploads, migrations, or seed data are implemented

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
