# Proposal: Posts

## Intent

Enable responsible users to publish ministry posts with basic sanitized HTML, files, tags, cover imagery, and curated featured placement. Visitors get safe public list/detail pages aligned with the MVP roadmap.

## Product Outcome

- Admins can create, publish/archive, tag, and feature posts without developer help.
- Visitors can read published posts, open external links safely, and download attached files.
- Landing featured posts remain curated, capped at 3 active posts, and ordered by feature timestamp.

## Scope

### In Scope
- Admin CRUD with title, slug, status, sanitized HTML, cover image, tags, and downloads.
- Public `/posts` list and `/posts/:slug` detail for `PUBLISHED` posts only.
- Featured workflow enforcing max 3 active posts; marking/updating featured sets an explicit `featuredAt`/`featuredUpdatedAt`, and unmarking clears it.
- Defense-in-depth HTML sanitization: backend sanitizes before persistence; frontend sanitizes again before public/detail rendering.
- Basic HTML tags only: `p`, `h2`, `h3`, `strong`, `em`, `ul`, `ol`, `li`, `a`, `blockquote`, `br`; external links force safe new-tab behavior.
- Empty/loading/error states for public routes.

### Out of Scope
- Comments, likes, search, advanced taxonomy, scheduling, analytics, email/newsletter, richer editor UX, embedded images, tables, inline styles, colors, iframes, scripts, and content migration.

## Capabilities

### New Capabilities
- `posts`: Admin/public post management, lifecycle visibility, tags, downloads, cover image, featured timestamp, and sanitized HTML persistence/rendering rules.

### Modified Capabilities
- `landing-page`: Featured posts must use explicit feature timestamp ordering descending, cap at 3 active `PUBLISHED` posts, and ignore normal post edits for ordering.

## First-Slice Boundaries

- Reuse existing `Post`, `FeaturedPost`, `PostDownload`, `FeaturedPostSlot`, and `FileCategory` primitives; add only the minimal feature timestamp field if not already available.
- Use existing upload/serving behavior for `POST_COVER_IMAGE` and `POST_DOWNLOAD`; no new storage system.
- Prefer simple form/editor output; Posts v1 is not a CMS/editor project.

## Approach

Build a dedicated Posts module following existing admin/public controller patterns, guarded mutations, strict DTOs, service-side lifecycle checks, and Vitest coverage. Persist only sanitized allowed HTML. Public web routes sanitize again before rendering and apply safe link attributes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/posts` | New | Module, DTOs, service, tests |
| `apps/api/src/app.module.ts` | Modified | Register Posts module |
| `apps/api/src/landing/landing.service.ts` | Modified | Featured posts ordered by feature timestamp desc |
| `apps/web/src/App.tsx` | Modified | Public post routes/rendering with frontend sanitization |
| `apps/web/src/App.test.tsx` | Modified | Route and state coverage |
| `packages/db/prisma/schema.prisma` | Modified | Add minimal featured timestamp if needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sanitized HTML XSS gaps | Med | Sanitize before persistence and before rendering; test disallowed tags/attrs |
| Featured ordering ambiguity | Low | Use explicit feature timestamp, not general `updatedAt` |
| Scope creep into editor polish | Med | Limit MVP to allowed basic tags and no embeds/styles |
| Dangling file refs | Low | Validate FileAsset ids/categories |

## Rollback Plan

Revert Posts module registration, new posts API/web files, landing featured-post ordering, and any minimal feature timestamp migration. Existing post/file tables otherwise remain compatible.

## Dependencies

- Existing auth guard, DB service, file management, and landing payload.

## Acceptance Criteria

- [ ] Admin can manage posts and cannot mutate unauthenticated.
- [ ] Public list/detail expose only published posts.
- [ ] Max 3 active featured posts are ordered by feature timestamp descending; normal edits do not reorder them.
- [ ] Dangerous raw HTML is not persisted; frontend rendering still sanitizes public/detail content.
- [ ] Disallowed tags/attrs are stripped; external links render with `target="_blank"` and `rel="noopener noreferrer"`.
- [ ] Cover images/downloads use existing file routes.
