# Delta for mvp-technical-foundation

## ADDED Requirements

### Requirement: Landing Content Domain Model Extension

The Prisma domain model MUST include landing content fields on `LandingSettings`: `mission`, `vision`, `description` (text), `featuredVideoUrl`, `contactEmail`, and `contactPhone` — all nullable strings. `LandingSettings` MUST retain its singleton constraint via a unique sentinel key.

#### Scenario: Landing fields present in schema

- GIVEN the Prisma schema is reviewed
- WHEN the `LandingSettings` model is inspected
- THEN `mission`, `vision`, `description`, `featuredVideoUrl`, `contactEmail`, and `contactPhone` fields exist and are nullable

#### Scenario: Singleton constraint maintained

- GIVEN the `LandingSettings` model is defined
- WHEN the schema is reviewed
- THEN a unique constraint on a sentinel field enforces single-row semantics
