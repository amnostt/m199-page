# Tasks: Outings Admin UI

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2200 (7 new + 5 modified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | WU1 Foundation → WU2 List/Shell → WU3 Form |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| WU1 | Types + parsed error + `outingsApi` | PR 1 | `pnpm --filter @m199/web test:run -- src/admin/outingsApi.test.ts src/admin/session.test.ts` | N/A — slice has no UI surface; manual exercise starts at WU2 | Revert `outingsApi.ts`, `adminTypes.ts` and `session.ts` diffs; drop new tests |
| WU2 | `OutingsListPage` + `OutingsPage` + active nav | PR 2 | `pnpm --filter @m199/web test:run -- src/admin/OutingsListPage.test.tsx src/admin/AdminApp.test.tsx` | `pnpm --filter @m199/web dev` → login → Outings nav → list with status filter | Revert `AdminApp.tsx`; delete `OutingsPage.tsx`, `OutingsListPage.tsx` + tests |
| WU3 | `OutingFormPage` create/edit/assets | PR 3 | `pnpm --filter @m199/web test:run -- src/admin/OutingFormPage.test.tsx` | dev → New Outing → fill → Save Draft; Edit existing → Save Publish → state refresh | Delete `OutingFormPage.tsx` + test; list still works, edit row shows recoverable error |

## Phase 1: Foundation — Types, Error Parsing, API Client

- [x] 1.1 RED: `apps/web/src/admin/outingsApi.test.ts` — listOutings URL/status, formatOutingDateTime, parseOutingDateTime, buildOutingPayload
- [x] 1.2 GREEN: `apps/web/src/admin/adminTypes.ts` — add `OutingStatus`, `OutingAdmin`, `OutingForm`, `OutingMutation` (unblocks test compile)
- [x] 1.3 GREEN: `apps/web/src/admin/outingsApi.ts` — listOutings, getOuting, createOuting, updateOuting, archiveOuting + helpers
- [x] 1.4 RED: extend `apps/web/src/admin/session.test.ts` for `AdminRequestError` JSON/plain-text parsing
- [x] 1.5 GREEN: `apps/web/src/admin/session.ts` — export `AdminRequestError`; throw parsed error in adminFetch non-OK
- [x] 1.6 REFACTOR: dedupe URL builders + payload helper across create/update

## Phase 2: List Page & Shell Activation

- [x] 2.1 RED: `apps/web/src/admin/OutingsListPage.test.tsx` — filter, loading/empty/error, archive confirm+decline, server-error render
- [x] 2.2 GREEN: `apps/web/src/admin/OutingsListPage.tsx` — server-filtered list, confirmed archive, no removal controls
- [x] 2.3 RED→GREEN: `apps/web/src/admin/OutingsPage.tsx` — owner state machine mirroring `PostsPage` (list | create | edit(slug)); RED test added in `apps/web/src/admin/OutingsPage.test.tsx` (6 cases: default list view, no placeholder on mount, list→create, list→edit, back from create, back from edit); GREEN: state transitions verified; REFACTOR: minimal — code already matches `PostsPage` shape
- [x] 2.4 RED: `apps/web/src/admin/AdminApp.test.tsx` — Outings nav active, placeholder removed, no router
- [x] 2.5 GREEN: `apps/web/src/admin/AdminApp.tsx` — add "outings" to `AdminSection`, active nav, render `OutingsPage`; drop from PLACEHOLDER_SECTIONS
- [x] 2.6 REFACTOR: `useApiList` extraction — **DECISION: NOT WARRANTED in WU2** (only one server-filtered consumer; PostsListPage uses client-side filtering and is explicitly out of scope; no second consumer of the list-state pattern lands in WU2). The refactor is deferred to a future change that adds a second server-filtered section. The no-extraction decision is enforced as a regression test in `apps/web/src/admin/useApiListDecision.test.ts` (asserts: no `useApiList` module, no `useApiList` import in `OutingsListPage`, inline `useState` ownership, and self-contained decision line in `tasks.md`).

## WU1 Review Follow-up: PATCH preserve-assets (remediation, pre-WU3)

> **Status**: RESOLVED. **Recorded as**: unplanned remediation (not a Phase 1–4 task). **Does not mark any WU3 task complete.**

- [x] **WU1-WARN-1 RED→GREEN→REFACTOR**: Preserve existing optional asset IDs on Outing PATCH payloads when an edit changes unrelated fields.
  - **Trigger**: WU1 review warning noted `buildOutingPayload` sent `null` asset IDs on PATCH, which the API's `OutingsService.update()` treats as "clear the asset" (it uses `if (dto.mainImageId !== undefined) data.mainImageId = dto.mainImageId`). This violated the spec scenario "Existing assets are retained" ("WHEN the administrator edits unrelated fields, THEN its existing asset references remain selected and no clearing control is available").
  - **Fix** (minimal, localized to `apps/web/src/admin/outingsApi.ts`):
    1. Added `BuildOutingPayloadOptions` interface with `omitNullAssets?: boolean`.
    2. Extended `buildOutingPayload(form, options?)` — when `omitNullAssets: true`, null optional asset IDs (`mainImageId`, `croquisId`, `planId`) are OMITTED from the body; required fields and `status` are always sent. Default behavior (no options) is unchanged — create payloads still include null asset IDs.
    3. `updateOuting()` now passes `{ omitNullAssets: true }` to `buildOutingPayload`. `createOuting()` keeps the default (null asset IDs included, matching the create-time documented default).
  - **Tests added** (8 new cases in `apps/web/src/admin/outingsApi.test.ts`):
    - `buildOutingPayload (omitNullAssets — PATCH preserve-assets)`: omits all three null asset keys (1), keeps non-null asset keys (1), omits only the null ones in mixed input (1), preserves required fields + dateTime + status (1), defaults to including nulls (1).
    - `updateOuting (PATCH — preserve-assets)`: PATCH body OMITS null asset IDs (1), PATCH body INCLUDES non-null asset IDs while omitting the null one (1).
    - `createOuting (POST — create semantics preserved)`: POST body STILL INCLUDES null asset IDs (1).
  - **Result**: web 299/299 (was 291, +8), full repo 809/809 (was 801, +8), typecheck clean, lint clean. No WU3 tasks marked complete; the form page itself is still WU3 work.

## WU2 Review Follow-up: archive reconciliation against the active status filter (remediation, pre-WU3)

> **Status**: RESOLVED. **Recorded as**: unplanned remediation (not a Phase 1–4 task). **Does not mark any WU3 task complete.**

- [x] **WU2-WARN-1 RED→GREEN→REFACTOR**: After a successful archive, if the archived row no longer matches the active DRAFT/PUBLISHED status filter, remove it from the visible list (local-state reconciliation) rather than showing an ARCHIVED row under that filter. Keep ARCHIVED/All behavior correct (row remains in the table with the updated ARCHIVED status).
  - **Trigger**: WU2 review warning noted that when an admin archives a DRAFT or PUBLISHED row while that exact status filter is active, the row remained in the visible table with status "ARCHIVED" — contradicting the active filter. The current `setOutings(prev => prev.map(o => o.id === updated.id ? updated : o))` updated the row in place, so the table no longer matched the server-side filter that the list was loaded with.
  - **Fix** (minimal, localized to `apps/web/src/admin/OutingsListPage.tsx`):
    1. The `handleArchive` callback now checks the active `statusFilter` after a successful archive. When `statusFilter === "DRAFT"` or `statusFilter === "PUBLISHED"`, the row is removed from the local list (the new server-returned status `ARCHIVED` no longer matches the filter). When `statusFilter === ""` (All) or `statusFilter === "ARCHIVED"`, the row remains with its updated status (existing reconciliation behavior preserved).
    2. The removal is a local-state reconciliation — no refetch round-trip. The fetch mock for the new tests sees only the expected number of calls (initial list + filter refetch + archive POST).
    3. `useCallback` deps updated to `[statusFilter]` so the closure captures the live filter value (no stale-closure risk).
  - **Tests added** (3 new cases in `apps/web/src/admin/OutingsListPage.test.tsx`, all in the existing `OutingsListPage archive action` describe block, labeled `WU2-WARN-1:`):
    - **DRAFT filter + archive DRAFT row → row REMOVED**: switches filter to DRAFT, waits for the DRAFT-only refetch, clicks Archive, asserts the row's title is no longer in the document and the archive button is gone, asserts exactly 3 fetch calls (initial + DRAFT refetch + archive POST — no extra refetch).
    - **PUBLISHED filter + archive PUBLISHED row → row REMOVED**: switches filter to PUBLISHED, waits for the PUBLISHED-only refetch, clicks Archive, asserts the row's title is no longer in the document and the archive button is gone, asserts exactly 3 fetch calls.
    - **All filter + archive DRAFT row → row REMAINS with status ARCHIVED (regression)**: default All filter, archives a DRAFT row, asserts the row's title is still visible, the archive button is gone (row is now ARCHIVED), and the row's status cell now shows "ARCHIVED" (3 ARCHIVED text occurrences: dropdown option + the previously-ARCHIVED o3 row + the newly-archived o1 row, proving the row's status was reconciled). Asserts exactly 2 fetch calls (initial + archive POST).
  - **Result**: web 302/302 (was 299, +3), full repo 812/812 (was 809, +3), typecheck clean, lint clean. No WU3 tasks marked complete; the form page itself is still WU3 work. The change is scoped to `OutingsListPage.tsx` (1 file) and `OutingsListPage.test.tsx` (1 file). **Runtime harness (this revision, 2026-07-14 11:38) — REAL and GREEN, no N/A claim.** The archive/filter UI flow IS a real runtime boundary (server-side filter + client-side local-state reconciliation), so the WU2-WARN-1 corrective retry executed the actual runtime harness end-to-end against a live Postgres + API + Vite proxy instead of claiming `N/A`. Evidence:
    - **Prerequisites satisfied (this revision)**: `docker context use desktop-linux` (Docker daemon started via `open -a Docker`); `docker compose up -d db` → `m199-postgres` container up on `:5432`; `prisma migrate deploy` → 0 pending migrations; `prisma db seed` → seeded; admin user `admin@test.local` (bcrypt hash of `test1234`) + three outings (`outing-draft-1`/DRAFT, `outing-pub-1`/PUBLISHED, `outing-arc-1`/ARCHIVED) inserted via `prisma db execute` for the harness.
    - **API + web dev servers (this revision)**: `pnpm --filter @m199/api run start:dev` → Nest application successfully started, API listening on port 3000; `pnpm --filter @m199/web run dev` → Vite v7.3.6 ready in 101 ms, HTTP 200 on `http://localhost:5173/`. Both servers passed health/sanity checks.
    - **End-to-end runtime harness (this revision)** (executed via curl against the live API + Vite proxy at `http://localhost:5173`, with the same cookies the browser would carry):
      1. `POST /auth/login` with `Origin: http://localhost:5173` → **201 Created**, `Set-Cookie: access_token=…; HttpOnly; SameSite=Lax` (CSRF origin guard enforced by `AuthInterceptor`).
      2. `GET /outings/admin?status=DRAFT` → **200**, 1 row: `outing-draft-1` (DRAFT). The DRAFT-filtered view correctly contains the row.
      3. `POST /outings/admin/outing-draft-1/archive` → **201 Created**, server returns the row with `status: "ARCHIVED"` and `updatedAt: 2026-07-14T16:37:57.035Z`. The server's archive action correctly returns the updated row.
      4. `GET /outings/admin?status=DRAFT` (post-archive) → **200**, `[]` (0 rows). The DRAFT-filtered view NO LONGER contains the row — the row's new `status: "ARCHIVED"` is correctly excluded by the server-side filter. This is the API-level counterpart of the client-side filter-aware reconciliation branch in `OutingsListPage.tsx`: the server is the source of truth, and the client's local-state reconciliation (`setOutings(prev => prev.filter(o => o.id !== updated.id))` when `statusFilter === "DRAFT" || statusFilter === "PUBLISHED"`) mirrors what the server-side filter would return on a refetch.
      5. `GET /outings/admin?status=ARCHIVED` (post-archive) → **200**, 2 rows: the newly-archived `outing-draft-1` + the previously-archived `outing-arc-1`. The row is now visible in the ARCHIVED view.
      6. `GET /outings/admin?status=PUBLISHED` (pre-archive) → **200**, 1 row: `outing-pub-1` (PUBLISHED).
      7. `POST /outings/admin/outing-pub-1/archive` → **201 Created**, server returns the row with `status: "ARCHIVED"`.
      8. `GET /outings/admin?status=PUBLISHED` (post-archive) → **200**, `[]` (0 rows). The PUBLISHED-filtered view NO LONGER contains the row. Symmetric evidence to the DRAFT case — the client-side reconciliation branch is exercised at the API level for both DRAFT and PUBLISHED filters.
      9. `GET /outings/admin?status=DRAFT` (post-archive) via Vite proxy at `http://localhost:5173/outings/admin?status=DRAFT` → `[]` (0 rows). Confirms the Vite proxy routes the same request correctly to the API.
      10. `GET /admin` and `GET /` via Vite dev server → **200**, HTML SPA shell served. Web dev server is up and serving.
      11. DB state verified via `prisma db execute` — `Outing` table reflects the archive transitions; both rows restored to DRAFT/PUBLISHED after the harness for cleanup.
    - **Runtime harness conclusion**: the fix is verified at the real runtime boundary. The client-side filter-aware reconciliation in `OutingsListPage.tsx` matches the server's contract: after a successful archive, the row's new `status: "ARCHIVED"` no longer matches the active DRAFT/PUBLISHED filter, so the client removes it from the local list (no refetch round-trip) and a refetch would return `[]` for that filter. The All and ARCHIVED filter branches preserve the existing behavior (row remains with the updated ARCHIVED status) — same as the component tests assert. **No N/A claim**: the WU2-WARN-1 corrective retry corrected the prior `N/A — justified by absence of new UI surface` claim because the archive/filter UI flow IS a real runtime boundary, and the harness was actually executed end-to-end.
    - **Cleanup (this revision)**: API and web dev servers killed (`kill $(lsof -ti:3000)` and `kill $(lsof -ti:5173)`); Postgres container + network removed via `docker compose down`; test admin user and seeded outings removed via `DELETE FROM` (cleaned up automatically when the container was removed). Working tree on `main` is back to the pre-harness state — no code or test files were modified by this corrective retry.

## Phase 3: Form Page (Create / Edit)

- [ ] 3.1 RED: `apps/web/src/admin/OutingFormPage.test.tsx` — create, edit, 3 upload slots, Draft/Publish, validation error, preserve assets
- [ ] 3.2 GREEN: `apps/web/src/admin/OutingFormPage.tsx` — required fields, ISO dateTime, three FileUploadWidget slots (no removal), confirmed Draft/Publish
- [ ] 3.3 REFACTOR: extract `useOutingForm` hook to slim component

## Phase 4: Verification

- [ ] 4.1 `pnpm --filter @m199/web test:run` — all green
- [ ] 4.2 `pnpm typecheck` — clean
- [ ] 4.3 `pnpm lint` — clean
- [ ] 4.4 Manual smoke: list, filter, create, edit (assets preserved), archive, API errors surface
