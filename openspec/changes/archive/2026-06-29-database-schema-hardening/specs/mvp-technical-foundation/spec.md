# Delta for mvp-technical-foundation

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Business Rule Representation

The model/foundation MUST represent rules for one featured outing, up to three featured posts, inactive responsible users, refresh-session tracking, anonymous likes, file constraints, post tags/downloads, and verse history. Each rule MUST declare whether enforcement is database-native (Prisma) or application-level (API/transaction), and the constraint strategy must match the Prisma schema.
(Previously: business rules were represented without requiring enforcement-tier classification.)

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
