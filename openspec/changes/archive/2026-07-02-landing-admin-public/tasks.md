# Tasks: Landing Admin & Public

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650 (10 schema + 20 DTO + 80 service + 90 controllers + 20 module + 3 app.module + 120 App.tsx + 40 App.test + 270 tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: schema + DTO + service + service tests (~250 lines) → PR 2: controllers + module + controller tests + app.module wiring (~280 lines) → PR 3: App.tsx + App.test.tsx (~120 lines) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema migration + DTO + LandingService + service tests | PR 1 | Base: main; autonomous business logic; tests included |
| 2 | Controllers + module + controller tests + AppModule wiring | PR 2 | Base: main after PR 1 merge; depends on LandingService from PR 1 |
| 3 | Web App.tsx rendering + App.test.tsx update | PR 3 | Base: main after PR 2 merge; depends on public API from PR 2 |

## Phase 1: Foundation — Schema & DTO

- [x] 1.1 RED — Write `landing.service.test.ts` with failing tests for `getSettings()`, `updateSettings(dto)`, and `getPublicPayload()` (null fallbacks, empty featured posts array, missing outing/verse). Use mocked DbService following `responsibles.service.test.ts` pattern.
- [x] 1.2 Add `mission`, `vision`, `description`, `featuredVideoUrl`, `contactEmail`, `contactPhone` (all `String?`) to `LandingSettings` in `packages/db/prisma/schema.prisma`. Keep `id Int @id @default(1)` sentinel intact.
- [x] 1.3 Create `apps/api/src/landing/dto/update-landing-settings.dto.ts` — all fields `@IsOptional() @IsString()`, following `update-responsible.dto.ts` convention.

## Phase 2: Core Implementation — LandingService

- [x] 2.1 GREEN — Implement `apps/api/src/landing/landing.service.ts`: `getSettings()` returns `findFirst()`, `updateSettings(dto)` uses `upsert({where:{id:1}, create:{id:1, ...dto}, update:dto})` — set only provided fields, retain others (nullable-string partial merge compatible with PUT semantics per design decision).
- [x] 2.2 GREEN — Implement `getPublicPayload()`: assemble hero fields from `landingSettings.findFirst()`, featured posts from `featuredPost.findMany({include:{post}, where:{post:{status:"PUBLISHED"}}})`, featured outing from `outing.findUnique(featuredOutingId)` with status=PUBLISHED guard, current verse from `verse.findFirst({where:{status:"PUBLISHED"}, orderBy:{date:"desc"}})`. Return null for missing sections, never throw.
- [x] 2.3 Run service tests from 1.1 — verify all pass. Refactor if needed.

## Phase 3: Integration — Controllers & Module

- [x] 3.1 RED — Write `landing-admin.controller.test.ts`: mock LandingService + AuthGuard, assert `GET /landing/admin` delegates to `getSettings()`, `PUT /landing/admin` delegates to `updateSettings(dto)`, 401 without guard. Follow `responsibles.controller.test.ts` pattern.
- [x] 3.2 RED — Write `landing-public.controller.test.ts`: mock LandingService, assert `GET /landing/public` delegates to `getPublicPayload()`, NO auth guard applied. Follow `files-public.controller.test.ts` pattern.
- [x] 3.3 GREEN — Create `apps/api/src/landing/landing-admin.controller.ts`: `@Controller("landing/admin")` with `@UseGuards(AuthGuard)`, `GET /` → `getSettings()`, `PUT /` → `updateSettings(dto)`.
- [x] 3.4 GREEN — Create `apps/api/src/landing/landing-public.controller.ts`: `@Controller("landing/public")` with `GET /` → `getPublicPayload()`, no guard.
- [x] 3.5 GREEN — Create `apps/api/src/landing/landing.module.ts`: import `AuthModule`, register both controllers + `LandingService`. Follow `file.module.ts` split-controller pattern. Register `LandingModule` in `apps/api/src/app.module.ts`.
- [x] 3.6 Run controller tests from 3.1–3.2 — verify all pass.

## Phase 4: Web Rendering

- [x] 4.1 RED — Update `apps/web/src/App.test.tsx`: mock `fetch` for `GET /landing/public`, assert full payload renders all sections, null featuredOuting hides section, empty featuredPosts hides section, missing heroImage hides hero.
- [x] 4.2 GREEN — Rewrite `apps/web/src/App.tsx`: fetch `/landing/public` on mount, render hero (title/subtitle/image from `/files/{heroImageId}`), mission/vision/description sections, featured video iframe, featured outing card, featured posts list, current verse block. Hide null sections. Keep Vite shell text for empty payload fallback.
- [x] 4.3 Run web tests from 4.1 — verify all pass.

## Phase 5: Verification & Cleanup

- [x] 5.1 Run `pnpm typecheck && pnpm lint` across all packages — fix any issues.
- [x] 5.2 Run `pnpm test` — confirm all existing + new tests pass.
- [x] 5.3 Generate Prisma migration: `pnpm --filter @m199/db prisma migrate dev --name add-landing-content-fields`.
