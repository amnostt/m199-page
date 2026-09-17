# Public Detail Composition Improvements

## Objective

Improve the public mission and publication detail reading experience without replacing the existing editorial design system. Desktop detail heroes should establish their title, image, and excerpt composition higher in the viewport; media should remain fully legible; publication context should expose and present associated mission identity when available.

## Problem

The desktop mission and publication detail hero composition sits too low. The shared public image carousel can crop the primary image, which is unsuitable for editorial media that must remain complete. Publication detail currently gives the associated-missions API contract no mission profile image URL, and its context section presents the ministry relationship without a responsive logo-bearing grid. The publication detail also exposes the visible label `La historia continúa` where the H1 should provide the stronger editorial display hierarchy.

## Why

Visitors need an immediate, coherent view of the detail subject and its media. Keeping the complete primary image, lifting the desktop composition, and making ministry relationships scannable improves comprehension while preserving mobile behavior, accessibility semantics, existing URL conventions, thumbnail treatment, and lightbox behavior.

## Scope

- Adjust desktop-only public mission and publication detail hero composition alignment while preserving responsive mobile behavior.
- Update the shared `PublicImageCarousel` primary-image presentation to contain the image inside a dark backdrop; leave thumbnail cropping and lightbox behavior unchanged unless a focused regression requires otherwise.
- Remove only the visible publication label text `La historia continúa`; retain a logical accessible H1 and move the strong editorial display hierarchy to that H1.
- Render publication `En contexto` associated ministries as a responsive grid. Render a mission logo only when its nullable URL exists, in a neutral non-cropped container.
- Make the minimum API and public web contract changes needed to expose nullable mission profile image URLs on public publication detail, using existing file URL conventions. Do not change Prisma schema or migrations.
- Add or update focused tests covering the server contract, API service/controller, detail presentation, carousel fit/style/behavior, and mission grid/logo behavior.
- Record exact verification results and run the Impeccable detector once after all UI changes.

## Constraints

- This is an authorized public-detail change only; preserve unrelated worktree changes.
- No Prisma schema, migration, generated file, admin behavior, commit, push, or pull request changes.
- Keep technical artifacts in English. Preserve user-visible product copy unless this task explicitly removes the visible `La historia continúa` text.
- Preserve existing design tokens, typography, spacing language, accessibility semantics, mobile layout, thumbnail cropping, and lightbox behavior.
- Use existing server-side file URL conventions and nullable data semantics. Do not invent placeholder logos.
- Source writes occur only after this task document exists and its Engram mirror has been saved and both writes have been re-read.

## Authorized Scope

### Intended source targets

- `apps/api/src/publications/dto/publication-public.dto.ts`
- `apps/api/src/publications/publications.service.ts`
- Public publication web server contract and components, verified against the repository before editing.
- `apps/web/src/components/public/PublicImageCarousel.tsx`
- Public detail styles and focused tests, verified against the repository before editing.

### Exclusions

- Database schema, migrations, Prisma generated output, admin UI, unrelated landing work, unrelated refactors, and broad visual redesign.

## Stable Actionable IDs

- `PDC-01` — Establish the task document and Engram mirror before source writes.
- `PDC-02` — Map the current public detail API, contracts, components, styles, tests, and existing file URL convention.
- `PDC-03` — Lift desktop mission/publication hero composition without changing mobile behavior.
- `PDC-04` — Make the carousel primary image contain within a dark backdrop while preserving thumbnail crop and lightbox behavior.
- `PDC-05` — Move publication editorial display hierarchy to the H1 and remove only visible `La historia continúa`.
- `PDC-06` — Expose nullable mission profile image URLs through the public publication detail contract and render the responsive ministry grid with conditional neutral logos.
- `PDC-07` — Add or update focused tests for API, contracts, detail presentation, carousel, and ministry logos/grid.
- `PDC-08` — Run applicable verification, detector, and diff checks; record exact observed outcomes and close only proven units.

## Work Units

### PDC-WU1 — Detail composition and carousel media behavior

Implement `PDC-03` and `PDC-04`. The desktop hero composition must align higher while mobile remains responsive as before. The carousel's main image must use contain behavior with a dark empty-space backdrop. Thumbnail cropping and lightbox interaction remain unchanged unless a test demonstrates that a minimal supporting adjustment is necessary.

**Acceptance criteria**

- Desktop mission and publication detail title/image/excerpt compositions are visibly higher through the existing responsive styling system.
- Mobile detail composition retains its existing responsive behavior.
- The primary carousel image is fully visible, uses `object-fit: contain`, and has a dark backdrop for unused space.
- Thumbnail crop and lightbox behavior remain unchanged and covered by focused tests.

### PDC-WU2 — Publication hierarchy and ministries data/UI

Implement `PDC-05` and `PDC-06`. Remove only the visible `La historia continúa` label, retain the H1 as the logical accessible heading, and give that H1 the strong editorial display hierarchy formerly supplied by the label. Extend the public publication detail data path with a nullable mission profile image URL using the established file URL convention. Present associated ministries in a responsive grid, with each existing logo in a neutral contain container and no placeholder when absent.

**Acceptance criteria**

- No visible `La historia continúa` label remains on publication detail.
- The publication subject retains exactly one logical, accessible H1 with the intended strong display hierarchy.
- Public publication detail mission entries expose `profileImageUrl: string | null` (or the repository's equivalent nullable representation) end to end.
- Existing file URL conventions are reused; no schema or migration changes are made.
- `En contexto` uses a responsive grid, conditionally renders only real mission logos, and contains logos without cropping.

### PDC-WU3 — Focused verification

Implement `PDC-07` and `PDC-08` after the behavior is complete. Use the narrowest relevant tests and type/build/format checks. Run the Impeccable detector exactly once after all UI edits, passing all changed web UI targets. Record exact command outcomes in this document and in the full Engram mirror. Mark a work unit complete only when its acceptance criteria have observed proof; keep it incomplete if a required command fails.

**Acceptance criteria**

- Focused web and API tests applicable to modified files have exact observed outcomes recorded.
- Web/API typechecks, web build, applicable format checks, and `git diff --check` have exact observed outcomes recorded.
- The Impeccable detector has one post-edit run over all changed web UI targets, with its exact outcome recorded.
- Any failed or unavailable required check is explicitly recorded and the related work unit remains incomplete.

## Applicable Checks

- Focused `pnpm --filter @m199/web test` selection for changed web tests.
- Focused `pnpm --filter @m199/api test` selection for changed API tests.
- `pnpm --filter @m199/web typecheck` and `pnpm --filter @m199/api typecheck` (or the repository's exact package-level typecheck scripts if names differ).
- `pnpm build` for the web build.
- `pnpm format:check` if feasible, otherwise the narrowest supported changed-file formatting check.
- `git diff --check`.
- Exactly one post-edit Impeccable detector invocation: `node .opencode/skills/impeccable/scripts/detect.mjs --json <all changed web UI targets>`.

## Resolved TDD Mode / Source / Runner

- **Mode:** Focused test-driven verification for each behavior where an existing test seam is available; no new test framework or broad suite is introduced.
- **Source:** Existing colocated Vitest tests and repository package scripts; exact test file names and selectors to be confirmed during `PDC-02`.
- **Runner:** `pnpm --filter @m199/web exec vitest run <focused files>` and `pnpm --filter @m199/api exec vitest run <focused files>`; package typechecks use `pnpm --filter @m199/web typecheck` and `pnpm --filter @m199/api typecheck`.
- **Status:** Empirically confirmed by the focused test and typecheck commands recorded below.

## Progress

- [x] `PDC-01` Task document created before source edits.
- [x] `PDC-01` Full document mirrored to Engram under `odd/public-detail-composition/tasks` for project `m199-page`.
- [x] `PDC-02` Repository mapping and incumbent design-system verification; CodeGraph/source inspection and the Impeccable layout/craft-floor references were read before UI edits.
- [x] `PDC-WU1` Detail composition and carousel media behavior; focused style/component tests and the web build passed.
- [x] `PDC-WU2` Publication hierarchy and ministries data/UI; focused API/web contract, service/controller, SSR, and presentation tests passed.
- [ ] `PDC-WU3` Focused verification; applicable changed-file checks passed, but the repository-wide format check remains incomplete because of unrelated pre-existing formatting findings.

## Next Step

Implementation is complete for `PDC-WU1` and `PDC-WU2`. `PDC-WU3` remains open only because `pnpm format:check` reports unrelated pre-existing files; no further authorized source work is pending.

## Verification Log

Observed implementation and verification outcomes:

- `PDC-02` mapping: confirmed the public publication detail API path is `PublicationsService.findOnePublicBySlug` → `PublicationsPublicController.findOne` → `fetchPublicationBySlug` → `PublicationDetail`; confirmed existing mission file URLs use `/files/{fileAssetId}` and existing mission profile presentation uses `object-fit: contain`. Read `layout.md` and `craft-floor.md` immediately before UI edits.
- `PDC-WU1`: changed both detail hero grids from `align-items: end` to `align-items: start`; changed only the shared carousel primary image to `object-fit: contain` and its frame backdrop to `var(--background)`; retained thumbnail `object-fit: cover`, lightbox `object-fit: contain`, mobile breakpoints, and focus/lightbox behavior.
- `PDC-WU2`: added nullable `profileImageUrl` to the API/public web mission link contract; service maps `profileImageId` to `/files/{id}` or `null`; the publication context renders a responsive grid and conditionally renders only supplied logos; the publication H1 now owns the display title class and the visible `La historia continúa` text is absent while the content `h2` remains semantically present but visually hidden.
- Focused web tests: `pnpm --filter @m199/web exec vitest run src/lib/server/publications.test.ts src/components/publicaciones/PublicationDetail.test.ts src/components/publicaciones/PublicationMissionsList.test.ts src/components/public/PublicImageCarousel.test.tsx src/pages/publicaciones/detail.test.ts src/styles/public.css.test.ts` — PASS, 6 files, 50 tests passed.
- Focused API tests: `pnpm --filter @m199/api exec vitest run src/publications/publications.service.public.test.ts src/publications/publications-public.controller.test.ts src/publications/publications.service.public.integration.test.ts` — PASS, 2 files, 15 tests passed; 1 integration file, 5 tests skipped because the PostgreSQL integration flag was not enabled.
- Web typecheck: `pnpm --filter @m199/web typecheck` — PASS, 0 errors, 0 warnings, 19 pre-existing hints.
- API typecheck: `pnpm --filter @m199/api typecheck` — PASS.
- Web build: `pnpm --filter @m199/web build` — PASS; Astro check reported 0 errors, 0 warnings, 19 pre-existing hints, and server/client build completed.
- Changed-file format check: `pnpm exec prettier --check` over the task document and all supported changed API/web TypeScript, TSX, and CSS files — PASS, all matched files use Prettier code style. Astro files are not accepted by the installed direct Prettier parser invocation; repository formatting does not report them.
- Repository format check: `pnpm format:check` — FAIL, exit 1 because the existing unrelated files `apps/web/src/components/misiones/MissionDetail.test.ts`, `apps/web/src/components/public/PublicImageCarousel.tsx`, `odd/tasks/admin-image-attachment-restoration.md`, and `odd/tasks/latest-publications-carousel.md` were already reported as unformatted. No unrelated files were changed.
- Impeccable detector: `node .opencode/skills/impeccable/scripts/detect.mjs --json apps/web/src/components/publicaciones/PublicationDetail.astro apps/web/src/components/publicaciones/PublicationMissionsList.astro apps/web/src/components/public/PublicImageCarousel.tsx apps/web/src/styles/public.css` — PASS with exact output `[]`; this was the single post-edit detector invocation.
- Diff check: `git diff --check` — PASS with no output.
- Scope safety: no Prisma schema or migration changes, generated files, commits, pushes, pull requests, or RDD commands were made. Existing unrelated `opencode.json` and `.gentle-ai-default-agent.json` worktree changes were preserved.
