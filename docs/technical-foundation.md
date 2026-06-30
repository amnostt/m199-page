# Misión 1-99 MVP Technical Foundation

This document defines the first technical baseline for the Misión 1-99 MVP. It is intentionally documentation-first: it explains the future architecture and provides an initial Prisma model draft, but it does not implement runtime application behavior.

## Current State

The repository now contains an installable monorepo baseline with `apps/web`, `apps/api`, and `packages/db`; root quality scripts; Vitest smoke tests; a hardened Prisma schema; local/dev PostgreSQL documentation; an initial migration; Prisma Client generation; and an `@m199/db` package boundary consumed by the API shell. Runtime product behavior is still intentionally absent.

## Architecture Baseline

| Area | Planned Path | Responsibility |
|---|---|---|
| Web app | `apps/web` | Public mobile-first site and admin UI. Public labels may use Spanish domain terms such as “Salidas”. |
| API app | `apps/api` | NestJS modules, authentication, content workflows, file upload handling, and business-rule enforcement. |
| Database package | `packages/db` | Prisma schema, future Prisma config, migrations, generated client, and database-specific persistence concerns. |
| Shared package | `packages/shared` *(optional)* | Shared validation/types only when duplication appears across apps. |

### Dependency Direction

```text
apps/web ──HTTP──> apps/api ──Prisma──> packages/db ──> PostgreSQL
```

The web app must not import Prisma directly. Business rules belong in API modules; database constraints should protect durable invariants where possible.

## Domain Modules

| Module | Core Models | Notes |
|---|---|---|
| Auth | `ResponsibleUser`, `RefreshSession` | JWT access tokens remain stateless; refresh tokens are stored hashed and revocable. |
| Outings | `Outing`, `OutingLike` | Public “Salidas” content with images/documents, featured support, and anonymous likes. |
| Posts | `Post`, `FeaturedPost`, `PostDownload` | Published content with cover image, rich body, tags, downloads, and featured slots. |
| Verses | `Verse`, `VerseRevision` | Daily verse content with history/audit support. |
| Files | `FileAsset` | Local upload metadata for images, croquis, plans, covers, and downloadable documents. |
| Landing | `LandingSettings`, `FeaturedPost` | Hero/landing settings, one featured outing, and up to three featured posts. |

## Data Model Decisions

| Topic | Decision |
|---|---|
| Responsible users | Use `ResponsibleUser` with `ACTIVE`/`INACTIVE` status and `passwordHash`; deactivate instead of deleting. |
| Sessions | Store only hashed refresh tokens in `RefreshSession`; track status, expiration, revocation, and rotation metadata. |
| Outings | Use slugs, date/time, location, description, status, image/file relations, and `likesCount` for efficient reads. |
| Likes | Use anonymous `visitorHash` plus `outingId` unique constraint for dedupe. Do not store public identity. |
| Posts | Use slug, description, cover image, rich content, status, simple `String[]` tags, and downloadable file join rows. |
| Featured posts | Use three fixed `FeaturedPostSlot` enum values. A row in a slot means that slot is active, so the model cannot exceed three. |
| Featured outing | Use `LandingSettings.featuredOutingId` as the singleton landing selection instead of scattered boolean flags. |
| Files | Centralize uploads in `FileAsset` with category, path/URL, size, MIME, and JSON metadata. |

## Constraint Strategy

Every business invariant is classified into one of two enforcement tiers, matching the
`// DB:` and `// APP:` labels in `packages/db/prisma/schema.prisma`.

### Tier Definitions

| Tier | Label | Enforcement | Notes |
|------|-------|-------------|-------|
| **Database** | `DB` | Prisma-native: `@unique`, `@@unique`, `@@index`, `@default`, enum, required field, relation | Source of truth lives in the schema. |
| **Application** | `APP` | API/service logic, transactional writes, future SQL migrations | Prisma cannot enforce these directly at the DB level. |

### Invariant Classification

| Invariant | Tier | Mechanism |
|---|---|---|
| Unique email, slug, token hash | DB | `@unique` constraints |
| FeaturedPost max 3 slots | DB | `FeaturedPostSlot` enum (3 values) + `slot @unique` + `postId @unique` |
| One featured outing | DB | `LandingSettings.featuredOutingId @unique` |
| One like per visitor per outing | DB | `@@unique([outingId, visitorHash])` |
| Anonymous likes (no PII) | DB | `visitorHash` column; no identity columns |
| One verse per date | DB | `@@unique([date])` |
| One post per download file | DB | `@@unique([postId, fileId])` |
| Inactive responsible users | DB | `ResponsibleUserStatus` enum + `status` field + `@@index([status])` |
| File size/type metadata | DB | `sizeBytes`, `mimeType`, `extension` columns in `FileAsset` |
| Post tags | DB | `tags String[] @default([])` + `@@index([tags], type: Gin)` |
| Verse history / revisions | DB | `VerseRevision` model + `@@index([verseId, changedAt])` |
| Refresh-session fields | DB | `tokenHash @unique`, status/expiresAt columns, indexes |
| LandingSettings singleton | APP | Service enforces `WHERE id = 1` on upsert |
| Inactive user enforcement | APP | Login/content-creation guards check `status != INACTIVE` |
| Outing.likesCount sync | APP | Transactional writes on like/unlike |
| Upload MIME/size limits | APP | Per-category validation before `FileAsset` insert |
| Publish-readiness | APP | Status transition guard requires complete public fields |
| Refresh token lifecycle | APP | Hash-only storage; app layer handles revoke/rotate/expiry |

## Auth and Session Model

1. Admin login validates a `ResponsibleUser` with `ACTIVE` status and a password hash.
2. API issues a short-lived JWT access token.
3. API creates a `RefreshSession` row containing a hashed refresh token, expiry, optional user-agent/IP hash metadata, and status.
4. Logout or suspected compromise marks the session `REVOKED`; expired sessions are ignored or cleaned later.

Password recovery, social login, and differentiated roles are explicitly deferred.

## File Storage Model

MVP storage is local filesystem storage with metadata in `FileAsset`.

| Category | Examples | Notes |
|---|---|---|
| `OUTING_MAIN_IMAGE` | Outing card/detail image | Image MIME types only. |
| `OUTING_CROQUIS` | Map/croquis image or PDF | Validate per final upload policy. |
| `OUTING_PLAN` | Plan document | Document or image depending on product decision. |
| `POST_COVER_IMAGE` | Post cover | Image MIME types only. |
| `POST_DOWNLOAD` | Downloadable attachments | Public download files. |
| `LANDING_HERO` | Landing hero image | Optional landing customization. |

Final size and MIME values remain an open product/technical decision.

## Database Operational Foundation

### Prerequisites

- PostgreSQL 16+ installed and running locally.
- The `DATABASE_URL` must be configured in a `.env` file at the repository root (copy from `.env.example` and fill in real credentials). Prisma 7 reads `DATABASE_URL` via `packages/db/prisma.config.ts` dotenv loading from `.env`. `.env.example` is a documented template only; it is never read as a runtime source.

### Package Boundary

`@m199/db` owns the Prisma schema, config, migration history, and Prisma Client singleton. `apps/api` consumes the client exclusively through `@m199/db`'s public exports — never importing `@prisma/client` directly.

### Commands

Run from the repository root:

```sh
pnpm --filter @m199/db db:validate    # Validate schema syntax
pnpm --filter @m199/db db:migrate:dev  # Create and apply a new migration (requires .env with DATABASE_URL)
pnpm --filter @m199/db db:migrate:deploy # Apply pending migrations (production-safe)
pnpm --filter @m199/db db:generate     # Regenerate Prisma Client types
pnpm --filter @m199/api typecheck       # Verify @m199/db boundary compiles
```

## MVP Exclusions

This foundation does not design or implement advanced roles, social login, email password recovery, public search, dark mode, presenter mode, embedded post images, UI screens, auth flows, upload handling, API endpoints, production deployment, or real product seed data. Database migrations, Prisma config, generated Prisma Client, and local/dev database tooling are operational scaffolding and ARE included.

## Acceptance Checklist

- [x] Module boundaries are documented.
- [x] MVP entities and relationships are represented in the Prisma schema.
- [x] Featured outing and featured post rules are visible beyond UI behavior.
- [x] Anonymous likes avoid public identity storage.
- [x] File metadata and local-storage assumptions are documented.
- [x] Deferred features and unresolved assumptions are explicit.
- [x] `@m199/db` owns Prisma schema, migration history, config, and client generation.
- [x] Migration workflow creates and applies migrations from the hardened schema.
- [x] `apps/api` consumes the database package through the `@m199/db` boundary.
- [x] Workspace installs, validates, typechecks, and tests pass from a clean checkout.

## Open Questions

- What are the final upload size limits and allowed MIME types by file category?
- Should verse history be publicly visible or only available for admin audit?
