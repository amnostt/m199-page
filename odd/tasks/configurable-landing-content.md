# Configurable Landing Content

## Objective

Make the agreed landing-page values configurable from the admin experience while
preserving the incumbent public and admin design, behavior, anchors, and
optional-section rules.

## Problem / Why

Landing copy and the visual-break image currently combine persisted settings with
hard-coded public content. Administrators need to maintain the landing without
source changes, while existing installations retain their current presentation
and custom values.

## Scope

- Persist and expose configurable hero, verse, visual-break, missions,
  publications, about, and contact values.
- Preserve internal `heroSubtitle` and `description` names.
- Add a dedicated `LANDING_VISUAL_BREAK` file category and nullable relation/FK.
- Seed current hard-coded public copy only into null fields; preserve empty and
  custom values.
- Fall back to bundled hero and visual-break images when absent, including
  explicit clearing of either image.
- Normalize whitespace-only configurable copy so public text elements never
  render empty headings or paragraphs.
- Preserve optional sections and safe anchors.

## Constraints

- Work in the current worktree; preserve unrelated changes.
- Do not commit, push, create a PR, or use SDD.
- Keep technical artifacts, source, comments, tests, and UI copy in English.
- Preserve `apps/web/DESIGN.md`; this is an extension/refinement, not a redesign.
- Use explicit `.js` suffixes for relative TypeScript imports and route API
  persistence through `DbService`.
- Do not commit generated Prisma clients, uploads, secrets, or build output.

## Authorized scope

The authorized files are the landing persistence/migration/seed/API contract and
tests, public landing SSR/components and tests, admin landing form/types/upload
and remove behavior and tests, plus this tracking document and required focused
configuration/schema artifacts. No unrelated cleanup or dependency changes are
authorized.

## Stable task IDs

- [x] **CLC-1**: persistence + migration + non-destructive seed + API
      contract/service/tests
- [x] **CLC-2**: SSR contract + public landing components/tests
- [x] **CLC-3**: admin form/types/upload/remove behavior/tests
- [x] **CLC-4**: focused and repository-wide verification (bounded correction
      re-verified)

## Acceptance criteria

1. Existing persisted settings remain valid and current installations receive
   current public defaults only where values are null.
2. The public API returns every expected nullable landing key, including the
   visual-break image and configurable section copy, with safe image URLs.
3. Public SSR renders configured values, bundled fallbacks, normalized text, and
   existing optional-section/anchor behavior without empty configurable text
   elements.
4. Admin can edit all authorized values, upload or explicitly remove hero and
   visual-break images, and preserve the incumbent form interaction/design.
5. Tests cover persistence, seed semantics, API validation/service behavior,
   SSR rendering, admin editing, uploads, removals, and relevant failure paths.
6. Required database, package, repository, detector, and diff checks are run
   with exact observed outcomes recorded below.

## Resolved TDD mode / source / runner

- **TDD mode:** disabled by explicit maintainer configuration
  (`sdd/m199-page/testing-capabilities`).
- **Source:** Engram observation `sdd/m199-page/testing-capabilities`.
- **Runner:** pnpm/Vitest.
- **Interpretation:** ordinary behavior-first tests remain required; no RED-first
  evidence is claimed.

## Applicable checks

- Database validation and generation.
- Relevant database seed tests.
- Relevant API landing tests.
- Relevant web landing/server/admin tests.
- API and web typechecks.
- Web build.
- Repository lint, format check, typecheck, and test suite.
- Impeccable detector once over changed web UI targets, with at most one
  detector-correction batch and one confirmation.
- `git diff --check`, complete diff/status review, and generated/secrets/uploads
  hygiene review.

## Progress, evidence, rationale, and next step

## Bounded correction — independent verification

- **Finding 1:** `LANDING_VISUAL_BREAK` was present in the Prisma enum and
  landing service contract but absent from the file module's image-only category
  set. Its upload path therefore used the document MIME vocabulary and could
  accept PDFs.
- **Finding 2:** landing image validation used truthiness checks, so `""` for
  `heroImageId` or `visualBreakImageId` skipped file/category validation and
  proceeded toward the nullable foreign-key write. `null` must remain an
  explicit clear and `undefined` an omitted field.
- **Correction scope:** add `LANDING_VISUAL_BREAK` to the narrow image-category
  vocabulary and MIME tests; add `@IsNotEmpty()` to both nullable DTO IDs; make
  service validation run for every defined, non-null ID; add narrow DTO/service
  regressions. No unrelated files are changed.
- **Status:** complete. Both findings were corrected and independently
  re-verified without changing unrelated files.

### CLC-1

- **Progress:** complete.
- **Evidence:** `pnpm --filter @m199/db db:validate` passed; `pnpm --filter
@m199/db db:generate` passed; `pnpm --filter @m199/db exec vitest run
src/landing-seed.test.ts` passed (1 file, 6 tests); `pnpm --filter @m199/api
exec vitest run src/landing/landing.service.test.ts
src/landing/landing-public.controller.test.ts
src/landing/landing-admin.controller.test.ts` passed (3 files, 27 tests).
  The checks observed the new nullable fields, non-destructive null-only seed,
  dedicated visual-break category/FK validation, normalized public values, and
  explicit null image clearing.
- **Rationale:** establish the durable data and API contract before wiring
  consumers.
- **Next step:** wire the complete public payload into SSR and preserve existing
  component composition and anchor behavior.

### CLC-2

- **Progress:** complete.
- **Evidence:** focused web landing/server tests passed (14 files, 168 tests),
  including `Landing.astro`, all configurable public sections, payload
  validation, page SSR, and standalone SSR proof coverage. Web typecheck passed
  with 0 errors, 0 warnings, and 19 pre-existing hints.
- **Rationale:** public SSR should consume one complete, validated contract and
  retain the current visual compositions.
- **Next step:** none; proceed with the admin and repository-wide verification.

### CLC-3

- **Progress:** complete.
- **Evidence:** `LandingSettingsPage.test.tsx` passed (24 tests), covering load,
  normalization, editing, confirmation/cancellation, save payloads, hero and
  visual-break uploads, explicit image clearing, upload failure preservation,
  loading state, dirty-state behavior, and triangulation. API typecheck passed;
  the admin fixture was updated to include the complete landing contract.
- **Rationale:** admin editing, upload, and explicit removal must share the API
  contract and preserve the existing FileUploadWidget pattern.
- **Next step:** none; proceed with final verification.

### CLC-4

- **Progress:** complete for the corrected authorized candidate; the repository
  format check retains two unrelated historical failures.
- **Evidence:** correction-specific checks passed: `pnpm --filter @m199/api exec
vitest run src/file-module/file-category.test.ts` passed (1 file, 17 tests);
  `pnpm --filter @m199/api exec vitest run
src/landing/landing.service.test.ts
src/landing/landing-public.controller.test.ts
src/landing/landing-admin.controller.test.ts` passed (3 files, 31 tests);
  `pnpm --filter @m199/api typecheck` passed; `pnpm --filter @m199/web exec
vitest run src/admin/LandingSettingsPage.test.tsx
src/lib/server/landing.test.ts src/lib/server/landing-featured-payload.test.ts`
  passed (3 files, 74 tests); targeted Prettier check passed for all seven
  correction files; `git diff --check` passed; status and diff were inspected.
  The file-category test now classifies `LANDING_VISUAL_BREAK` as image-only,
  and DTO/service regressions prove empty IDs are rejected before writes while
  null remains clearable. `pnpm format:check` remains non-green only for the
  preserved historical files `odd/tasks/admin-image-attachment-restoration.md`
  and `odd/tasks/latest-publications-carousel.md`.
- **Rationale:** verify the cohesive feature at focused package boundaries and
  repository-wide quality gates after source-mutating normalization.
- **Next step:** none for this bounded correction. Preserve the two unrelated
  formatting failures.

## Rollback boundaries

- CLC-1 can be rolled back by removing its landing schema/API/seed changes and
  the new migration, without touching unrelated feature migrations.
- CLC-2 can be rolled back by restoring the prior public landing contract and
  components/tests.
- CLC-3 can be rolled back by restoring the prior admin landing form/types and
  image controls/tests.
- CLC-4 is verification-only and has no runtime rollback boundary.

## Verification evidence

To be filled with exact command results as each task completes. No check is
marked complete without observed output.

## Repository-relative locator

`odd/tasks/configurable-landing-content.md`
