# Proposal: Landing Admin Public

## Intent

Deliver roadmap Step 6: responsible users can edit the public landing content, and visitors can see a real landing page instead of the current web shell.

## Scope

### In Scope
- Extend `LandingSettings` with mission, vision, description, featured video, and minimal contact fields.
- Add protected landing admin API for reading/updating singleton landing settings.
- Add public landing API that assembles hero, featured outing, featured posts, current verse, and fallbacks.
- Replace the Vite shell with a public landing page consuming the public payload.

### Out of Scope
- Full admin UI beyond API support.
- CRUD for outings, posts, verses, or rich page-builder blocks.
- Comments, search, newsletter/contact workflows, analytics, or publication scheduling.

## Capabilities

### New Capabilities
- `landing-page`: Editable landing settings, protected admin access, public landing payload, and first public web rendering.

### Modified Capabilities
- `mvp-technical-foundation`: Extend the existing MVP domain model with the remaining landing content fields required by Step 6.
- `file-management`: Reuse existing public file serving and `LANDING_HERO`; no requirement change expected unless specs require explicit landing usage.

## Approach

Use the singleton-settings approach from exploration. Keep editorial fields on `LandingSettings`, reference existing featured content models, expose one authenticated admin update path, and expose one public read path that tolerates missing featured/current records.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/db/prisma/schema.prisma` | Modified | Add minimal landing fields and migration. |
| `apps/api/src/app.module.ts` | Modified | Register landing module. |
| `apps/api/src/landing/*` | New | Controllers, service, DTOs, tests. |
| `apps/web/src/App.tsx` | Modified | Render public landing from API payload. |
| `openspec/specs/*` | Modified/New | Add landing capability and domain-model delta. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing featured content breaks homepage | Med | Public API returns null/empty sections with UI fallbacks. |
| Landing schema grows too broad | Med | Limit Step 6 fields to roadmap content only. |
| Current verse source is incomplete | Med | Resolve latest/current verse with explicit empty-state fallback. |

## Rollback Plan

Revert the landing module, web rendering, and Prisma migration. If migration already ran, apply a follow-up migration that removes only newly added landing fields after confirming no production editorial data must be preserved.

## Dependencies

- Existing auth guard/responsible-user pattern.
- Existing file serving and `LANDING_HERO` upload category.
- Existing `LandingSettings`, `FeaturedPost`, `Outing`, `Post`, and `Verse` models.

## Success Criteria

- [ ] Authenticated responsible users can read/update landing settings through API.
- [ ] Public visitors receive a stable landing payload and see a rendered home page.
- [ ] Empty/missing featured outing, posts, hero image, or verse do not break rendering.
- [ ] Tests, typecheck, and lint pass for changed API/web/db areas.
