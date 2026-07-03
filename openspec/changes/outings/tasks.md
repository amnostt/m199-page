# Tasks: Outings

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1000-1200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (types+config) → PR 2 (service) → PR 3 (controllers) → PR 4 (web) → PR 5 (landing fix) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DTOs, env config, module skeleton, app.module wiring | PR 1 | Base: main; ~180 lines; autonomous types+config |
| 2 | OutingsService with CRUD, publish-readiness, visitor hash, transactional likes | PR 2 | Base: PR 1; ~300 lines; service logic + unit tests |
| 3 | Admin + Public controllers, AuthGuard, like endpoint | PR 3 | Base: PR 2; ~330 lines; controllers + integration tests |
| 4 | App.tsx routing for /outings, /outings/:slug, like action | PR 4 | Base: main; ~250 lines; web rendering against mocked API |
| 5 | LandingService.featuredOutingId DB-level PUBLISHED resolution | PR 5 | Base: main; ~40 lines; independent landing fix |

## Phase 1: Type Layer + Config (PR 1)

- [x] 1.1 Create `apps/api/src/outings/dto/create-outing.dto.ts` with class-validator Decorators (title, slug, dateTime, location, description, optional file IDs, status enum)
- [x] 1.2 Create `apps/api/src/outings/dto/update-outing.dto.ts` as `PartialType(CreateOutingDto)`
- [x] 1.3 Create `apps/api/src/outings/dto/outing-list-query.dto.ts` with optional status/pagination fields
- [x] 1.4 Add `VISITOR_HASH_SECRET` to `REQUIRED_KEYS` in `apps/api/src/config/env.validation.ts` and to `EnvConfig` interface in `apps/api/src/config/env.interface.ts`
- [x] 1.5 Create `apps/api/src/outings/outings.module.ts` importing DbModule (following `landing.module.ts` convention)
- [x] 1.6 Import `OutingsModule` in `apps/api/src/app.module.ts`
- [x] 1.7 Test: DTO validation rejects missing required fields and invalid status (OUT-01, OUT-04). Asset existence validation deferred to Phase 2 service layer.
- [x] 1.8 Test: startup fails when `VISITOR_HASH_SECRET` is unset (OUT-07 scenario)

## Phase 2: Outings Service (PR 2)

- [ ] 2.1 Create `apps/api/src/outings/outings.service.ts` with `create`, `update`, `archive`, `findAll`, `findBySlug` using Prisma client from DbService
- [ ] 2.2 Implement publish-readiness guard: reject `PUBLISHED` when title/slug/dateTime/location/description are null or empty
- [ ] 2.3 Implement `findAllPublic`: filter only `status: "PUBLISHED"`, map to `OutingResponse` (OUT-02, OUT-06)
- [ ] 2.4 Implement visitor hash derivation: `sha256(version + VISITOR_HASH_SECRET + normalized_ip + user-agent)`, store only hash/version in `OutingLike`
- [ ] 2.5 Implement transactional like: upsert on `@@unique([outingId, visitorHash])`, increment `likesCount` on first insert only (OUT-07)
- [ ] 2.6 Implement `featureOuting(id)`: validate outing is `PUBLISHED`, delegate to `LandingService.updateSettings({ featuredOutingId: id })` (OUT-05)
- [ ] 2.7 Test: service unit tests for CRUD, publish-readiness rejection, public filter, like idempotency, hash derivation excludes raw fields

## Phase 3: API Controllers (PR 3)

- [ ] 3.1 Create `apps/api/src/outings/outings-admin.controller.ts` with `@UseGuards(AuthGuard)`, endpoints: `GET /outings/admin`, `POST /outings/admin`, `PATCH /outings/admin/:id`, `POST /outings/admin/:id/archive`, `POST /outings/admin/:id/feature`
- [ ] 3.2 Create `apps/api/src/outings/outings-public.controller.ts` with `GET /outings`, `GET /outings/:slug`, `POST /outings/:slug/like`
- [ ] 3.3 Test: admin routes return 401 without auth, 200 with auth (OUT-01 scenarios)
- [ ] 3.4 Test: public list returns only `PUBLISHED`, detail returns 404 for `DRAFT`/`ARCHIVED` slugs (OUT-02, OUT-06)
- [ ] 3.5 Test: duplicate like POST returns same `likesCount`, no raw identity persisted (OUT-07)
- [ ] 3.6 Test: feature rejects non-`PUBLISHED` outings, accepts `PUBLISHED` (OUT-05)

## Phase 4: Web Rendering (PR 4)

- [ ] 4.1 Add path-based routing in `apps/web/src/App.tsx`: landing at `/`, outings list at `/outings`, detail at `/outings/:slug`, like button per outing
- [ ] 4.2 Add `OutingsList` component: fetch `/outings`, render published outings with link to slug detail (OUT-06)
- [ ] 4.3 Add `OutingDetail` component: fetch `/outings/:slug`, show title/date/location/description/assets/likes, handle 404
- [ ] 4.4 Add `LikeButton` component: POST `/outings/:slug/like`, show updated count, idempotent disabled state
- [ ] 4.5 Test: outings list renders, detail shows for valid slug, 404 for draft slug, like increments once, empty/error states
- [ ] 4.6 Test: landing featured outing link works (LP-02 scenario)

## Phase 5: Landing Featured Fix (PR 5)

- [ ] 5.1 Modify `apps/api/src/landing/landing.service.ts` `getPublicPayload()`: resolve `featuredOutingId` only when the Outing's DB status is `PUBLISHED`, return null otherwise
- [ ] 5.2 Test: `GET /landing/public` returns `featuredOuting: null` when featuredOutingId points to `DRAFT`, `ARCHIVED`, or missing outing (LP-02 scenarios)
