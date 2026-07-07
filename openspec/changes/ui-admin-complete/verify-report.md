# Verification Report: ui-admin-complete — PR1

## Status

PASS

## Scope

Verified PR1 only: admin session helpers, `/admin` routing, bootstrap/login fallback, admin shell/navigation placeholders, loading/error states, tests, and `/auth` dev proxy.

PR2 scope was not implemented: no Landing Settings editor form, no `GET/PUT /landing/admin` web editing flow, no CRUD screens, no roles, no preview, no hero/featured outing/featured posts management.

## Runtime Evidence

| Command | Result | Evidence |
|---|---:|---|
| `pnpm --filter @m199/web test -- src/admin/session.test.ts src/admin/AdminApp.test.tsx src/App.test.tsx` | PASS | 6 files / 100 tests passed after remediation |
| `pnpm test` | PASS | 44 files / 587 tests passed |
| `pnpm typecheck` | PASS | web, db, api typecheck passed |
| `pnpm lint` | PASS | `eslint .` exited cleanly |

## PR1 Compliance

| Criterion | Result | Evidence |
|---|---:|---|
| Admin path routing under `/admin` | PASS | `App.tsx` renders `AdminApp` before public routes; `App.test.tsx` covers `/admin` and `/admin/landing`. |
| Session helpers | PASS | `session.ts` implements `login`, `refreshSession`, `logout`, and `adminFetch` with non-overridable `credentials: "include"`; `session.test.ts` has 16 passing tests. |
| One 401 retry | PASS | `adminFetch` refreshes once, shares in-flight refresh across concurrent 401s, and retries original requests; covered by `session.test.ts`. |
| 403 / failed refresh logout redirect | PASS | `adminFetch` logs out best-effort and redirects to `/admin`; covered by `session.test.ts`. |
| Bootstrap/login fallback | PASS | `AdminApp` uses `refreshSession()`, shows login on 401/403/error, shell on success; covered by `AdminApp.test.tsx`. |
| Login success/failure behavior | PASS | Login form calls `login`, shows shell on success and inline error on failure; covered by `AdminApp.test.tsx`. |
| Admin shell/sidebar/navigation | PASS | Shell renders Landing Settings plus disabled “coming soon” placeholders for Posts, Outings, Verses, Responsibles, Files. |
| Loading/error states | PASS | Bootstrap loading, login submitting disabled state, and login error are implemented and covered. |
| Dev proxy for `/auth` | PASS | `apps/web/vite.config.ts` includes `/auth` proxy to `API_TARGET` with `changeOrigin: true`. |
| PR2 excluded | PASS | Search found no `LandingSettingsPage`, `landing/admin`, editor form, or preview implementation in `apps/web/src/admin`. |

## Strict TDD Compliance

| Check | Result | Details |
|---|---:|---|
| TDD evidence reported | PASS | `sdd/ui-admin-complete/apply-progress` contains a TDD Cycle Evidence table. |
| RED/GREEN evidence for behavioral tasks | PASS | Session, route, shell/login, and App route tests exist and pass. |
| Structural/config direct test evidence | WARNING | `adminTypes.ts` is indirect/type-only and `vite.config.ts` `/auth` proxy is source-inspected, not directly asserted by a test. |
| Assertion quality | PASS | Placeholder-navigation tests assert disabled button semantics and `(coming soon)` markers. |

## Risks

- PR2 scenarios in `landing-page/spec.md` remain intentionally unverified for this PR because the Landing Settings editor is out of scope.

## Verdict

PASS — PR1 implementation matches the requested admin session and shell foundation, all executed checks are clean, and PR2 scope is not present. The remaining caveat is limited to structural/config evidence strength for type-only and Vite proxy work.

---

## Remediation Applied (2026-07-07)

### Round 1 — `/admin` route & placeholder nav test

| Warning | Fix | Test |
|---------|-----|------|
| Broad `/admin` route (`startsWith("/admin")` matches `/administrator`) | `App.tsx:474`: changed to `=== "/admin" \|\| startsWith("/admin/")` | `App.test.tsx`: `"/administrator does NOT match admin route"` — proves landing renders, admin-loading/login/shell absent |
| Weak placeholder nav test (label-only, no disabled assertion) | `AdminApp.test.tsx`: strengthened to assert `tagName === "BUTTON"`, `disabled === true`, and `"(coming soon)"` marker per placeholder | 14 tests pass with strengthened assertions |

Post-remediation: **588/588 monorepo tests pass** (96 web + 470 api + 22 db). Typecheck and lint clean.

### Round 2 — pre-PR review hardening (2026-07-07)

| Fix | Detail |
|-----|--------|
| `adminFetch` forces `credentials: "include"` after caller init | Caller cannot override credentials (e.g. `credentials: "omit"` is ignored). Spread order is `{ ...init, credentials: "include" }`. |
| In-flight refresh promise instead of global `retrying` boolean | Concurrent 401 calls share one `refreshSession()` call. Replaced `let retrying = false` with `let refreshInFlight: Promise<AuthUser> \| null`. |
| Removed `__resetRetrying()` export | No longer needed with the promise pattern. |
| `logout()` throws on non-OK response | Callers in `adminFetch` catch it best-effort; `AdminApp.handleLogout` catches and shows error. |
| `AdminApp` uses exported `refreshSession()` for bootstrap | Replaces raw `fetch("/auth/refresh", ...)` with the typed helper. |
| `AdminApp` logout failure keeps shell + shows error | `logoutError` state drives an `admin-logout-error` span in the footer. User is not cleared on failure. |
| Tests: credentials override, concurrent 401 refresh, logout throw, AdminApp logout error | 4 new tests added across `session.test.ts` and `AdminApp.test.tsx`. |
| Test comments tightened | Overstated "non-401 errors" → "non-auth server errors (500)"; "expired session" comment narrowed to what AdminApp actually tests. |
