# Publication Activity Simplification

Repository-relative locator: `odd/tasks/publication-activity-simplification.md`

## Objective

Simplify OUTING and EVENT publications around one civil activity date, automatic public temporal messaging, an ordered one-to-five image gallery, and an accessible rich-text authoring experience built from the existing shadcn primitives and publication sanitizer contract.

## Problem / Why

Activity publications currently require start/end dates plus manually maintained activity and documentation statuses. That duplicates information already implied by the date, complicates editing, and hides useful content until an activity is marked complete. Publications also support only one image and expose a plain content input despite already storing and safely rendering a constrained HTML subset.

## Scope

- Replace start/end dates with one day-only `activityDate` for OUTING and EVENT publications.
- Remove activity and documentation status persistence, DTOs, form controls, public badges, and content gating while preserving the editorial DRAFT/PUBLISHED lifecycle.
- Derive future/today/past public messaging in `America/Lima` and use type-aware publication-list actions.
- Replace the featured-image scalar with an ordered collection of one to five publication images; position zero is the featured image used by lists, heroes, and mission projections.
- Build an accessible publication rich-text editor from project-owned shadcn primitives using the existing sanitizer allowlist.
- Preserve publication slug/URL identity when an activity is reprogrammed.
- Execute the work as bounded Orca worktree units with explicit dependencies and an integration closeout.

## Constraints

- Do not change the editorial `PublicationStatus` DRAFT/PUBLISHED workflow.
- `POST` publications must not have `activityDate`; OUTING and EVENT publications must have exactly one civil date serialized as `YYYY-MM-DD`.
- Public temporal classification must not depend on the server or browser default timezone.
- The structured CANCELLED state is intentionally removed with the activity-status model; cancellation messaging remains editorial content unless separately authorized later.
- Publication image order is the single source of truth. Do not retain a duplicate writable featured-image field.
- Existing publication images and activity start dates must survive the migration.
- Lists and mission galleries use only image position zero; publication detail may show all images in order.
- Keep `FileUploadWidget` reusable and single-file; compose publication-specific multi-image behavior outside it.
- Keep business rules outside `apps/web/src/components/ui`.
- Preserve server-side publication sanitization as authoritative and keep SSR/client defense-in-depth.
- Do not add a third-party rich-text editor dependency unless a concrete blocker is demonstrated and separately approved.
- Preserve unrelated worktree changes, especially the pre-existing untracked `.agents/` directory.
- The approximately 400 authored-line target is advisory per work unit, not a reason to omit required behavior, tests, accessibility, or documentation.

## Authorized Paths

- `odd/tasks/publication-activity-simplification.md`
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/**`
- `packages/db/src/development-seed.ts`
- `packages/db/src/development-seed.test.ts`
- `packages/db/src/mission-publication-migration.test.ts`
- `apps/api/src/publications/**`
- `apps/api/src/missions/**`
- `apps/web/src/admin/adminTypes.ts`
- `apps/web/src/admin/PublicationForm.tsx`
- `apps/web/src/admin/PublicationForm.test.tsx`
- `apps/web/src/admin/PublicationContentEditor.tsx`
- `apps/web/src/admin/PublicationContentEditor.test.tsx`
- `apps/web/src/admin/PublicationImagesField.tsx`
- `apps/web/src/admin/PublicationImagesField.test.tsx`
- `apps/web/src/admin/FileUploadWidget.tsx`
- `apps/web/src/admin/FileUploadWidget.test.tsx`
- `apps/web/src/admin/PublicationsPage.tsx`
- `apps/web/src/admin/PublicationsPage.test.tsx`
- `apps/web/src/admin/publicationsApi.ts`
- `apps/web/src/admin/publicationsApi.test.ts`
- `apps/web/src/components/publicaciones/**`
- `apps/web/src/components/misiones/**`
- `apps/web/src/lib/server/publications.ts`
- `apps/web/src/lib/server/publications.test.ts`
- `apps/web/src/lib/server/public-content.ts`
- `apps/web/src/lib/server/public-content.test.ts`
- `apps/web/src/lib/server/publication-sanitizer.ts`
- `apps/web/src/lib/sanitize.ts`
- `apps/web/src/pages/publicaciones/**`
- `apps/web/src/pages/misiones/**`
- `apps/web/src/styles/public.css`

## Testing Mode

- Strict TDD: disabled by maintained project configuration.
- Source: Engram observation `sdd/m199-page/testing-capabilities`, last updated 2026-07-22.
- Runner: Vitest through package-local commands and `pnpm test`.
- Policy: tests remain required with each behavior even though RED-first sequencing is not mandatory.

## Acceptance Criteria

- Existing OUTING/EVENT records migrate from `startDate` to `activityDate` without changing publication IDs, slugs, or current featured images.
- `POST` rejects activity dates; OUTING/EVENT require one valid `YYYY-MM-DD` civil date.
- Activity and documentation enums, columns, DTO fields, form controls, badges, and content visibility checks are removed.
- Temporal public copy is derived using `America/Lima`: future “Próximamente”, today “Es hoy”, and past “Revive lo que hicimos”.
- Publication cards use exactly “Ver publicación”, “Ver evento”, or “Ver salida” according to type.
- Admin create/edit accepts one to five ordered publication image IDs, rejects duplicates and a sixth image, and clearly identifies the first image as featured.
- Lists and mission projections use the first image; publication detail renders the complete ordered gallery.
- Reordering images changes the featured image without maintaining a second featured-image source of truth.
- The rich-text editor supports paragraph, H2, H3, strong, emphasis, ordered/unordered lists, list items, blockquote, links, and line breaks only.
- Rich-text value, paste handling, links, keyboard/focus behavior, disabled state, sanitization, and form integration are covered by focused tests and a browser smoke scenario.
- Activity content remains visible before, on, and after the activity date and is sanitized on persistence and SSR rendering.
- Type changes preserve activity data between OUTING and EVENT, require a date when moving from POST, and confirm/clear the date when moving to POST.
- Applicable package and repository checks pass, or exact environment limitations and bounded evidence are recorded honestly.

## Tasks

- [x] **PAS-1 — Database date/image foundation:** add the civil activity date and ordered publication-image relation, write a data-preserving migration, update seeds and database contract tests, and verify Prisma generation/validation.
- [x] **PAS-2 — Isolated rich-text editor:** implement the accessible project-owned editor against the existing allowlist with focused unit and browser-interaction coverage, without integrating it into the form yet.
- [x] **PAS-3 — API contracts and invariants:** update DTOs, transactional service behavior, public/admin projections, mission projections, sanitization boundaries, and API tests for one date and ordered images.
- [x] **PAS-4 — Admin integration:** simplify `PublicationForm`, add the publication-specific multi-image composition, integrate the rich-text editor, and update admin API/types/tests.
- [x] **PAS-5 — Public rendering:** implement Lima temporal classification, exact type-aware CTA copy, always-visible sanitized content, ordered detail gallery, and coherent mission/publication tests.
- [x] **PAS-6 — Integration and closeout:** integrate all worktree units, run the complete applicable verification matrix and Impeccable detector, inspect the full diff/scope, and record evidence and remaining limitations.

## Applicable Checks

- `pnpm --filter @m199/db db:validate`
- `pnpm --filter @m199/db db:generate`
- `pnpm --filter @m199/db test`
- `pnpm --filter @m199/api test`
- `pnpm --filter @m199/web test`
- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- PostgreSQL-backed migration/integration tests when the local Compose database is available.
- Orca browser smoke scenario for rich-text keyboard/focus/link/paste behavior and responsive public image gallery behavior.
- `/Users/vanderidme/Coding/m199-projects/m199-page/.agents/skills/impeccable/scripts/impeccable detect --json <changed-web-targets>` after final web UI changes.
- Complete diff inspection confirming no secrets, uploads, generated clients, dependency churn, or out-of-scope files were added.

## Progress

- Task document was created before application source, test, schema, or migration writes.
- PAS-1 through PAS-5 are committed as isolated work units and combined on `pub-integration-base`.
- PAS-6 found and fixed the confirmed OUTING/EVENT-to-POST date-clearing integration defect.
- Implementation and bounded verification are complete on `pub-integration-base`; merge to `main` remains a separate delivery decision.

## Evidence

- The baseline schema stored `featuredImageId`, `startDate`, `endDate`, `activityStatus`, and `documentationStatus` directly on `Publication`.
- The baseline public rendering showed manual status badges and hid activity content until `COMPLETED`.
- Existing API and SSR sanitizers already share the constrained publication HTML vocabulary required by the editor.
- `FileUploadWidget` is a controlled single-file upload boundary used by other admin flows and must remain reusable.
- Receipt-driven development is globally off; ordinary repository verification applies unless the user changes that switch.
- PAS-1 commit: `8063e13` (`feat(db): simplify publication activity model`).
- PAS-2 commit: `7ced949`, replayed on the integration branch as `974812e` (`feat(admin): add publication rich text editor`).
- PAS-3 commit: `fd47f74` (`feat(api): simplify publication activity contracts`).
- PAS-4 commit: `995cc68`, replayed on the integration branch as `6071617` (`feat(admin): simplify publication editing`).
- PAS-5 commit: `ce9044d`, replayed on the integration branch as `f4a069b` (`feat(web): improve activity publication rendering`).
- PAS-6 integration fix: `14fac9c` (`fix(api): clear activity date on publication type change`).
- Database verification passed with 67 tests; API verification passed with 319 tests and 13 skipped integration cases in the ordinary suite.
- All four PostgreSQL integration suites passed against a disposable migrated database: 13 tests total.
- Web verification passed 541 tests; one pre-existing nested-worktree `astro-config` path assertion remained environment-sensitive.
- DB validation/generation, API/web typechecks, web/repository builds, lint, focused Impeccable detectors, and `git diff --check` passed.
- Repository `format:check` remained blocked only by pre-existing formatting in `odd/tasks/admin-image-attachment-restoration.md`, outside this candidate.
- Browser smoke was skipped because the available persistent PostgreSQL instances belonged to conflicting environments; no database was stopped, reset, or destroyed.

## Next Step

Review and optionally merge `pub-integration-base` into local `main`; no push or PR has been performed.
