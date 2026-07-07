# Exploration: posts

## Current State

The Posts domain already exists in the Prisma schema and initial migration: `Post`, `FeaturedPost`, `PostDownload`, and `FeaturedPostSlot` are present, and `FileCategory` already includes `POST_COVER_IMAGE` and `POST_DOWNLOAD`. The landing slice already consumes featured posts from `featuredPost` and filters them to published content, so Posts is mostly a missing product/API/web slice rather than a missing data model.

The codebase has clear patterns to reuse:
- split admin/public controllers (`landing`, `outings`, `files`)
- protected admin mutations with `AuthGuard`
- `DbService` boundary with minimal Prisma interfaces
- strict DTO validation and service-side publish/readiness guards
- public file serving via `/files/:id`
- Vitest unit/controller tests mirroring route behavior

The web app currently only routes landing and outings. There is no `/posts` list or detail route, and no admin UI scaffold for post CRUD.

## Affected Areas

- `packages/db/prisma/schema.prisma` — Post, FeaturedPost, PostDownload, and related enums already define most of the domain contract.
- `packages/db/prisma/migrations/20260630160259_initial_migration/migration.sql` — confirms the DB tables and indexes already exist.
- `apps/api/src/app.module.ts` — will need Posts module registration.
- `apps/api/src/posts` — new module, DTOs, service, controllers, and tests.
- `apps/api/src/landing/landing.service.ts` — landing featured-post assembly may need deterministic slot ordering if Posts manages featured cards explicitly.
- `apps/api/src/file-module/*` — already supports post cover/download categories and public serving.
- `apps/web/src/App.tsx` — needs `/posts` list/detail routing and public rendering.
- `apps/web/src/App.test.tsx` — needs route and empty/loading/error coverage for Posts.

## Approaches

1. **Dedicated Posts module over the existing schema** — implement admin CRUD, public list/detail, featured-slot management, and post download handling directly on `Post`/`FeaturedPost`/`PostDownload`.
   - Pros: matches current module style, reuses the existing DB model, keeps scope aligned to the roadmap.
   - Cons: several product details remain undefined (rich text format, featured workflow, embedded content rules).
   - Effort: Medium

2. **Broader editorial/content layer** — build a shared content abstraction for posts, landing highlights, and future editorial content.
   - Pros: could centralize publishing rules and featured content logic.
   - Cons: too much architecture for this slice, higher coupling, and it does not match the repo’s explicit module pattern.
   - Effort: High

## Recommendation

Use a dedicated Posts module and keep the slice narrow: CRUD admin, public list/detail, featured slots, cover/download assets, and basic rich text validation. Reuse the existing `FileCategory` and `FeaturedPostSlot` primitives instead of adding new schema concepts.

## Risks

- Rich text is not defined: HTML vs Markdown vs sanitized editor output changes validation and rendering.
- The landing featured-post list currently has no explicit `orderBy`, so public ordering may be unstable unless Posts defines slot ordering.
- “No embedded images” needs an enforcement strategy, not just copy in the UI.
- External links in a new tab require clear sanitization and rendering rules.

## Ready for Proposal

Yes — the codebase is mapped enough for a Posts proposal. The next step should confirm the content format, featured-slot workflow, and download/link rules before design.
