# Design: MVP Technical Foundation

## Technical Approach

This change creates reviewable foundation artifacts only: a project architecture document and an initial Prisma schema draft. The repo currently contains only SDD metadata, so the design establishes first conventions for a future `pnpm` monorepo: `apps/web` for React, `apps/api` for NestJS, `packages/db` for Prisma/PostgreSQL, and optional shared packages only after duplication appears.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Monorepo boundary | `apps/web`, `apps/api`, `packages/db` | Single app first | Matches requested stack and prevents early boundary debt. |
| Business rules | API services own workflow rules; database owns durable uniqueness where Prisma can express it | UI-only enforcement | Featured content, likes, sessions, and file metadata must remain valid beyond screens. |
| Featured content | Singleton `LandingSettings.featuredOuting` and three `FeaturedPostSlot` rows | Boolean flags on content only | Singleton pointer and three slots make limits explicit and reviewable. |
| Anonymous likes | Store salted `visitorHash` per outing, no user identity | Public accounts or raw IP storage | Supports dedupe while minimizing privacy risk. |
| Uploads | Local file metadata in `FileAsset` | Store raw paths inside each content table | Centralizes category, path, size, MIME, and future migration metadata. |

## Data Flow

Public reads and admin writes will flow through the API, not directly from the web app to the database.

    apps/web ──HTTP──→ apps/api modules ──Prisma──→ PostgreSQL
       │                    │                         │
       │                    └── local uploads ───────→ FileAsset rows
       └── public pages read published content, featured settings, and likes

Admin authentication will issue short-lived JWT access tokens and persist only hashed refresh tokens in `RefreshSession`. Deactivating a `ResponsibleUser` blocks future admin access without deleting audit relationships.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `openspec/changes/mvp-technical-foundation/design.md` | Create | SDD design for the foundation artifacts. |
| `docs/technical-foundation.md` | Create | Human-readable architecture and model foundation. |
| `packages/db/prisma/schema.prisma` | Create | Initial Prisma model draft for MVP entities and rules. |

## Interfaces / Contracts

- `ResponsibleUser`: active/inactive admin identity with `passwordHash`.
- `RefreshSession`: hashed refresh token state, expiration, revocation, and user relation.
- `Outing`, `Post`, `Verse`: public content with status lifecycle and publication fields.
- `FileAsset`: local upload metadata with category and JSON metadata.
- `LandingSettings`, `FeaturedPost`: landing-page selection contracts.

Constraints Prisma cannot fully express, such as max upload size, allowed MIME by category, single settings row enforcement beyond `id = 1`, and transactional featured-slot updates, are documented as application/transactional rules in the schema comments.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Future API services for featured rules, likes, auth, uploads | Add once NestJS tooling exists. |
| Integration | Prisma constraints and transactional rule enforcement | Add database tests after migrations/client setup. |
| E2E | Public/admin content flows | Deferred; no runtime app in this change. |

## Migration / Rollout

No production migration required. `schema.prisma` is a draft; migrations and generated client setup are deferred to implementation.

## Risks

- Prisma cannot express every PostgreSQL partial/check constraint directly; some rules need migrations or API transactions later.
- Upload MIME/size limits still need final product values.
- No runtime/testing toolchain exists yet, so validation is manual until implementation bootstrap.

## Open Questions

- [ ] Confirm final upload size and MIME-type policy per file category.
- [ ] Confirm whether verse history needs public browsing or admin audit only.
