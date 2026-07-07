# Tasks: Posts

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1400–1650 (full change) |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (API foundation) → PR 2 (Controllers + featured) → PR 3 (Web routes) |
| Delivery strategy | stacked-to-main |

Decision needed before apply: No (resolved)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
800-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB schema, sanitizer, DTOs, PostsService, module skeleton + tests | PR 1 | ✅ Complete — 77 tests, typecheck clean, lint clean |
| 2 | Admin/public controllers, feature/unfeature workflow, landing integration + tests | PR 2 | ~500 lines; depends on PR 1 service; verify via controller tests |
| 3 | Web `/posts` and `/posts/:slug`, DOMPurify sanitization, safe links + tests | PR 3 | ~400 lines; depends on PR 2 public API; verify via React Testing Library |

## Phase 1: Foundation — DB + Sanitizer + DTOs (PR 1)

- [x] 1.1 Add `featuredAt DateTime @default(now())` and `@@index([featuredAt])` to FeaturedPost in `packages/db/prisma/schema.prisma`; run Prisma migration; write backfill script setting `featuredAt = createdAt` for existing rows
- [x] 1.2 Install `sanitize-html` in `apps/api` and `dompurify` in `apps/web`
- [x] 1.3 Create `apps/api/src/posts/sanitizer.ts` with allowed tags (`p,h2,h3,strong,em,ul,ol,li,a,blockquote,br`), attrs (`a.href`), schemes (`http,https,mailto`); write RED→GREEN unit tests for disallowed tag/attr/event stripping
- [x] 1.4 Create `apps/api/src/posts/dto/create-post.dto.ts` with class-validator decorators (required title/slug/content, optional coverImageId/description/tags/downloadIds/status)
- [x] 1.5 Create `apps/api/src/posts/dto/update-post.dto.ts` (partial fields)
- [x] 1.6 Create `apps/api/src/posts/dto/post-list-query.dto.ts` (status filter, skip/take pagination)
- [x] 1.7 Write RED→GREEN DTO validation tests for required fields, invalid status, and slug format
- [x] 1.8 Define PostRow/FeaturedPostRow/PostDownloadRow interfaces and PostPrismaClient in `posts.service.ts`; stub PostsService class with `@Injectable()` and DbService injection
- [x] 1.9 Write RED tests for `PostsService.create` (sanitizes content, validates cover/download FileCategory, slug conflict P2002); implement GREEN
- [x] 1.10 Write RED tests for `PostsService.update` (partial update, normal edit never touches `featuredAt`); implement GREEN
- [x] 1.11 Write RED tests for publish (sets `publishedAt` when first published), archive (deletes FeaturedPost row), delete (cascades downloads + featured row in transaction); implement GREEN
- [x] 1.12 Write RED tests for `findAll`/`findBySlug` (admin pagination); implement GREEN
- [x] 1.13 Write RED tests for `findAllPublic` (PUBLISHED-only, response mapping); implement GREEN
- [x] 1.14 Create `apps/api/src/posts/posts.module.ts` (imports AuthModule, DbModule; provides PostsService; no controllers yet)

## Phase 2: Controllers + Featured + Landing (PR 2)

- [x] 2.1 Create `PostsAdminController` (`/posts/admin`) with `@UseGuards(AuthGuard)`, all routes per design; write RED→GREEN controller tests (401 unauthenticated, CRUD wiring)
- [x] 2.2 Create `PostsPublicController` (`/posts`) with `GET /` and `GET /:slug` returning only PUBLISHED; write RED→GREEN tests (published visible, 404 for DRAFT/ARCHIVED/missing)
- [x] 2.3 Register `PostsModule` in `apps/api/src/app.module.ts`
- [x] 2.4 Write RED test for feature cap (max 3 active, rejects 4th); implement `feature()` in PostsService with transaction (count < 3, assign first free SLOT_1..SLOT_3, set/update `featuredAt=now()`, require PUBLISHED)
- [x] 2.5 Write RED test for unfeature (deletes FeaturedPost row, idempotent); implement `unfeature()` in PostsService
- [x] 2.6 Write RED test for landing `getPublicPayload` featured ordering by `featuredAt desc`, take 3, PUBLISHED-only filter; update `LandingService` query with `orderBy: { featuredAt: "desc" }`, `take: 3`
- [x] 2.7 Update `LandingPrismaClient.featuredPost` interface to include `featuredAt` field; update existing landing tests for new ordering assertions

## Phase 3: Web Public Posts (PR 3)

- [ ] 3.1 Create `apps/web/src/components/PostsList.tsx` with fetch(`/posts`), loading/empty/error states, content sanitization via dompurify; write RED→GREEN React Testing Library tests
- [ ] 3.2 Create `apps/web/src/components/PostDetail.tsx` with fetch(`/posts/:slug`), loading/404/error states, dompurify sanitization, external links with `target="_blank" rel="noopener noreferrer"`, download links via existing file routes; write RED→GREEN tests
- [ ] 3.3 Add PostPayload types, `/posts` and `/posts/:slug` routing to `apps/web/src/App.tsx`; write RED→GREEN integration tests in `App.test.tsx`
- [ ] 3.4 Verify full flow: run `pnpm test` (all packages), `pnpm lint`, `pnpm typecheck`
