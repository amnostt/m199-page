# Tasks: Outings Admin UI

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2200 (7 new + 5 modified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | WU1 Foundation → WU2 List/Shell → WU3 Form |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
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

- [ ] 2.1 RED: `apps/web/src/admin/OutingsListPage.test.tsx` — filter, loading/empty/error, archive confirm+decline, server-error render
- [ ] 2.2 GREEN: `apps/web/src/admin/OutingsListPage.tsx` — server-filtered list, confirmed archive, no removal controls
- [ ] 2.3 GREEN: `apps/web/src/admin/OutingsPage.tsx` — owner state machine mirroring `PostsPage`
- [ ] 2.4 RED: `apps/web/src/admin/AdminApp.test.tsx` — Outings nav active, placeholder removed, no router
- [ ] 2.5 GREEN: `apps/web/src/admin/AdminApp.tsx` — add "outings" to `AdminSection`, active nav, render `OutingsPage`; drop from PLACEHOLDER_SECTIONS
- [ ] 2.6 REFACTOR: extract `useApiList` if duplication emerges

## Phase 3: Form Page (Create / Edit)

- [ ] 3.1 RED: `apps/web/src/admin/OutingFormPage.test.tsx` — create, edit, 3 upload slots, Draft/Publish, validation error, preserve assets
- [ ] 3.2 GREEN: `apps/web/src/admin/OutingFormPage.tsx` — required fields, ISO dateTime, three FileUploadWidget slots (no removal), confirmed Draft/Publish
- [ ] 3.3 REFACTOR: extract `useOutingForm` hook to slim component

## Phase 4: Verification

- [ ] 4.1 `pnpm --filter @m199/web test:run` — all green
- [ ] 4.2 `pnpm typecheck` — clean
- [ ] 4.3 `pnpm lint` — clean
- [ ] 4.4 Manual smoke: list, filter, create, edit (assets preserved), archive, API errors surface
