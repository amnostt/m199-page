# Outings Specification

## Purpose

Manage outings (events) with admin CRUD, public visibility filtering, featured outing delegation, and anonymous like interactions. Supports DRAFT/PUBLISHED/ARCHIVED lifecycle with privacy-safe visitor fingerprinting.

## Requirements

### Requirement: OUT-01 Admin Outing CRUD

Authenticated active responsible users MUST create, read, update, and archive outings. Outings SHALL include title, slug, status, date/time, location, description, and optional main image, croquis, and plan file references. Hard delete is out of scope for this slice.

#### Scenario: Admin manages outing

- GIVEN an authenticated active responsible user and valid outing data
- WHEN the user creates or updates an outing
- THEN the system returns the persisted outing with its uppercase status and asset references

#### Scenario: Unauthorized mutation denied

- GIVEN no active responsible authentication
- WHEN a mutation is requested under `/outings/admin`
- THEN the system returns 401 or 403 and does not change outings

### Requirement: OUT-02 Lifecycle Visibility

The system MUST support Prisma enum payload values `DRAFT`, `PUBLISHED`, and `ARCHIVED`. Public APIs and pages SHALL expose only `PUBLISHED` outings; `DRAFT` and `ARCHIVED` outings MUST remain hidden from public list/detail.

#### Scenario: Public hides non-published outings

- GIVEN `DRAFT`, `PUBLISHED`, and `ARCHIVED` outings exist
- WHEN a visitor requests `/outings`
- THEN only `PUBLISHED` outings are returned

### Requirement: OUT-03 Slug Rules

Each outing MUST have a non-empty unique slug suitable for `/outings/:slug`. The system MUST reject duplicate or invalid slugs.

#### Scenario: Duplicate slug rejected

- GIVEN an outing already uses slug `camp-day`
- WHEN an admin saves another outing with slug `camp-day`
- THEN validation fails and the original outing remains unchanged

### Requirement: OUT-04 Asset References

Outing media/file fields MUST reference existing `FileAsset` records by id. Missing optional assets SHALL return null; invalid asset references MUST be rejected.

#### Scenario: Invalid asset reference rejected

- GIVEN an admin submits a non-existent main image, croquis, or plan id
- WHEN the outing is saved
- THEN validation fails and no dangling reference is persisted

### Requirement: OUT-05 Featured Outing Rule

At most one outing MAY be featured through landing settings. Landing settings MUST remain the source of truth for `featuredOutingId`. Outings admin MAY expose a convenience action, but it MUST delegate to the same landing settings update and MUST only accept a `PUBLISHED` outing.

#### Scenario: Feature published outing

- GIVEN a `PUBLISHED` outing exists
- WHEN an admin features it from Outings admin
- THEN the request updates the landing singleton `featuredOutingId`

#### Scenario: Reject non-published featured outing

- GIVEN a `DRAFT`, `ARCHIVED`, or missing outing id
- WHEN an admin requests featured status from Outings admin
- THEN the landing setting is not changed

### Requirement: OUT-06 Public List and Detail

Visitors MUST access a public outings list at `/outings` and a detail page/API by slug at `/outings/:slug`. Missing or non-`PUBLISHED` slugs MUST return not found behavior.

#### Scenario: Published detail renders

- GIVEN a `PUBLISHED` outing with slug `camp-day`
- WHEN a visitor opens `/outings/camp-day`
- THEN the outing detail is shown with available assets and like state/count

#### Scenario: Draft detail hidden

- GIVEN a `DRAFT` outing with slug `camp-day`
- WHEN a visitor opens `/outings/camp-day`
- THEN not found behavior is returned

### Requirement: OUT-07 Anonymous Likes

Visitors MAY like a `PUBLISHED` outing once per privacy-safe visitor fingerprint. The API MUST derive the fingerprint with required `VISITOR_HASH_SECRET` in every environment, MUST fail startup/config validation when it is missing, MUST NOT use a development fallback, and MUST NOT persist raw visitor identity.

#### Scenario: Like published outing once

- GIVEN a `PUBLISHED` outing and a visitor fingerprint
- WHEN the visitor likes the outing twice
- THEN only one like is counted and no raw identity is stored

#### Scenario: Missing visitor hash secret blocks startup

- GIVEN `VISITOR_HASH_SECRET` is unset
- WHEN API config validation runs
- THEN startup fails before serving requests
