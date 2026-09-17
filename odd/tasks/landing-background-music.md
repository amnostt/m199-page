# Landing Background Music

## Objective

Add end-to-end configurable MP3 music for the public landing page. Administrators can upload or remove one landing music asset, and visitors can explicitly play or pause it through an accessible floating control.

## Problem / Why

The landing currently has no configurable audio experience. The existing featured-video/FileAsset flow provides the established persistence, upload, API, admin, and public-rendering pattern, but audio needs its own strict MP3 validation and a user-initiated player so the feature respects browser autoplay policies and the confirmed product behavior.

## Scope

- Add a nullable landing music FileAsset relationship and dedicated database category/metadata through a data-safe Prisma migration.
- Reuse the existing featured-video/FileAsset upload, removal, URL projection, authorization, and admin form patterns.
- Accept MP3 only when extension, declared MIME, detected signature, and size are valid; enforce a maximum of 10 MB.
- Expose the configured asset in authenticated landing administration and the public SSR landing payload.
- Add an English- and Spanish-compatible-with-existing-UI React island mounted from `Landing.astro`, with an accessible bottom-right floating play/pause button and native audio state.
- Preserve the current visual design and stop/reset naturally on SSR navigation; do not introduce client-side navigation persistence or autoplay.
- Add focused tests beside each changed behavior.

## Constraints

- MP3 only.
- Maximum file size: 10 MB.
- No autoplay; playback starts only after an explicit user action.
- Navigation away from the landing uses the existing SSR behavior, so music stops/resets naturally.
- Do not physically delete old assets unless the existing featured-video/FileAsset pattern already does so.
- Do not add dependencies.
- Do not edit generated Prisma client files or the lockfile unless a real, verified need appears.
- Do not apply migrations to any database.
- Preserve unrelated worktree changes.
- Technical artifacts, code, comments, tests, and new copy are in English unless existing UI context requires Spanish.

## Authorized Scope

- `odd/tasks/landing-background-music.md`
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/*_landing_background_music/*`
- `packages/db/prisma/seed.ts` or the existing landing seed helper, only if required by the implemented contract
- `apps/api/src/file-module/*` files required for audio validation and its tests
- `apps/api/src/landing/*` files required for persistence, contracts, services, controllers, and tests
- `apps/web/src/admin/*` files required for landing music configuration and tests
- `apps/web/src/lib/server/landing*` files required for SSR payload/types and tests
- `apps/web/src/lib/server/ssr-proof.test.mjs` required to keep the public SSR contract fixture complete
- `apps/web/src/components/landing/*` files required for the audio island and tests
- `apps/web/src/pages/Landing.astro` or the existing landing page entrypoint
- `apps/web/src/styles/public.css` or the existing public style entrypoint
- Narrow focused test files adjacent to the behaviors above

No other files are authorized without recording why the existing pattern cannot support the behavior.

## Acceptance Criteria

- [x] A nullable landing music FileAsset relation and dedicated category are represented in Prisma without changing existing data semantics.
- [x] A new migration adds the required enum/column/foreign-key changes in a data-safe order; no database is migrated during this task.
- [x] Admin landing configuration can upload and remove the music asset through authenticated, origin-protected API behavior.
- [x] Uploads reject non-MP3 extension, MIME, signature, or files larger than 10 MB, and accept valid MP3 files.
- [x] Admin and public contracts expose only the intended metadata and `/files/<id>` URL projection.
- [x] The public landing renders the floating bottom-right control only when music is configured.
- [x] The control is keyboard accessible, has an accessible name/state, and visibly reflects play/pause state.
- [x] Playback never starts automatically and is initiated only by the control.
- [x] Landing SSR navigation naturally unmounts/resets the player; no cross-route persistence is introduced.
- [x] Focused tests cover database schema/migration shape, API/FileService validation and contracts, admin behavior, SSR payload, and the public widget.
- [x] All requested repository checks have evidence; repository-wide failures and environment requirements are recorded below.

## TDD Resolution

TDD is explicitly disabled by Engram decision #1133. Use ordinary tests with the implementation, not RED-first sequencing. Tests remain required and must protect the observable behaviors in scope.

## Checks

- [x] `pnpm --filter @m199/db db:validate` — the exact command fails when `DATABASE_URL` is absent; `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/m199' pnpm --filter @m199/db db:validate` passed.
- [x] `pnpm --filter @m199/db db:generate` — the exact command fails when `DATABASE_URL` is absent; the same explicit local placeholder URL invocation passed and produced no tracked generated-client changes.
- [x] Focused DB/API/web Vitest coverage: `packages/db/src/migration-safety.test.ts`; `apps/api/src/file-module/file-category.test.ts`, `file.controller.test.ts`, and `file.service.test.ts`; `apps/api/src/landing/landing-admin.controller.test.ts`, `landing-public.controller.test.ts`, and `landing.service.test.ts`; `apps/web/src/admin/LandingSettingsPage.test.tsx`; `apps/web/src/components/landing/LandingBackgroundMusic.test.tsx` and `Landing.test.ts`; `apps/web/src/lib/server/landing.test.ts`, `landing-featured-payload.test.ts`, and `ssr-proof.test.mjs`; and `apps/web/src/pages/index.test.ts`.
- [x] `pnpm --filter @m199/api typecheck`
- [x] `pnpm --filter @m199/web typecheck` — 0 errors, 19 existing hints.
- [x] `pnpm lint`
- [ ] `pnpm format:check` — fails on seven files: the pre-existing `apps/web/src/components/misiones/MissionDetail.test.ts`, `apps/web/src/components/public/PublicImageCarousel.test.tsx`, `apps/web/src/components/public/PublicImageCarousel.tsx`, `apps/web/src/components/publicaciones/PublicationDetail.test.ts`, `odd/tasks/admin-image-attachment-restoration.md`, and `odd/tasks/latest-publications-carousel.md`, plus the existing blank-line formatting in `apps/web/src/styles/public.css`.
- [x] `pnpm typecheck` — API, DB, and web typechecks completed with 0 errors; web reports 19 existing hints.
- [ ] `pnpm test` — DB passed 8 files/70 tests. Web currently has four failures outside this feature: three `src/pages/misiones/index.test.ts` failures (`missions.items` is undefined) and one `src/lib/server/astro-config.test.ts` `envDir` worktree-path assertion. The two SSR-proof failures from the newly required `backgroundMusicUrl` contract were fixed by adding `backgroundMusicUrl: null` to its valid fixture; the isolated SSR-proof command now passes 6/6.
- [x] `pnpm build` — Astro SSR build completed successfully.
- [x] `git diff --check`
- [x] Final `git status` and complete diff inspection for secrets, uploads, generated files, unrelated changes, and scope — 26 changed/added paths are within the authorized implementation or narrow adjacent-test scope; no uploads, secrets, lockfile, or tracked generated-client changes were found.

## Stable Checklist

- [x] LBM-1 — Persistence + upload + API
- [x] LBM-2 — Admin configuration
- [x] LBM-3 — Public player
- [x] LBM-4 — Verification + closure
- [x] No database migration applied
- [x] No commit, push, PR, deployment, or generated-client/lockfile churn
- [x] Unrelated worktree changes preserved

## Reopened Correction

- LBM-1 reopened because independent review confirmed that an ID3 header-only or truncated/non-MP3 buffer can pass the current MP3 signature check without a valid MPEG frame.
- LBM-3 reopened because the public audio control does not handle asynchronous media `error` events or expose a useful accessible playback-error message, even though rejected `play()` promises are caught.
- LBM-4 reopened because the prior verification evidence covered the confirmed defects above and must be refreshed after the bounded corrections and their focused checks.

## Progress / Evidence

### Bounded Correction Evidence — 2026-09-17

- [x] `pnpm --filter @m199/api exec vitest run src/file-module/file.service.test.ts` — 1 file, 34 tests passed.
- [x] `pnpm --filter @m199/web exec vitest run src/components/landing/LandingBackgroundMusic.test.tsx` — 1 file, 6 tests passed; Vitest emitted the existing `environmentMatchGlobs` deprecation notice.
- [x] `pnpm --filter @m199/api typecheck` — passed with no TypeScript errors.
- [x] `pnpm --filter @m199/web typecheck` — passed with 0 errors and 19 existing hints.
- [x] `git diff --check` — passed.
- [x] Prettier was checked on the five changed task/source/test files and written only to the two changed test files that required normalization.

### LBM-1 — Persistence + upload + API

- Status: Complete after bounded MP3 signature correction.
- Evidence: Added `LANDING_BACKGROUND_MUSIC`, nullable `backgroundMusicId`, the `LandingBackgroundMusic` relation, and migration `20260917150000_landing_background_music` without applying it. Added strict `audio/mpeg`, `.mp3`, MP3-signature, and 10 MB validation plus a dedicated authenticated upload route. Added landing DTO/service/public contract coverage. `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/m199' pnpm --filter @m199/db db:validate` passed; the exact no-environment invocation was also run and failed only because `DATABASE_URL` is absent. The focused API command passed: 34 files, 348 tests passed, 4 files, 13 tests skipped by existing integration gates.
- Reopen reason: The existing signature accepted the 10-byte `ID3\x04\x00\x00\x00\x00\x00\x00` fixture without requiring an MPEG frame. The correction must parse a valid synchsafe ID3 size, skip the complete tag, and require a valid MPEG frame, while preserving valid frame-first MP3 support.
- Correction result: `hasMp3Signature` now rejects invalid/truncated ID3 metadata and incomplete MPEG frames, skips the synchsafe tag payload (and footer when flagged), and accepts a complete valid MPEG frame with or without ID3. Focused API validation passed 34/34 tests.

### LBM-2 — Admin configuration

- Status: Complete.
- Evidence: Extended the existing `FileUploadWidget` pattern in `LandingSettingsPage` with MP3-only browser hints, a 10 MB limit, upload/remove callbacks, normalized form state, and persisted `backgroundMusicId`. The focused command `pnpm --filter @m199/web exec vitest run src/admin/LandingSettingsPage.test.tsx` passed: 26 tests.

### LBM-3 — Public player

- Status: Complete after bounded asynchronous audio-error correction.
- Evidence: Added the React `LandingBackgroundMusicControl` island through the Astro wrapper mounted by `Landing.astro`, with SSR-safe `/files/<id>` payload validation, no autoplay, accessible play/pause labels and `aria-pressed`, visible state styling, and unmount pause/reset cleanup. The focused command `pnpm --filter @m199/web exec vitest run src/components/landing/LandingBackgroundMusic.test.tsx src/components/landing/Landing.test.ts src/lib/server/landing.test.ts src/lib/server/landing-featured-payload.test.ts src/pages/index.test.ts` passed: 5 files, 105 tests.
- Reopen reason: The control catches rejected `play()` promises but has no asynchronous media `error` listener and no useful visible/`aria-live` playback-error message. The correction is limited to `error` handling and consistent rejected-play feedback.
- Correction result: The control now resets `isPlaying` and exposes a visible `role="status"`/`aria-live="polite"` message for asynchronous media errors and rejected `play()` promises. Focused player tests passed 6/6.

### LBM-4 — Verification + closure

- Status: Complete after correction evidence.
- Evidence: Migration safety coverage passed 21 tests with `pnpm --filter @m199/db exec vitest run src/migration-safety.test.ts`; the full DB suite passed 8 files/70 tests. The focused API suite passed 34 files/348 tests with 4 files/13 existing integration skips. The focused admin suite passed 26 tests. The focused landing/public payload/widget suite passed 5 files/105 tests. `pnpm --filter @m199/web exec vitest run src/lib/server/ssr-proof.test.mjs` passed 6/6 after updating the valid public payload fixture with `backgroundMusicUrl: null`. API/web typechecks, full workspace typecheck, lint, build, database validate/generate with an explicit local placeholder URL, and `git diff --check` passed. `pnpm format:check` remains blocked by seven listed files. Full `pnpm test` remains blocked by three missions SSR failures and one Astro worktree-path assertion, both outside this feature's changed behavior. Final inspection found only authorized implementation/document/test paths; no uploads, secrets, lockfile, or tracked generated-client changes were added. No migration was applied and no delivery operation was performed.
- Reopen reason: Closure is invalid until the two independent confirmed findings are corrected and the exact requested API/web focused tests, typechecks, diff check, diff inspection, and status review pass again.
- Correction result: All exact requested correction commands pass; no database migration, commit, push, PR, RDD, dependency, or out-of-scope change was performed.

## Second Bounded Correction — 2026-09-17

- Status: Reopened for the API validation regression only.
- Reopen reason: Independent revalidation found that `hasMp3Signature` rejects a valid ID3v2.4 tag with the standard footer-present flag (`0x10`) because that flag is included in the reserved-bit mask, so the valid footer skip cannot be reached.
- Authorized correction scope: Make the ID3 reserved-flag mask version-aware and add one focused acceptance fixture for a valid ID3v2.4 footer followed by a complete MPEG frame. Preserve existing rejection behavior for reserved flags, isolated ID3 data, truncation, invalid synchsafe sizes, and incomplete MPEG frames.
- Status after verification: Complete.
- Evidence: `pnpm --filter @m199/api exec vitest run src/file-module/file.service.test.ts` passed 1 file and 35 tests; `pnpm --filter @m199/api typecheck` passed; `git diff --check` passed.
- Correction result: ID3v2.4 now permits only its defined footer-present bit outside the reserved mask, while older accepted ID3 versions retain the stricter mask. The focused test accepts a valid footer followed by a complete MPEG frame. No migration, dependency, RDD, commit, push, PR, or out-of-scope change was performed.
