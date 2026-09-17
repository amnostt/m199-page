# Public Detail Image Carousel

## Objective

Replace the static image presentation on public mission and publication detail pages with one reusable, accessible carousel and enlarged-image dialog that preserves the established editorial visual system.

## Problem and why

Detail pages currently split images between a hero and a static grid. Visitors cannot browse the set as one sequence or inspect an image at a larger size. Publications already expose ordered images, while missions compose their image set from mission and related-publication media.

## Scope

- Public mission detail image presentation.
- Public publication detail image presentation.
- Shared React carousel/lightbox island, styles, and focused tests.
- Existing image contracts and fallback behavior remain unchanged.

## Constraints

- No API, Prisma, admin, upload, or editorial-contract changes.
- Preserve Astro SSR output and keep useful image content when JavaScript is unavailable.
- Follow `apps/web/DESIGN.md`, WCAG 2.2 AA, 44px touch targets, visible focus, and `prefers-reduced-motion`.
- Avoid a new carousel dependency for the current bounded image count.
- TDD mode: disabled (no explicit current-session TDD configuration found); ordinary behavior-first verification applies.

## Authorized scope

- `apps/web/src/components/public/**`
- `apps/web/src/components/misiones/**`
- `apps/web/src/components/publicaciones/**`
- `apps/web/src/styles/public.css`
- Focused colocated/detail/style tests under `apps/web/src/**`
- This task document and its Engram mirror.

## Tasks

- [x] **PDC-1 — Shared interaction:** Build a reusable SSR-first carousel with image selection, previous/next controls, counter, thumbnails, and accessible enlarged-image dialog. Evidence: `PublicImageCarousel.tsx` renders SSR markup, hydrates with `client:load`, manages Escape/arrow navigation, focus restoration, scroll lock, fallback images, and single-image control suppression; colocated Vitest coverage passes.
- [x] **PDC-2 — Detail integration:** Compose complete deduplicated image sequences for mission and publication detail pages and replace the split static presentations. Evidence: detail hero media now uses the shared island; missions prepend the hero and deduplicate related media, publications preserve ordered `imageUrls`, and focused integration tests cover order and fallback behavior.
- [x] **PDC-3 — Visual and behavioral proof:** Add focused tests, run applicable web checks, run the Impeccable detector, and inspect the final diff.

## Acceptance criteria

- A visitor can browse every available detail image with pointer, touch-friendly controls, and keyboard controls.
- Activating the main image opens a larger view that closes with its close control or Escape and restores focus.
- Single-image details avoid misleading navigation controls.
- Mission and publication details preserve image order, fallback handling, and server-rendered image content.
- Layout remains usable from 320px and nonessential motion is disabled for reduced-motion users.

## Applicable checks

- Focused Vitest tests for the shared component and both public detail integrations.
- `pnpm --filter @m199/web typecheck`
- `pnpm --filter @m199/web test`
- `pnpm --filter @m199/web build`
- Impeccable detector over changed UI targets.
- `git diff --check` and complete diff inspection.

## Progress and evidence

- Planning complete from the existing detail-gallery map and current `apps/web/DESIGN.md`.
- Focused proof, including restored route coverage: `pnpm --filter @m199/web exec vitest run src/components/public/PublicImageCarousel.test.tsx src/components/misiones/MissionDetail.test.ts src/components/publicaciones/PublicationDetail.test.ts src/pages/misiones/detail.test.ts src/pages/publicaciones/detail.test.ts` → 5 files, 25 tests passed in the independent final verification.
- Route-test adaptation: restored both base route test files; registered the supported manual React server/client renderers, exercised both routes through stubbed global `fetch` responses at the HTTP boundary (without mocking `fetchMissionBySlug`), and replaced only obsolete inline-handler/HTML-script implementation assertions with equivalent carousel/fallback and sanitization behavior assertions.
- Accessibility proof: thumbnails are rendered as a labeled semantic `ul` with `li` children; focused component coverage verifies list structure and explicit lightbox-close focus restoration in addition to Escape and arrow behavior.
- Shim proof: direct `.tsx` imports were tested and rejected by Astro check/build with `ts(5097)` under the repository's ESM configuration; `PublicImageCarousel.js` is therefore intentional and necessary for the `.js` import convention.
- Type proof: `pnpm --filter @m199/web typecheck` → Astro check and TypeScript completed with 0 errors (19 pre-existing hints).
- Build proof: `pnpm --filter @m199/web build` → Astro check and server/client build completed successfully.
- Diff proof: `git diff --check` → no output/errors.
- Full web suite: `pnpm --filter @m199/web test` → 57 files passed, 4 known environment-sensitive failures remained in `src/pages/misiones/index.test.ts` and `src/lib/server/astro-config.test.ts`; the requested focused suite passes independently.
- Impeccable detector: `node /Users/vanderidme/orca/workspaces/m199-page/main-2/.opencode/skills/impeccable/scripts/detect.mjs --json apps/web/src/components/public/PublicImageCarousel.tsx apps/web/src/components/public/PublicImageCarousel.test.tsx apps/web/src/components/misiones/MissionDetail.astro apps/web/src/components/publicaciones/PublicationDetail.astro apps/web/src/styles/public.css` → no findings (`[]`).
- Final diff proof: `git diff --check` → no output/errors; complete diff inspection completed during handoff.

## Next step

Implementation and focused verification for PDC-1/PDC-2 are complete. PDC-3 is complete with the noted unrelated full-suite failures; no further implementation work is pending.
