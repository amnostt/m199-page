# Tasks: UI Admin Complete

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~475 total (PR1: ~295, PR2: ~180) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 session/shell → PR 2 Landing Settings editor |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main (resolved by orchestrator)
400-line budget risk: Medium

### PR1 Diff Context

The PR1 total diff exceeds 400 lines primarily because of test code (session.test.ts ~396 lines, AdminApp.test.tsx ~480 lines, App.test.tsx admin route tests ~52 lines). Production code is the intended review slice:
- `adminTypes.ts`: ~10 lines
- `session.ts`: ~110 lines
- `AdminApp.tsx`: ~220 lines
- `App.tsx` (admin route): ~3 lines
- `vite.config.ts` (proxy): ~4 lines

Total production diff: ~347 lines. Tests verify every behavioral path and edge case, which is the correct balance for auth/session infrastructure.

### Stacked-to-main Context

This PR (PR1) targets `main`. PR2 (Landing Settings editor) will target the `feat/ui-admin-session-shell` branch so it inherits the session helpers and admin shell from PR1. Once PR1 is merged to `main`, PR2 will be retargeted to `main` and its diff will only show the Landing Settings editor work — not the session/shell foundation from PR1.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Session helpers, admin types, vite proxy, App.tsx `/admin` route, AdminApp bootstrap/login/shell with placeholders, + tests | PR 1 | Base: main; includes tests and docs |
| 2 | LandingSettingsPage with null normalization, confirm-before-save, loading/error states, + tests | PR 2 | Base: PR1 branch; verifies against LP-01 admin-web and landing-page spec scenarios |

## Phase 1: Foundation — Types, Session, Proxy

- [x] 1.1 Create `apps/web/src/admin/adminTypes.ts` with the `AuthUser` interface needed by PR1; defer `LandingSettings` typing to PR2 with the editor implementation
- [x] 1.2 Create `apps/web/src/admin/session.ts` with `login()`, `refreshSession()`, `logout()`, `adminFetch()` — credentials include, one 401 refresh retry, 403 logout redirect
- [x] 1.3 Add `/auth` proxy entry to `apps/web/vite.config.ts` targeting `API_TARGET` with `changeOrigin: true`
- [x] 1.4 Add `/admin` route detection in `apps/web/src/App.tsx` before public routes — render `<AdminApp>` for `/admin*`

## Phase 2: Admin Shell & Login

- [x] 2.1 Create `apps/web/src/admin/AdminApp.tsx` — on mount: `POST /auth/refresh` bootstrap → AuthUser sets shell; 401/403 shows login; no refresh on login screen
- [x] 2.2 Implement `AdminLogin` inline — email/password form calls `login()`, error state on failure
- [x] 2.3 Implement `AdminShell` with sidebar nav: Landing Settings active, placeholder entries (disabled/hidden) for Posts, Outings, Verses, Responsibles, Files
- [x] 2.4 Implement expired-session redirect: 401 on protected fetch → retry refresh → fail → clear state → show login

## Phase 3: Landing Settings Editor (PR 2)

- [ ] 3.1 Create `apps/web/src/admin/LandingSettingsPage.tsx` — `GET /landing/admin` on mount; normalize null response to empty string form values for all LP-01 fields
- [ ] 3.2 Render editable fields for mission, vision, description, featuredVideoUrl, contactEmail, contactPhone
- [ ] 3.3 Implement save flow: `window.confirm` gate → `PUT /landing/admin` with credentials → success toast/inline message; error state on failure
- [ ] 3.4 Loading state during fetch/save, disabled form during save, error banner on load/save failure

## Phase 4: Testing

- [x] 4.1 Create `apps/web/src/admin/session.test.ts` — unit tests for `login` POST body/credentials, `refreshSession` POST, `logout` POST, `adminFetch` 401 retry, `adminFetch` 403 redirect path
- [x] 4.2 Write admin component tests in `apps/web/src/admin/AdminApp.test.tsx` — bootstrap refresh success/failure, login submit success/error, shell navigation renders placeholders, expired session clears to login
- [ ] 4.3 Write Landing Settings tests — null response normalizes to empty form, confirm triggers before PUT, save success updates UI, save error shows message, loading state blocks interaction

## Phase 5: Cleanup

- [x] 5.1 Remove any temporary debug logs or inline TODO markers
- [x] 5.2 Verify existing public route tests in `App.test.tsx` still pass after `/admin` route insertion
