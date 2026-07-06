# Design: Outings

## Technical Approach

Add a dedicated NestJS `OutingsModule` over the existing Prisma `Outing` and `OutingLike` models. The API keeps the established split-controller pattern: public reads/actions under `/outings`, protected admin create/read/update/archive under `/outings/admin`. Web routing stays lightweight inside the current Vite `App.tsx` shell for this slice, adding `/outings` and `/outings/:slug` rendering without introducing a router dependency unless implementation size forces it.

## Architecture Decisions

| Topic | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Module boundary | Create `apps/api/src/outings` with module, service, admin/public controllers, DTOs, tests | Fold into `landing` or create generic content layer | Matches existing explicit modules and avoids coupling landing ownership to outing CRUD. |
| Routes | `/outings/admin` for authenticated CRUD; `/outings` for public list/detail/like | `/admin/outings`, Spanish `/salidas` | Existing landing uses audience suffixes; technical routes stay English per contract. |
| DB access | Minimal service-local Prisma interfaces cast from `DbService.client` | Static `@prisma/client` imports in services | Existing API avoids static Prisma imports in `apps/api`; follow that boundary. |
| Lifecycle operations | Implement create/read/update/archive; omit hard delete | Add destructive removal now | Matches proposal scope and avoids destructive behavior in the first slice. |
| Likes privacy | Derive `visitorHash = sha256(version + VISITOR_HASH_SECRET + normalized IP + user-agent)` in API, store only hash/version | Store raw IP/user-agent, browser local-only dedupe, dev fallback secret | Satisfies `OutingLike` schema dedupe while avoiding raw identity persistence; startup must fail without the secret. |
| Featured outing | Landing singleton remains owner via `LandingSettings.featuredOutingId`; Outings admin may call a delegating convenience action | Add outing-owned featured flag | Existing schema enforces one featured outing and keeps editorial ownership in landing. |

## Data Flow

```text
Admin client ──AuthGuard──→ OutingsAdminController ─→ OutingsService ─→ DbService/Prisma
               feature action ───────────────┘              └→ LandingService.updateSettings
Public web ───────────────→ OutingsPublicController ─┬→ `PUBLISHED` Outing reads
                                                       └→ hash request signals → OutingLike + likesCount transaction
Landing public ──────────→ LandingService ─→ LandingSettings.featuredOutingId ─→ `PUBLISHED` Outing or null
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/outings/outings.module.ts` | Create | Registers controllers/service and imports `DbModule`. |
| `apps/api/src/outings/outings-admin.controller.ts` | Create | `GET/POST/PATCH /outings/admin` plus archive/feature actions, guarded by `AuthGuard`; no hard delete. |
| `apps/api/src/outings/outings-public.controller.ts` | Create | `GET /outings`, `GET /outings/:slug`, `POST /outings/:slug/like`. |
| `apps/api/src/outings/outings.service.ts` | Create | CRUD, publish-readiness, public projections, featured eligibility, transactional likes. |
| `apps/api/src/outings/dto/*.dto.ts` | Create | Create/update/list DTOs with `class-validator`. |
| `apps/api/src/app.module.ts` | Modify | Import `OutingsModule`. |
| `apps/api/src/config/env.validation.ts` | Modify | Require `VISITOR_HASH_SECRET` in all environments. |
| `apps/api/src/config/env.interface.ts` | Modify | Add validated `VISITOR_HASH_SECRET`. |
| `apps/api/src/landing/landing.service.ts` | Modify | Prefer behavior-level `status: PUBLISHED` status-guard lookup for featured outing and keep null fallback. |
| `apps/web/src/App.tsx` | Modify | Add path-based rendering for landing, outings list, outing detail, and like action. |
| `apps/web/src/App.test.tsx` | Modify | Cover landing featured link, list/detail routing, empty/error states, like action. |
| `packages/db/prisma/schema.prisma` | Reuse | No schema change planned. |

## Interfaces / Contracts

```ts
type OutingStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface OutingResponse {
  id: string;
  slug: string;
  title: string;
  dateTime: string;
  location: string;
  description: string;
  status: OutingStatus;
  likesCount: number;
  mainImageUrl: string | null;
  croquisUrl: string | null;
  planUrl: string | null;
}
```

Create/update DTOs validate required title, slug, dateTime, location, description, optional file IDs, and Prisma status enum values `"DRAFT" | "PUBLISHED" | "ARCHIVED"`. Service publish-readiness rejects `PUBLISHED` when public fields are incomplete. Admin responses may include `DRAFT`/`ARCHIVED`; public responses MUST filter `status: "PUBLISHED"`.

`POST /outings/:slug/like` returns the updated `likesCount` and is idempotent for the same `(outingId, visitorHash)`. It uses `VISITOR_HASH_SECRET`; missing config fails startup with no fallback. The service uses a transaction/upsert-like flow against `@@unique([outingId, visitorHash])` and increments only on first insert.

Outings admin feature convenience validates the outing is `PUBLISHED`, then delegates to `LandingService.updateSettings({ featuredOutingId })`; landing remains the source of truth.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | DTO validation, publish-readiness, response mapping, env validation, visitor hash excludes raw fields | Vitest service/controller/config tests with mocked `DbService.client`. |
| Integration | AuthGuard on admin routes, public published-only filters, transactional like dedupe, landing null fallback | Nest TestingModule patterns already used in `landing` and `responsibles`. |
| Web | `/outings`, `/outings/:slug`, landing featured outing link, like success/idempotent/error states | React Testing Library with mocked `fetch`; no E2E tooling exists. |

## Migration / Rollout

No migration required. Existing Prisma models already provide `Outing`, `OutingLike`, `FileAsset`, and `LandingSettings.featuredOutingId`. Roll out by registering the module and routes; rollback removes module/web changes while preserving unused schema.

## Open Questions

None.
