# Exploration: ui-admin-complete

## Current State

The codebase already has the backend needed for an admin console, but the web app does not expose any admin experience yet.

- `apps/web/src/App.tsx` is a small public-page router for `/`, `/outings`, `/outings/:slug`, `/posts`, and `/posts/:slug`.
- `apps/web/src/main.tsx` just mounts `App`; there is no router package, auth provider, or API client layer.
- `apps/web/package.json` has React/Vite only; no `react-router`, no query/cache library, no session abstraction.
- The API already exposes protected admin endpoints for responsibles, landing settings, outings, posts, verses, and files.
- Auth is cookie-based (`access_token` + `refresh_token`), with refresh rotation, active/inactive enforcement, and global origin checks on mutations.

## Affected Areas

- `apps/web/src/App.tsx` — currently public-only; needs admin routing, layout, loading/error states, and protected navigation.
- `apps/web/src/main.tsx` — may need app-level providers/bootstrap for session state.
- `apps/web/package.json` — likely needs routing and/or shared client dependencies.
- `apps/api/src/auth/*` — session bootstrap and refresh behavior define the frontend contract.
- `apps/api/src/{responsibles,landing,outings,posts,verses,file-module}/*` — admin endpoints the UI must consume.
- `packages/db/prisma/schema.prisma` — source of truth for editable fields, file references, and lifecycle states.

## Approaches

1. **Foundation-first admin shell** — add session bootstrap/refresh handling, a protected admin layout with sidebar/nav, shared table/form/status primitives, then one small vertical slice.
   - Pros: validates the hardest part first (cookie auth + route protection + refresh), keeps review chunks small, and establishes reusable UI patterns.
   - Cons: initial delivery is narrower than a full multi-screen admin.
   - Effort: Medium

2. **Domain-by-domain admin screens** — build full CRUD screens for responsibles, landing, outings, posts, files, and verses directly.
   - Pros: immediate feature coverage per domain.
   - Cons: duplicates layout/feedback work, increases review load, and risks inconsistent UX across screens.
   - Effort: High

## Recommendation

Use the foundation-first slice. Start with cookie-based session bootstrap/refresh, a protected admin shell, sidebar/navigation, and one low-complexity page — ideally the singleton landing settings editor — before expanding into table-heavy CRUD areas. That path fits the current backend shape and keeps the first PR reviewable.

## Risks

- The frontend cannot read httpOnly cookies, so session state must be inferred from `/auth/login` and `/auth/refresh` responses plus 401/403 handling.
- There is no existing `/auth/me` endpoint or web session client, so the session contract must be defined carefully.
- Mutating requests are origin-checked server-side; the UI must send credentials and run under the expected origin or it will see 403s.
- Trying to include every admin screen in one slice will exceed the review budget quickly.

## Ready for Proposal

Yes — the codebase is ready for `sdd-propose`. The proposal should define the admin shell, session bootstrap/refresh contract, route protection, and the first vertical slice boundaries.
