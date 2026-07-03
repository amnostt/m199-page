# Exploration: outings

## Current State

Step 7 is the next roadmap slice. There is no `outings` API module yet, but the schema already contains the technical domain: `Outing`, `OutingLike`, `FileAsset`, and `LandingSettings.featuredOutingId`. The landing home already consumes a featured outing from that model; the product-facing Spanish label can remain `Salidas`.

The API already has the patterns this feature should follow:
- split public/admin controllers (`landing`, `files`)
- `AuthGuard` on all admin mutating routes
- `DbService` boundary with minimal Prisma interfaces
- strict DTO validation via `ValidationPipe`
- public file serving via `/files/:id`

The web app is still landing-only; there is no `/outings` route or admin UI. Tests are established with Vitest + Nest TestingModule and controller/service fixtures.

## Affected Areas

- `packages/db/prisma/schema.prisma` — `Outing`, `OutingLike`, `FileAsset`, and landing references define the domain model that outings will reuse.
- `apps/api/src/app.module.ts` — will need a new module registration for the Outings feature.
- `apps/api/src/outings` — new module, routes, DTOs, services, controllers, and tests.
- `apps/api/src/auth/*` — provides AuthGuard and CSRF/origin enforcement for admin routes.
- `apps/api/src/file-module/*` — supplies upload/serve/delete patterns for main image, croquis, and plan assets.
- `apps/api/src/landing/*` — already references featured outings and establishes the singleton editorial pattern.
- `apps/api/src/responsibles/*` — shows the protected admin CRUD pattern and session revocation conventions.
- `apps/web/src/App.tsx` — currently only renders landing; `/outings` UI does not exist yet.
- `apps/api/src/**/*.test.ts` — the repo’s test conventions to follow for new controllers/services.

## Approaches

1. **Add a dedicated Outings module over the existing Outing domain** — add admin CRUD, public listing/detail endpoints, and anonymous likes on top of `Outing`/`OutingLike`.
   - Pros: reuses the existing schema, matches current module/controller patterns, keeps technical names consistent with the codebase, and still supports the `Salidas` product label.
   - Cons: product copy and technical naming must remain intentionally separated.
   - Effort: Medium

2. **Create a broader content layer that abstracts outings/posts/landing together** — introduce a shared editorial/content service now and hang outings off it.
   - Pros: cleaner long-term reuse if more content types converge later.
   - Cons: too much surface area for Step 7, increases coupling, and does not match the repo’s currently small, explicit module style.
   - Effort: High

## Recommendation

Use the dedicated `Outings` module at `apps/api/src/outings` on top of the existing `Outing`/`OutingLike` models. Expose public routes under `/outings` and admin routes under `/outings/admin`. Keep `Salidas` as product-facing Spanish copy where appropriate.

## Risks

- Product copy says `Salidas` while technical artifacts say `Outings`; specs must keep that boundary explicit.
- Anonymous likes need a privacy-safe visitor fingerprint strategy; the schema expects `visitorHash`, but the application rule is still only documented, not implemented.
- The one-featured-outing rule already exists in landing settings; outings must not create conflicting editorial ownership.

## Ready for Proposal

Yes — the codebase is mapped enough for proposal. The next proposal should define the Outings API surface, public web pages, upload usage for outing assets, the one-featured-outing rule, and anonymous-like enforcement.
