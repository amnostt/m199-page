# Design: Posts

## Technical Approach

Create a dedicated `PostsModule` matching the existing `OutingsModule` pattern: protected admin routes under `/posts/admin`, public read routes under `/posts`, minimal Prisma interfaces in services, DTO validation, and Vitest-first implementation. Reuse `Post`, `PostDownload`, `FileAsset`, `ContentStatus`, and current file serving. `FeaturedPost` row existence is the source of truth for active feature state; unfeature/archive/delete removes the row, while `featuredAt` records when the row was created or re-featured for landing ordering.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Module shape | Dedicated `apps/api/src/posts` module | Fold into landing or generic CMS | Existing code favors explicit feature modules; Posts v1 stays bounded. |
| Active featured model | Active featured = `FeaturedPost` row for a `PUBLISHED` post. Unfeature/archive/delete removes the row. | Keep row with nullable timestamp | Deleting cleanly represents cleared feature state and avoids null-order ambiguity. |
| Feature timestamp | Add explicit Prisma field `featuredAt DateTime @default(now())`; feature existing row updates it to `now`; landing orders `featuredAt desc`, `take: 3`. | Use `updatedAt`/`Post.updatedAt` | Generic post edits must not reorder featured posts. |
| Slot handling | Keep required `slot @unique`; assign first free `SLOT_1..SLOT_3` on new feature, preserve slot on re-feature, remove slot by deleting row. | Migrate slot away now | Current schema requires slot; deterministic internal assignment avoids user-visible slot scope. |
| HTML sanitization | Backend `sanitize-html`; frontend `dompurify` | Backend-only or DOMPurify server wrapper | Defense in depth with runtime-native libraries. |

## Data Flow

Admin save:

    Admin → /posts/admin → AuthGuard → PostsService
      → sanitize HTML → validate FileAsset categories → Prisma Post/PostDownload

Feature/unfeature:

    POST /posts/admin/:id/feature
      → require PUBLISHED → transaction → if existing update featuredAt
      → else count active featured < 3 → create row with first free slot

    DELETE /posts/admin/:id/feature
      → delete FeaturedPost by postId if present (idempotent cleared state)

Landing:

    /landing/public → featuredPost.findMany({ post.status=PUBLISHED,
      orderBy: { featuredAt: "desc" }, take: 3 }) → featuredPosts[]

Do not use generic `Post.updatedAt` for featured ordering; only `FeaturedPost.featuredAt` controls featured recency.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/db/prisma/schema.prisma` | Modify | Add `FeaturedPost.featuredAt`; index `@@index([featuredAt])`; keep `slot @unique`. |
| `apps/api/package.json` | Modify | Add `sanitize-html` and types if needed. |
| `apps/web/package.json` | Modify | Add `dompurify` and types if needed. |
| `apps/api/src/posts/*` | Create | Module, service, admin/public controllers, DTOs, tests. |
| `apps/api/src/app.module.ts` | Modify | Register `PostsModule`. |
| `apps/api/src/landing/landing.service.ts` | Modify | Query active featured published posts ordered by `featuredAt desc`, capped at 3. |
| `apps/web/src/App.tsx` | Modify | Add `/posts` and `/posts/:slug`, sanitized rendering, loading/empty/error states. |
| `apps/web/src/App.test.tsx` | Modify | Add route, state, sanitizer, and safe-link tests. |

## Interfaces / Contracts

Prisma schema contract:

```prisma
model FeaturedPost {
  id         String           @id @default(uuid())
  slot       FeaturedPostSlot @unique
  postId     String           @unique
  featuredAt DateTime         @default(now())
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  post Post @relation(fields: [postId], references: [id])

  @@index([featuredAt])
}
```

`FeaturedPost` row existence means active featured state. Creating or re-featuring sets `featuredAt`; unfeature, archive, and delete remove the row.

Admin routes, all guarded by `AuthGuard`:

| Route | Behavior |
|---|---|
| `GET /posts/admin` | List posts with optional status/pagination. |
| `GET /posts/admin/slug/:slug` | Read one post for editing by slug. |
| `POST /posts/admin` | Create post; sanitize content; validate cover/download file categories. |
| `PATCH /posts/admin/:id` | Update post; normal edits never touch `FeaturedPost.featuredAt`. |
| `POST /posts/admin/:id/publish` | Set `PUBLISHED`, setting `publishedAt` when first published. |
| `POST /posts/admin/:id/archive` | Set `ARCHIVED` and delete `FeaturedPost` row. |
| `DELETE /posts/admin/:id` | Delete post and related downloads/featured row in a transaction. |
| `POST /posts/admin/:id/feature` | Require `PUBLISHED`; max 3 active; set/update `featuredAt=now`. |
| `DELETE /posts/admin/:id/feature` | Unfeature by deleting `FeaturedPost` row; clears explicit feature timestamp. |

Public routes: `GET /posts` lists `PUBLISHED`; `GET /posts/:slug` returns 404 for missing, `DRAFT`, or `ARCHIVED`.

Sanitizer allowlist: tags `p,h2,h3,strong,em,ul,ol,li,a,blockquote,br`; only `a.href`; schemes `http`, `https`, `mailto`; no protocol-relative URLs, images, iframes, styles, classes, events, tables, SVG, or data URLs. Frontend adds safe external-link attributes.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | sanitizer, DTOs, publish readiness, file categories, slot assignment, feature cap, unfeature deletion | Failing Vitest service/helper tests first with mocked Prisma. |
| Controller | 401 mutations; admin/public route wiring; non-published 404 | Nest testing module + supertest pattern from outings. |
| Integration-ish | landing cap/order by `featuredAt`; archive/delete clears feature | Landing/posts service tests with fake Prisma rows. |
| Web | `/posts`, `/posts/:slug`, loading/empty/error/not-found, second sanitization, safe links/downloads | React Testing Library with mocked `fetch`. |

## Migration / Rollout

Prisma migration adds non-null `FeaturedPost.featuredAt @default(now())` plus `@@index([featuredAt])`. Backfill existing featured rows safely from existing `createdAt` before enforcing non-null/default semantics; preserve existing slots and do not create/delete rows during backfill.

## Review Workload

Likely exceeds 800 changed lines if delivered as one PR. Slice by work unit: (1) DB + API core/sanitizer, (2) featured + landing integration, (3) web public routes. Keep tests with each slice.

## Open Questions

None.
