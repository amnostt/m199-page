# Design: Landing Admin & Public

## Technical Approach

Extend the singleton `LandingSettings` model with Step 6 editorial fields (mission, vision, description, featuredVideoUrl, contactEmail, contactPhone). Create a NestJS `LandingModule` with two controllers following the existing FileModule split-pattern: a protected admin controller for `GET/PUT /landing/admin` (LP-01), and a public controller for `GET /landing/public` (LP-02) that assembles the full landing payload from joined Prisma queries. Replace the Vite web shell with a React component that fetches the public payload and degrades gracefully for null sections (LP-03).

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Singleton `LandingSettings` extension | Grows a single row; keeps Step 6 small | **Chosen** — matches exploration recommendation and existing schema |
| Separate landing content models | Cleaner domain boundaries; too much surface area | Rejected — violates MVP scope |
| Two controllers (public + admin) | More files; consistent with FileModule precedent | **Chosen** — `LandingPublicController` (no guard) + `LandingAdminController` (AuthGuard) |
| Single controller with route-level guards | Fewer files; mixes auth concerns | Rejected — diverges from established pattern |
| `PUT` for admin update | Spec requires PUT (LP-01); differs from `@Patch` in ResponsiblesController | **Chosen per spec** — full replacement semantics for singleton settings |

## Data Flow

```
Public visitor → GET /landing/public
  → LandingPublicController
    → LandingService.getPublicPayload()
      ├─ prisma.landingSettings.findFirst() → hero, mission, vision, featuredVideoUrl, contact
      ├─ prisma.featuredPost.findMany({include:{post}}) → featured posts
      ├─ prisma.outing.findUnique(featuredOutingId) → featured outing | null
      └─ prisma.verse.findFirst({where:{status:PUBLISHED}, orderBy:{date:desc}}) → verse | null
      → assembled DTO → JSON 200

Admin user → GET/PUT /landing/admin
  → AuthGuard
    → LandingAdminController
      → LandingService.getSettings() / updateSettings(dto)
        → prisma.landingSettings.upsert (id=1 for singleton)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/db/prisma/schema.prisma` | Modify | Add `mission`, `vision`, `description`, `featuredVideoUrl`, `contactEmail`, `contactPhone` to `LandingSettings` — all nullable String |
| `apps/api/src/landing/landing.module.ts` | Create | NestJS module importing DbModule + AuthModule |
| `apps/api/src/landing/landing.service.ts` | Create | Singleton read/upsert + public payload assembly with null-safe queries |
| `apps/api/src/landing/landing-admin.controller.ts` | Create | `GET /landing/admin`, `PUT /landing/admin` behind `@UseGuards(AuthGuard)` |
| `apps/api/src/landing/landing-public.controller.ts` | Create | `GET /landing/public` — no guard |
| `apps/api/src/landing/dto/update-landing-settings.dto.ts` | Create | Partial update DTO — all fields `@IsOptional() @IsString()` per existing DTO convention |
| `apps/api/src/landing/*.test.ts` | Create | Controller + service tests (3 files) |
| `apps/api/src/app.module.ts` | Modify | Register `LandingModule` |
| `apps/web/src/App.tsx` | Modify | Fetch `GET /landing/public`, render sections with null fallbacks |
| `apps/web/src/App.test.tsx` | Modify | Mock fetch, assert landing sections render/hide on null |

## Interfaces / Contracts

```typescript
// GET /landing/public response
interface LandingPublicPayload {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;     // resolved via /files/{heroImageId}
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null; // URL to video (YouTube, etc.), not iframe code
  contactEmail: string | null;     // free-text string per MVP spec
  contactPhone: string | null;     // free-text string per MVP spec
  featuredOuting: { id: string; slug: string; title: string; location: string; mainImageUrl: string | null } | null;
  featuredPosts: { id: string; slug: string; title: string; coverImageUrl: string | null }[];
  currentVerse: { text: string; reference: string; date: string } | null;
}
```

DTO validation uses `@IsOptional() @IsString()` on all fields, matching the existing `update-responsible.dto.ts` pattern. The spec defines them as "all nullable strings" — no regex or format validation is applied at this step.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (service) | Settings upsert, public payload assembly, null/empty fallbacks | Mocked DbService, follow `responsibles.service.test.ts` pattern |
| Unit (controllers) | Guard enforcement (401/403), route delegation, DTO validation | Mocked LandingService + AuthGuard override, `Test.createTestingModule` |
| Component (web) | Renders landing sections, handles missing payload fields | Mock `fetch`, assert section presence/absence, follow `App.test.tsx` pattern |

## Migration / Rollout

Prisma migration adds nullable columns only — no data loss. Rollback: revert migration. If migration already applied, drop added columns in a follow-up migration.

## Open Questions

- None — all previously open questions are now resolved by the finalized specs.
