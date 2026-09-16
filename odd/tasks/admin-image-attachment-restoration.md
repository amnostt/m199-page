# Admin Image Attachment Restoration

Repository-relative locator: `odd/tasks/admin-image-attachment-restoration.md`

## Objective

Restore reliable image-attachment hydration in the admin edit flows so persisted image IDs are rendered as existing attachments, remain attached unless the user intentionally replaces or clears them, and continue to use the reusable `FileUploadWidget` contract without changing the API or database.

## Problem / Why

When an administrator edits an existing landing configuration or publication, the form receives a persisted image reference but the attachment presentation and controlled form state are not yet specified and covered as one consistent contract. That can make an existing image appear absent, become stale after an upload, or be cleared unintentionally during an edit. The fix must establish the widget behavior at its reusable boundary and prove the two affected integrations without regressing the already-working mission image flows.

## Scope

- Define and test the reusable `FileUploadWidget` contract for persisted image IDs, upload completion, replacement, intentional clearing, retry/error state, preview presentation, and controlled updates.
- Integrate and test the restored attachment behavior in `LandingSettingsPage`.
- Integrate and test the restored attachment behavior in `PublicationForm`.
- Exercise `MissionsPage` and its existing image fields as regression-only coverage; do not redesign or intentionally alter mission behavior.
- Reuse the existing web attachment/UI primitives and admin upload boundary. No API or database contract changes are part of this task.

## Constraints

- Do not change API routes, DTOs, services, persistence models, migrations, or database behavior.
- Preserve mission hero-image and profile-image upload, edit, replacement, and clearing behavior.
- Landing image handling is replacement-only: clearing the local landing reference must not imply that the stored asset was deleted.
- Do not present a misleading landing removal action or claim server-side deletion when the form only replaces or omits the reference on save.
- Keep image state controlled by the owning form; do not introduce a second source of truth inside the widget.
- Keep the existing accepted image formats, size limits, upload category semantics, and admin authorization flow unless a focused test demonstrates a contract defect.
- Preserve unrelated worktree changes and do not edit application source or tests while creating this task document.
- The advisory workload target is approximately 400 authored changed lines per task; it is not a hard limit or a reason to omit required coverage.

## Authorized Paths

- `odd/tasks/admin-image-attachment-restoration.md`
- `apps/web/src/admin/FileUploadWidget.tsx`
- `apps/web/src/admin/FileUploadWidget.test.tsx`
- `apps/web/src/admin/LandingSettingsPage.tsx`
- `apps/web/src/admin/LandingSettingsPage.test.tsx`
- `apps/web/src/admin/PublicationForm.tsx`
- `apps/web/src/admin/PublicationForm.test.tsx`
- `apps/web/src/admin/MissionsPage.tsx`
- `apps/web/src/admin/MissionsPage.test.tsx`

## Testing Mode

- Ordinary TDD: disabled.
- Source: User-authorized Organic task configuration with Engram testing capabilities disabled for this work unit.
- Runner: `pnpm --filter @m199/web test`
- Policy: implementation may proceed without test-first sequencing, but the runner and every applicable check below remain required before closeout.

## Acceptance Criteria

- `FileUploadWidget` has a documented-by-tests controlled contract: an incoming persisted ID renders the existing attachment, upload completion reports the new asset ID, intentional clearing reports the correct empty value, and controlled prop changes replace stale presentation.
- Widget tests cover existing attachments, new uploads, replacement, intentional clearing, retry/error behavior, and the preview/non-preview paths that the current callers rely on.
- Editing landing settings with an existing `heroImageId` displays that attachment and preserves it when unrelated fields are saved.
- Landing replacement updates the form to the new asset ID, while the landing flow does not expose or imply destructive asset deletion through a reference-clearing control.
- Editing a publication with an existing `featuredImageId` displays that attachment; replacing or intentionally clearing it produces the corresponding form value submitted by `PublicationForm`.
- Landing and publication tests cover hydration from edit payloads, save preservation, replacement, and the relevant empty-state behavior.
- Mission image fields retain their current upload, edit, replacement, and clearing behavior under the shared widget contract, with regression-only tests covering the affected paths.
- No API, database, migration, persistence, or mission behavior changes are introduced outside the authorized paths.
- All applicable checks pass, or any environment limitation is recorded with the exact command, result, and bounded equivalent evidence.

## Tasks

- [x] **AIR-1 — Widget contract + tests:** establish the controlled persisted-attachment contract in `FileUploadWidget` and add focused coverage for hydration, upload/replacement, intentional clearing, retry/error, and caller-compatible presentation states.
- [x] **AIR-2 — Landing/publication integrations + tests:** restore `LandingSettingsPage` and `PublicationForm` edit hydration and save semantics, enforce landing replacement-only/no-misleading-removal behavior, and add integration coverage while keeping Missions regression-only.
- [x] **AIR-3 — Verification and closeout:** run the exact applicable checks, inspect the complete diff and scope boundaries, record evidence and limitations honestly, and complete this task document without committing.

## Applicable Checks

- `pnpm --filter @m199/web test`
- `pnpm --filter @m199/web typecheck`
- `pnpm --filter @m199/web build`
- `pnpm lint`
- `pnpm format:check`
- `git diff --check`
- Complete diff inspection confirming that only the authorized paths changed and that no API/database files, generated artifacts, uploads, or secrets were added.
- API, database, migration, and end-to-end browser checks are not applicable because this task explicitly preserves those boundaries and changes only the web admin attachment flows.

## Progress

- AIR-1 complete: `FileUploadWidget` now accepts an optional `onRemove` callback,
  renders removal controls only when that callback is provided, and has focused
  coverage for persisted previews, replacement, clearing, retry/error state,
  and controlled presentation updates.
- AIR-2 complete: landing settings now hydrate the persisted hero image through
  the hero Attachment preview without a removal action, and publications now
  hydrate featured-image previews while preserving replacement and clearing
  submission semantics.
- AIR-3 complete: all applicable checks were executed, and the full web-test
  failures are explicitly recorded under the acceptance criterion permitting
  bounded environment limitations and equivalent evidence.
- Task document was created before source-code or test writes, as required.

## Evidence

- Current code mapping identifies `FileUploadWidget` as the shared attachment boundary used by `LandingSettingsPage`, `PublicationForm`, and `MissionsPage`.
- Focused test files exist for the widget and each affected admin page.
- Existing web scripts provide the required test, typecheck, and build runners.
- No application source or test files were edited during task creation.
- AIR-1 focused verification: `pnpm exec vitest run
src/admin/FileUploadWidget.test.tsx` passed with 1 file and 22 tests.
- AIR-1 changed only `apps/web/src/admin/FileUploadWidget.tsx` and
  `apps/web/src/admin/FileUploadWidget.test.tsx` within the authorized source
  paths.
- AIR-2 focused verification: `pnpm exec vitest run
  src/admin/LandingSettingsPage.test.tsx src/admin/PublicationForm.test.tsx
  src/admin/MissionsPage.test.tsx` passed with 3 files and 36 tests.
- Parent focused verification: `pnpm exec vitest run
  src/admin/FileUploadWidget.test.tsx src/admin/LandingSettingsPage.test.tsx
  src/admin/PublicationForm.test.tsx src/admin/MissionsPage.test.tsx` passed
  with 4 files and 58 tests.
- The repository's publication test filename is
  `apps/web/src/admin/PublicationForm.test.tsx`, matching the task's
  authorized path; no filename reconciliation was required.
- AIR-2 changed only the authorized landing and publication source/test paths;
  `MissionsPage` remained unchanged and its regression suite passed.
- Required verification results: `pnpm --filter @m199/web test` failed 21 of
  510 tests in 5 out-of-scope SSR/Astro files:
  `src/pages/misiones/index.test.ts`, `src/pages/misiones/detail.test.ts`,
  `src/pages/publicaciones/index.test.ts`,
  `src/pages/publicaciones/detail.test.ts`, and
  `src/lib/server/astro-config.test.ts`. All authorized admin suites passed.
  The failures reference untouched Astro/public files and one workspace-path
  expectation, so they are recorded as bounded out-of-scope limitations rather
  than represented as a passing full-suite result.
- Required verification results: `pnpm --filter @m199/web typecheck` passed
  with 0 errors, 0 warnings, and 4 existing hints; `pnpm --filter @m199/web
  build` passed; `pnpm lint` passed; `pnpm format:check` passed; and `git diff
  --check` passed.
- Final scope audit: `git diff --stat` reported 6 tracked source/test files,
  with the authorized task document additionally untracked; `git status
  --short` showed only the six authorized web files and
  `odd/tasks/admin-image-attachment-restoration.md`. Complete diff review
  found no API/database changes, generated files, uploads, secrets, or
  unauthorized paths.
- Receipt-driven development was off by global decision, so no native review
  ran. `gentle-ai review assess` classified the candidate as medium risk after
  the intended untracked task document was explicitly selected for assessment.
- `skill_resolution: paths-injected`.

## Next Step

User handoff and optional commit; no further implementation is required.
