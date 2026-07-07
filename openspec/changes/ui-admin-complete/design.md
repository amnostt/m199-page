# Design: UI Admin Complete

## Technical Approach

Build a small `/admin` vertical slice inside the existing Vite React app without adding routing/state libraries. Keep public routes path-based as today, branch admin paths first in `App.tsx`, and move admin behavior into `apps/web/src/admin/`. Session state is inferred through the existing httpOnly cookie API: login sets cookies, refresh bootstraps/rotates cookies, and protected admin API calls use `credentials: "include"`.

Non-goals: roles/permissions, landing preview, hero image, featured outing, featured posts, and CRUD screens for posts/outings/verses/responsibles/files.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|----------|--------|-------------------------|-----------|
| Routing | Keep lightweight path-based routing and add `/admin` matching before public routes. | Add React Router. | Existing app uses manual routing; adding a dependency for one admin slice is not justified. |
| Session | `admin/session.ts` exposes `login`, `refreshSession`, `logout`, and `adminFetch` with cookie credentials. | Client-readable JWTs/localStorage. | API already uses httpOnly cookies; duplicating tokens weakens the contract. |
| Bootstrap | `AdminApp` calls `POST /auth/refresh` on mount for protected routes; failed refresh shows login. | Add `/auth/me`. | No current me endpoint exists; refresh already returns `AuthUser` and rotates cookies. |
| 401/403 | `adminFetch` retries one refresh on 401, redirects to login on refresh failure or 403. | Let each page handle auth errors. | Central handling keeps the first slice small and consistent. |
| Save | Landing Settings uses a native confirmation gate before `PUT /landing/admin`. | Custom modal component. | Confirmation is required now; native confirm avoids extra UI code/dependencies. |

## Data Flow

```text
/admin request ──→ App route match ──→ AdminApp
                                      │
                                      ├─ POST /auth/refresh (credentials)
                                      │      ├─ 200 AuthUser → AdminShell
                                      │      └─ 401/403 → AdminLogin
                                      │
Landing Settings ── GET /landing/admin ── normalize null to empty form ── edit form ── confirm ── PUT /landing/admin
        │                  │                              │
        └──── loading/error states              401 retry refresh, 403 logout/login
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/App.tsx` | Modify | Detect `/admin` and render `AdminApp`; keep public route behavior unchanged. |
| `apps/web/src/admin/AdminApp.tsx` | Create | Session bootstrap, login fallback, admin shell composition, and child-route selection. |
| `apps/web/src/admin/session.ts` | Create | Typed auth helpers and `adminFetch` one-refresh retry behavior. |
| `apps/web/src/admin/LandingSettingsPage.tsx` | Create | LP-01 base-field form, load/save states, confirmation-before-save. |
| `apps/web/src/admin/adminTypes.ts` | Create | `AuthUser` and `LandingSettings` contracts mirroring API response fields used by web. |
| `apps/web/src/admin/AdminApp.test.tsx` | Create | Admin route/session/login/shell/landing tests. |
| `apps/web/vite.config.ts` | Modify | Add `/auth` dev proxy so cookie auth calls reach the NestJS API locally. |

## Interfaces / Contracts

```ts
interface AuthUser { id: string; email: string; displayName: string }
interface LandingSettings {
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}
```

API assumptions: `POST /auth/login` accepts `{ email, password }`, returns `AuthUser`, and sets cookies; `POST /auth/refresh` returns `AuthUser`; `POST /auth/logout` clears cookies; `GET/PUT /landing/admin` are protected and accept partial landing DTO fields. `GET /landing/admin` may return `null` when no singleton row exists yet; the editor MUST normalize that state into empty LP-01 form values instead of crashing. `PUT` sends only LP-01 base fields listed above.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Session helper credentials, one 401 refresh retry, 403 logout/login path. | Vitest with mocked `fetch`. |
| Component | `/admin` bootstrap, login success/failure, shell navigation placeholders, Landing Settings load/null/save/confirm/error. | React Testing Library; keep StrictMode-safe helpers. |
| Contract | Existing API auth and landing controller behavior. | Rely on existing API tests; add web tests asserting endpoint/method/body/credentials assumptions. |
| E2E | Not in first slice. | Manual local smoke only: login, edit field, confirm save, reload. |

## Migration / Rollout

No data migration required. Roll out as one reviewable admin-foundation PR if it stays near 400 changed lines; if implementation exceeds that, split into PR 1 session/shell and PR 2 Landing Settings editor.

## Resolved Questions

- Native `window.confirm` is acceptable for the MVP confirmation pattern. A custom confirmation dialog is deferred until admin UI polish work.
