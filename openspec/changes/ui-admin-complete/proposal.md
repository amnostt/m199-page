# Proposal: UI Admin Complete

## Intent

Add a protected admin foundation so internal responsible users can manage MVP content safely. The first reviewable slice proves cookie-based session handling, protected `/admin` routing, admin navigation, and the LP-01 Landing Settings editor without expanding into all admin domains.

## Scope

### In Scope
- Auth/session bootstrap and refresh handling needed for protected admin routes.
- Protected `/admin` login/session flow with expired sessions redirecting directly to login.
- Admin shell, sidebar, and navigation foundation.
- Landing Settings editor for LP-01 base fields only: mission, vision, description, featured video URL, and contact fields.
- Shared loading, error, and confirmation patterns needed by the Landing Settings slice; every save requires confirmation.

### Out of Scope
- Full CRUD screens for posts, outings, verses, responsibles, and files.
- Role-based permissions; every active responsible user can manage everything in MVP.
- Landing preview, hero image, featured outing, and featured posts management.
- Polished visual redesign beyond a usable admin baseline.

## Capabilities

### New Capabilities
- `admin-web`: Protected admin web experience covering login/session handling, `/admin` route protection, admin shell/navigation, expired-session redirect, and baseline feedback patterns.

### Modified Capabilities
- `landing-page`: Add web admin editing for LP-01 base Landing Settings fields only, with confirmed saves and no preview in the first slice.

## Approach

Use the exploration recommendation: build foundation-first. Add a web session client around existing httpOnly cookie login/refresh behavior, guard `/admin`, render a minimal admin shell, then deliver one vertical slice against `GET/PUT /landing/admin`. Keep permission logic flat: active responsible users have full MVP admin access.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/App.tsx` | Modified | Add admin routing and route protection. |
| `apps/web/src/main.tsx` | Modified | Add app-level session/bootstrap providers if needed. |
| `apps/web/src/admin/` | New | Admin shell, login flow, Landing Settings page, shared states. |
| `apps/web/src/lib/` | Modified | Add credentialed API/session helpers. |
| `apps/api/src/auth/*` | Referenced | Existing cookie login/refresh/logout contract drives web behavior. |
| `apps/api/src/landing/*` | Referenced | Existing LP-01 admin endpoints power the first editor. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| httpOnly cookies hide client session state | Med | Infer state through bootstrap/refresh and 401/403 handling. |
| First slice grows beyond review budget | Med | Defer non-LP-01 fields and CRUD domains; ask before large PR. |
| Save mistakes affect public content | Med | Confirm every save and show clear loading/error states. |

## Rollback Plan

Revert the web admin route, session helpers, admin components, and related tests. Existing API auth and landing endpoints remain unchanged, so public site behavior continues to work.

## Dependencies

- Existing responsible users are internal-only and created by seed/manual setup.
- Existing `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /landing/admin`, and `PUT /landing/admin` contracts.

## Success Criteria

- [ ] Active responsible users can access `/admin`; unauthenticated or expired sessions reach login.
- [ ] Landing Settings base LP-01 fields load, edit, confirm, save, and show errors safely.
- [ ] First slice excludes preview, hero image, featured outing, featured posts, roles, and other CRUD screens.
