# Misión 1-99 MVP Technical Foundation

This document defines the first technical baseline for the Misión 1-99 MVP. It is intentionally documentation-first: it explains the future architecture and provides an initial Prisma model draft, but it does not implement runtime application behavior.

## Current State

The repository currently contains SDD/OpenSpec metadata only. No React app, NestJS API, Prisma client setup, migrations, tests, linting, formatting, or build tooling exists yet.

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

Prisma expresses standard uniqueness and indexes directly: slugs, email, token hash, unique outing like fingerprints, and featured post slots.

Some rules require application services, database transactions, or later SQL migrations:

- One `LandingSettings` row should be maintained with `id = 1`.
- Upload size and MIME limits must be validated per `FileCategory` before writing files.
- Featured-slot updates should run transactionally to avoid replacing or duplicating landing selections accidentally.
- Keep `Outing.likesCount` synchronized transactionally with `OutingLike` inserts and deletes.
- Published content should require required public fields before `PUBLISHED` status.

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

## MVP Exclusions

This foundation does not design or implement advanced roles, social login, email password recovery, public search, dark mode, presenter mode, embedded post images, UI screens, auth flows, upload handling, migrations, Prisma config, or generated Prisma client setup.

## Acceptance Checklist

- [x] Module boundaries are documented.
- [x] MVP entities and relationships are represented in the Prisma draft.
- [x] Featured outing and featured post rules are visible beyond UI behavior.
- [x] Anonymous likes avoid public identity storage.
- [x] File metadata and local-storage assumptions are documented.
- [x] Deferred features and unresolved assumptions are explicit.

## Open Questions

- What are the final upload size limits and allowed MIME types by file category?
- Should verse history be publicly visible or only available for admin audit?
