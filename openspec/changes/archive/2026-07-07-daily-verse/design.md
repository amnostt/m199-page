# Design: Daily Verse

## Technical Approach

Implement Daily Verse as a NestJS feature module that owns verse CRUD/public history while Landing remains a read consumer. Reuse `Verse`, keep required `date`, remove `@@unique([date])`, add `publishedAt`, and make admin create capture one server `now` instant. Persist `publishedAt` as the UTC instant; derive stored/display `date` from that instant in Peru business timezone `America/Lima` (UTC-05). Admin writes stay behind `AuthGuard`; public history is unauthenticated.

## Architecture Decisions

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Add `apps/api/src/verses/*` module with admin/public controllers | Put endpoints inside `landing` | Verse lifecycle is separate; the project already uses feature modules with split admin/public controllers (`posts`, `outings`, `landing`). |
| Keep required `Verse.date`, add `publishedAt`, remove `@@unique([date])`, index `[status, publishedAt]` | Drop `date` or keep it unique | Requirements need stored date/time, no manual selection, and multiple verses per date. `publishedAt` orders events; `date` groups/displays the Peru business day. |
| Derive `date` using `America/Lima` from one server instant | Derive from UTC calendar date or accept client date/time | UTC persistence plus explicit business timezone prevents near-midnight drift while preserving an auditable instant. Client date/time is forbidden. |
| Hard delete verses on admin delete | Soft delete via `ARCHIVED` | Requirement says admin can delete any verse and deleted verses must not appear. Existing `posts.delete` hard-deletes content; follow that pattern. |

## Data Flow

```text
Admin POST /verses/admin ──AuthGuard──> VersesService.create()
       │                                  │
       └── text/reference only             └── const now = new Date()
                                             publishedAt = now
                                             date = peruDateOnly(now, "America/Lima")

GET /landing/public ──> LandingService ──> Verse.findFirst(PUBLISHED, publishedAt desc)
GET /verses/history ──> VersesService ──> resolve latest; exclude it from history
DELETE /verses/admin/:id ──AuthGuard──> Verse.delete()
```

`publishedAt` stores the full UTC instant provided by JavaScript `Date`/Prisma. `peruDateOnly(now)` derives the calendar date in `America/Lima` and stores it in the project's existing Prisma `DateTime` date-only convention, normalized to that business date. Queries order by `publishedAt desc`; use `createdAt desc` only as a fallback for legacy/null rows if `publishedAt` is nullable during migration.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/db/prisma/schema.prisma` | Modify | Keep required `date`; add `publishedAt`; remove `@@unique([date])`; replace verse index with `[status, publishedAt]`; document UTC instant + `America/Lima` date convention. |
| `packages/db/prisma/migrations/<timestamp>_daily_verse/migration.sql` | Create | Drop unique index, add/backfill `publishedAt`, preserve/populate required `date`, add new index. |
| `apps/api/src/verses/verses.module.ts` | Create | Register service/controllers; import `AuthModule`. |
| `apps/api/src/verses/verses.service.ts` | Create | Create with one server instant, Peru date derivation, delete, history, and latest helper with minimal Prisma interface. |
| `apps/api/src/verses/verses-admin.controller.ts` | Create | `POST /verses/admin`, `DELETE /verses/admin/:id`, `GET /verses/admin`. |
| `apps/api/src/verses/verses-public.controller.ts` | Create | `GET /verses/history` for previous remaining published verses. |
| `apps/api/src/verses/dto/create-verse.dto.ts` | Create | Validated text/reference only; no date/time properties. |
| `apps/api/src/landing/landing.service.ts` | Modify | Order `currentVerse` by `publishedAt desc`; return `date` derived/stored under the Peru business-date convention. |
| `apps/api/src/app.module.ts` | Modify | Import `VersesModule`. |
| `apps/web/src/App.tsx` | Modify | Add `/verses/history` route and component; optionally link from landing verse section. |
| Related `*.test.ts(x)` files | Create/Modify | Unit/controller/web coverage, including timezone edge cases. |

## Interfaces / Contracts

```ts
class CreateVerseDto { text!: string; reference!: string }
type VersePublicResponse = { id: string; text: string; reference: string; date: string; publishedAt: string };
```

Create service contract: `const now = new Date(); data.publishedAt = now; data.date = peruDateOnly(now); data.status = "PUBLISHED"`. The client never sends date/time.

Routes: `POST /verses/admin`, `DELETE /verses/admin/:id`, `GET /verses/admin`, `GET /verses/history`, and `GET /landing/public`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Create sets `publishedAt` and `date` from one `now`; UTC vs `America/Lima` near-midnight grouping; delete/history/latest ordering | Mock `DbService`, freeze time around `2026-07-02T04:30:00Z` vs Lima date `2026-07-01`, assert Prisma args. |
| Controller | Admin auth, DTO whitelist excludes date/time, route delegation, 204 delete | Follow `posts-admin.controller.test.ts` with overridden `AuthGuard` and supertest 401 cases. |
| Integration | Landing latest after delete and ordering | Extend `landing.service.test.ts` to assert `publishedAt desc` and stored/display date behavior. |
| Web | History route empty/list/error and landing link | Extend `App.test.tsx` path-based routing tests. |

## Migration / Rollout

Create a Prisma migration that drops the date unique constraint before enabling admin creation. Backfill `publishedAt` from `createdAt` or `date`; keep existing `date` values unless a verified UTC instant exists for Peru-date recomputation. Rollback restores the old schema only if duplicate-date rows are absent or collapsed manually.

## Open Questions

- [ ] Should admin listing include archived/deleted audit history later? Not required for this change.
