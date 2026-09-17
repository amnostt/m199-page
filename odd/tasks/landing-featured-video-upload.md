# Landing Featured Video Upload

## Objective

Replace the landing page's configurable featured-video URL with an uploaded MP4
asset, so an authenticated administrator can manage the video through the
existing file infrastructure and the public landing can render it safely.
Preserve the incumbent admin/public design, section placement, and surrounding
landing behavior.

## Problem / Why

The featured-video setting currently stores an arbitrary URL. That makes the
content contract dependent on an external location and does not give the
authenticated admin file workflow the same validation and lifecycle guarantees
as other managed assets. A managed MP4 FileAsset provides one supported format,
one bounded upload size, server-side content validation, and a stable public
file URL.

## Scope

- Add a landing-featured-video file category backed by MP4-only validation.
- Enforce a synchronized 100 MB maximum in the browser and server upload path.
- Replace persisted URL configuration with a nullable `FileAsset` relation and
  migrate the legacy URL field away when the migration is applied.
- Expose the stored asset ID to the admin contract and derive the public video
  URL from the validated FileAsset.
- Preserve the current admin form composition and public landing section
  placement; change only the video input, upload states, and media source.
- Render a native HTML video with browser controls and no autoplay.
- Keep the section hidden until an MP4 has been uploaded and its public URL is
  available.
- Add focused behavioral tests and record repository verification evidence.

## Constraints

- This is an Organic Driven Development recovery/task document only. For this
  step, do not edit application source, tests, schema, migrations, configs,
  generated artifacts, uploads, or unrelated documentation.
- Future implementation must preserve unrelated work in the current worktree;
  no dependency upgrades, broad cleanup, commit, push, PR, or SDD artifacts are
  authorized by this task.
- Technical artifacts, source, tests, comments, and new UI copy are English.
- Preserve the incumbent admin/public design, responsive behavior, accessibility
  conventions, and existing landing composition.
- Reuse the authenticated file upload/remove infrastructure; do not introduce a
  second storage path or a client-only media contract.
- The browser and server limits must represent the same 100 MB byte value. A
  client rejection is feedback, not a substitute for server enforcement.
- Validate category, declared MIME, and MP4 magic bytes/server content before a
  FileAsset is persisted or linked to landing settings.
- Do not autoplay, preload aggressively, or add a new media dependency; native
  video controls are the required playback affordance.
- About 400 authored changed lines per task is advisory only. Never code-golf or
  weaken tests, documentation, accessibility, or correctness to fit a budget.

## Authorized scope

Future implementation may change only the following feature boundaries, plus
their colocated focused tests and the required new migration directory:

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/<timestamp>_landing_featured_video_upload/migration.sql`
- `packages/db/src/landing-seed.ts`
- `packages/db/src/landing-seed.test.ts`
- `apps/api/src/file-module/file-category.ts`
- `apps/api/src/file-module/file-category.test.ts`
- `apps/api/src/file-module/file.service.ts`
- `apps/api/src/file-module/file.service.test.ts`
- `apps/api/src/file-module/file.controller.ts`
- `apps/api/src/file-module/file.controller.test.ts`
- `apps/api/src/landing/dto/update-landing-settings.dto.ts`
- `apps/api/src/landing/landing.service.ts`
- `apps/api/src/landing/landing.service.test.ts`
- `apps/api/src/landing/landing-admin.controller.test.ts`
- `apps/api/src/landing/landing-public.controller.test.ts`
- `apps/web/src/admin/adminTypes.ts`
- `apps/web/src/admin/FileUploadWidget.tsx`
- `apps/web/src/admin/FileUploadWidget.test.tsx`
- `apps/web/src/admin/LandingSettingsPage.tsx`
- `apps/web/src/admin/LandingSettingsPage.test.tsx`
- `apps/web/src/lib/server/landing.ts`
- `apps/web/src/lib/server/landing.test.ts`
- `apps/web/src/lib/server/landing-featured-payload.test.ts`
- `apps/web/src/components/landing/Landing.astro`
- `apps/web/src/components/landing/Landing.test.ts`
- `apps/web/src/components/landing/LandingFeaturedVideo.astro`
- `apps/web/src/components/landing/LandingFeaturedVideo.test.ts`
- `odd/tasks/landing-featured-video-upload.md`

No other application area, configuration file, dependency, route, or design
system surface is authorized unless a later maintainer decision explicitly
expands this document.

## Settled decisions and rationale

- **MP4 only.** One supported format keeps browser acceptance, server MIME
  validation, magic-byte inspection, and playback expectations coherent.
- **100 MB maximum, synchronized client/server.** The browser can give immediate
  feedback while the server remains authoritative; the shared byte limit avoids
  contradictory acceptance behavior.
- **Uploaded FileAsset replaces URL configuration.** Managed metadata, storage,
  authorization, and the existing file-serving path are preferable to arbitrary
  external URLs.
- **The legacy URL may be dropped during migration.** This is an intentional
  contract simplification; the video section remains hidden until a valid MP4 is
  uploaded rather than preserving an unvalidated external fallback.
- **Preserve incumbent admin/public design.** The feature changes content
  management and media delivery, not the established visual language or layout.
- **Native controls, no autoplay.** Browser-native playback is accessible,
  dependency-free, and user-controlled without unexpected sound or motion.
- **Reuse authenticated file infrastructure with category/MIME/magic-byte
  validation.** Existing storage, auth, rollback, and serving behavior should
  remain the single operational path; defense in depth prevents renamed or
  misdeclared files from becoming landing content.

## Stable actionable task IDs

- [x] **LFV-1 — File/storage/schema capability:** add the dedicated video
      category, MP4 MIME and magic-byte checks, the synchronized server size guard,
      the nullable landing-to-FileAsset relation, and a data-preserving-or-explicit
      legacy URL migration. Update seed behavior and focused persistence/file tests.
- [x] **LFV-2 — Landing API persistence/contracts:** replace the admin URL field
      with the asset ID, validate the expected category before linking, derive the
      public video URL from the FileAsset, preserve hidden/null semantics, and cover
      admin/public controller and service contracts plus invalid/missing assets.
- [x] **LFV-3 — Admin/public UI:** configure the incumbent upload widget for
      authenticated MP4 upload/remove at 100 MB, preserve dirty/save/error states,
      pass the derived public URL to the existing video section, and render native
      controls without autoplay while keeping the section hidden without an asset.
- [ ] **LFV-4 — Verification and recovery closeout:** run the applicable focused
      and repository checks, inspect the complete diff and scope hygiene, record
      exact evidence, and leave unresolved failures/actionable recovery notes
      rather than marking an unverified task complete.

## Acceptance criteria

1. A valid MP4 no larger than 100 MB can be uploaded only through the existing
   authenticated file path and receives the dedicated landing-video category.
2. The server rejects an oversized file, wrong category, non-`video/mp4` MIME,
   or content whose MP4 magic bytes do not match before persisting/linking it;
   client validation rejects the same size/MIME cases for immediate feedback.
3. Landing settings persist a nullable FileAsset ID rather than a configurable
   external URL. The migration may drop the legacy URL value, and no legacy URL
   fallback is used.
4. Admin reads, uploads, replaces, removes, saves, and reloads the featured
   video through the existing form interaction and authenticated file helpers.
   Upload failure does not silently replace the current saved asset.
5. The public landing derives the video source from the linked FileAsset, keeps
   the section hidden when no valid asset is configured, and preserves existing
   section placement and surrounding content.
6. The rendered video uses native controls, does not autoplay, and remains
   usable with the incumbent responsive and accessibility behavior.
7. Focused tests cover schema/migration or seed semantics, file category/size/
   MIME/magic-byte behavior, API category/link/public projection, admin upload
   and removal states, and public hidden/rendered video states.
8. All applicable checks below have exact observed outcomes recorded in this
   document; no placeholder is promoted to complete without evidence.

## Applicable checks

- Package-local Vitest for the affected DB, API file/landing, and web
  admin/public tests.
- `pnpm --filter @m199/db db:validate`
- `pnpm --filter @m199/db db:generate`
- Relevant migration tests, including legacy URL removal/null semantics.
- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- Complete `git status`/diff review confirming only authorized files changed and
  no secrets, uploads, generated clients, or build output were added.
- Because LFV-3 changes web UI, run the Impeccable detector once over the final
  changed UI targets if that implementation occurs in this worktree; record
  findings and any bounded correction honestly.

## Effective TDD mode / source / runner

- **Effective TDD mode:** disabled by explicit maintainer decision in Engram
  observation `#1133`; normal tests remain required.
- **Source:** Engram observation `#1133`, topic
  `sdd/m199-page/testing-capabilities`.
- **Runner:** pnpm with Vitest 3.2.4 across the workspace; package-local
  commands are `pnpm --filter @m199/api test`,
  `pnpm --filter @m199/web test`, and `pnpm --filter @m199/db test`.
- **Interpretation:** use ordinary behavior-first tests and report exact
  evidence; do not claim RED-first evidence or strict-TDD compliance.

## Progress and evidence placeholders

**Recovery status:** implementation complete; verification is blocked only by
an existing out-of-scope repository formatting failure.

### LFV-1

- **Progress:** complete.
- **Evidence:** `pnpm --filter @m199/db db:validate` passed; `pnpm --filter
@m199/db db:generate` passed; `pnpm --filter @m199/db exec vitest run
src/landing-seed.test.ts` passed (1 file, 6 tests); focused API file tests
  passed via `pnpm --filter @m199/api exec vitest run
src/file-module/file-category.test.ts src/file-module/file.service.test.ts
src/file-module/file.controller.test.ts` (3 files, 60 tests). The schema
  adds `LANDING_FEATURED_VIDEO`, the migration adds `featuredVideoId`, drops
  `featuredVideoUrl`, and applies `ON DELETE SET NULL`; server category/MIME,
  ISO BMFF `ftyp`, category-specific 100 MB, and existing-category limit tests
  pass.
- **Recovery note:** the existing FileCategory/FileService contract, upload
  rollback, and path-containment behavior remain the recovery baseline.

### LFV-2

- **Progress:** complete.
- **Evidence:** focused API landing tests passed via `pnpm --filter @m199/api
exec vitest run src/landing/landing.service.test.ts
src/landing/landing-admin.controller.test.ts
src/landing/landing-public.controller.test.ts` (3 files, 34 tests); focused
  web payload tests passed via `pnpm --filter @m199/web exec vitest run
src/lib/server/landing.test.ts src/lib/server/landing-featured-payload.test.ts`
  (2 files, 43 tests). The admin DTO/service now persist and validate
  `featuredVideoId`; the public service derives `/files/<id>`, and the web
  validator rejects external origins, queries, fragments, traversal, and empty
  IDs while preserving null semantics.
- **Recovery note:** the admin asset ID contract remains separate from the
  derived public URL, with partial-update/null-clearing semantics preserved.

### LFV-3

- **Progress:** complete.
- **Evidence:** focused web tests passed via `pnpm --filter @m199/web exec
vitest run src/admin/FileUploadWidget.test.tsx
src/admin/LandingSettingsPage.test.tsx
src/components/landing/LandingFeaturedVideo.test.ts
src/components/landing/Landing.test.ts
src/lib/server/landing.test.ts
src/lib/server/landing-featured-payload.test.ts` (6 files, 133 tests).
  Web typecheck passed via `pnpm --filter @m199/web typecheck` with 0 errors and
  19 pre-existing hints. The admin form now stages MP4 uploads/removals through
  `FileUploadWidget` at the synchronized 100 MB limit, preserves dirty/save and
  upload failure behavior, and sends `featuredVideoId`; the public section now
  renders a native `<video controls preload="metadata">` without autoplay and
  remains hidden when the derived local URL is absent.
- **Recovery note:** UI tests assert the dedicated upload category, MP4 accept
  attribute, upload-to-save asset ID flow, removal/null flow, hidden/rendered
  native video states, controls, preload, and no autoplay. The incumbent image
  upload wording remains unchanged while the widget supports video-specific
  labels.

### LFV-4

- **Progress:** blocked by an existing out-of-scope formatting failure.
- **Evidence:** the bounded independent-verification correction added
  `ALTER TYPE "FileCategory" ADD VALUE 'LANDING_FEATURED_VIDEO'` before the
  landing settings column is used; mapped `video/mp4` to `.mp4`; and added
  service assertions for `.mp4` extension and the video storage-path suffix.
  Exact SQL readback via `rg -n 'ALTER TYPE "FileCategory" ADD VALUE|ADD COLUMN
"featuredVideoId"|DROP COLUMN "featuredVideoUrl"|LandingSettings_featuredVideoId_fkey'
packages/db/prisma/migrations/20260917140000_landing_featured_video_upload/migration.sql`
  confirmed the enum addition precedes the column/FK statements. No new
  migration safety test was added: the existing migration test is a package-level
  test for another migration, and no colocated migration-test pattern exists
  within this task's authorized scope; the exact SQL verification is recorded
  instead. `pnpm --filter @m199/db db:validate` and `db:generate` passed;
  `pnpm --filter @m199/db exec vitest run src/migration-safety.test.ts
src/landing-seed.test.ts` passed (2 files, 24 tests);
  `pnpm --filter @m199/api exec vitest run src/file-module/file.service.test.ts`
  passed (1 file, 27 tests); `pnpm --filter @m199/api typecheck` passed; and
  `git diff --check` passed. Previously recorded lint, full test, typecheck,
  build, focused LFV checks, and detector results remain valid; the Impeccable
  detector was not rerun per instruction. Repository-wide `pnpm format:check`
  remains non-zero only for the unmodified, out-of-scope documents
  `odd/tasks/admin-image-attachment-restoration.md` and
  `odd/tasks/latest-publications-carousel.md`.
- **Recovery note:** no implementation or focused-test failure remains. Do not
  format unrelated documents without an explicit scope expansion; LFV-4 stays
  unchecked until the repository-wide formatting gate has an authorized
  resolution.

## Next step

When implementation continues, resolve the repository-wide formatting baseline
for LFV-4 with an authorized maintainer decision. After each work unit, update
only this document's progress and evidence sections with observed results before
continuing to the next unit.

## Verification evidence

Exact command output and affected test counts are recorded in the task sections
above. No check is marked complete without observed output.

## Repository-relative locator and Engram mirror

- **Locator:** `odd/tasks/landing-featured-video-upload.md`
- **Engram project:** `m199-page`
- **Engram topic:** `odd/landing-featured-video-upload/tasks`
- **Mirror status:** _Document body mirrored to Engram; exact read-back matched._
