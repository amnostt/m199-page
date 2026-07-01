# Tasks: Auth and Responsible Users

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 750–850 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Auth module → PR 2: Responsibles module |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Auth module: login, refresh, logout, guard, interceptor + tests | PR 1 | Independent; auth works without responsibles |
| 2 | Responsibles module: CRUD, password reset, wiring + tests | PR 2 | Depends on AuthGuard from PR 1 |

## Phase 1: Dependencies and Wiring

- [x] 1.1 Add `@nestjs/jwt`, `bcryptjs`, `cookie-parser`, `@types/cookie-parser` to `apps/api/package.json`
- [x] 1.2 Add `cookie-parser` middleware in `apps/api/src/main.ts` before `app.listen()`
- [x] 1.3 Create `apps/api/src/auth/auth.constants.ts` with cookie names (`ACCESS_TOKEN`, `REFRESH_TOKEN`) and TTL values (15m, 7d)

## Phase 2: Auth Module

- [x] 2.1 Create `apps/api/src/auth/dto/login.dto.ts` with `email` (`@IsEmail`) and `password` (`@MinLength(8)`)
- [x] 2.2 Create `apps/api/src/auth/auth.service.ts` — `login()` (bcrypt compare, JWT sign, refresh generation, insert session, set cookies), `refresh()` (hash cookie, rotate token in tx, revoke old), `logout()` (revoke session, clear cookies)
- [x] 2.3 Create `apps/api/src/auth/auth.guard.ts` — extract `access_token` cookie, verify JWT, check user ACTIVE, attach `{id, email, displayName}` to request; return 401/403 on failure
- [x] 2.4 Create `apps/api/src/auth/auth.interceptor.ts` — validate `Origin` header on POST/PUT/PATCH/DELETE (configurable via `API_ORIGIN` env), exempt GET/HEAD/OPTIONS
- [x] 2.5 Create `apps/api/src/auth/auth.controller.ts` — POST `/auth/login`, `/auth/refresh`, `/auth/logout`
- [x] 2.6 Create `apps/api/src/auth/auth.module.ts` — register `JwtModule.register({ secret: env, signOptions: { expiresIn: '15m' } })`, export `AuthGuard`

## Phase 3: Responsibles Module

- [x] 3.1 Create `apps/api/src/responsibles/dto/create-responsible.dto.ts` (email, displayName, password), `update-responsible.dto.ts` (Partial<displayName, status>), `reset-password.dto.ts` (newPassword)
- [x] 3.2 Create `apps/api/src/responsibles/responsibles.service.ts` — CRUD, deactivation→bulk-revoke sessions, password-reset→bcrypt hash + bulk-revoke sessions; never return `passwordHash`
- [x] 3.3 Create `apps/api/src/responsibles/responsibles.controller.ts` — CRUD + `PATCH /:id/password` behind `@UseGuards(AuthGuard)`
- [x] 3.4 Create `apps/api/src/responsibles/responsibles.module.ts` (imports AuthModule)
- [x] 3.5 Wire modules: import `AuthModule` and `ResponsiblesModule` in `apps/api/src/app.module.ts` _(PR 1: AuthModule wired; ResponsiblesModule pending for PR 2)_

## Phase 4: Testing

- [x] 4.1 Unit: `auth.service.test.ts` — mock DbService, test login (AR-01 active/invalid/inactive), refresh rotation (AR-02 valid/revoked/inactive), logout (AR-03)
- [x] 4.2 Unit: `auth.guard.test.ts` — test JWT verification, cookie extraction, status enforcement (AR-05)
- [x] 4.3 Unit: `auth.interceptor.test.ts` — test Origin validation on mutation endpoints, bypass for safe methods
- [x] 4.4 Unit: `responsibles.service.test.ts` — CRUD, bulk revocation on deactivate (AR-07) and password reset (AR-08)
- [x] 4.5 Integration: `auth.controller.test.ts` — DTO validation errors, cookie headers, error envelopes (AR-01, AR-02, AR-03)
- [x] 4.6 Integration: `responsibles.controller.test.ts` — CRUD (AR-06), password reset (AR-08), no registration endpoint (AR-09), equal access (AR-10)
- [x] 4.7 Integration: lifecycle test — login→refresh→logout→refresh-rejected (AR-02, AR-03, AR-04)

## Phase 5: Cleanup

- [x] 5.1 Update `docs/technical-foundation.md` to document auth cookie flow, session lifecycle, and CSRF protection strategy
