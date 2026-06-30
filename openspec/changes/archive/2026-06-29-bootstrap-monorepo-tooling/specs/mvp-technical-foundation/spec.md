# Delta for MVP Technical Foundation

## ADDED Requirements

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

## MODIFIED Requirements

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
