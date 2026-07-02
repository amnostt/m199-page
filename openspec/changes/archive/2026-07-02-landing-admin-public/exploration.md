# Exploration: landing-admin-public

## Current State

Step 6 in `docs/development-roadmap.md` calls for an editable public landing with mission, vision, description, featured video, minimal contact, featured outing, featured posts, and current verse.

The repo already has the key building blocks:
- `packages/db/prisma/schema.prisma` already defines `LandingSettings` with `heroTitle`, `heroSubtitle`, `heroImageId`, and `featuredOutingId`, plus `FeaturedPost`, `Verse`, `Outing`, and `Post`.
- `apps/api/src/file-module/*` already supports public file serving and a `LANDING_HERO` file category.
- `apps/api/src/auth/*` and `apps/api/src/responsibles/*` establish the protected admin pattern for future content modules.

What is missing is the actual landing feature: no landing module, no landing API, no public home data assembler, and no real web UI. `apps/web/src/App.tsx` is still a shell.

## Affected Areas
- `packages/db/prisma/schema.prisma` — needs the landing content fields that are not yet modeled.
- `apps/api/src/app.module.ts` — will need a landing module registration.
- `apps/api/src/file-module/*` — already provides the hero image path and public serving pattern.
- `apps/web/src/App.tsx` / `apps/web/src/main.tsx` — current shell must become the first public landing view.
- `docs/development-roadmap.md` and `docs/executive-summary.md` — already define the product intent and expected behavior.
- `openspec/changes/landing-admin-public/` — exploration artifact for the next SDD phases.

## Approaches
1. **Extend the singleton landing settings** — add the Step 6 copy/media fields to `LandingSettings`, expose one admin edit endpoint plus one public landing payload endpoint, and have the web app render from that assembled payload.
   - Pros: matches the existing singleton pattern, keeps Step 6 small, reuses `FeaturedPost`, `Verse`, and `LandingSettings.featuredOutingId` instead of duplicating content.
   - Cons: `LandingSettings` grows into a broader editorial record; the API must carefully assemble joined data and handle missing featured/current content.
   - Effort: Medium

2. **Split landing into dedicated content blocks** — create separate landing content models/endpoints for hero, mission/vision, contact, and curated content.
   - Pros: cleaner long-term domain boundaries and easier future expansion.
   - Cons: more tables, more CRUD, more tests, and too much surface area for a basic public home.
   - Effort: High

## Recommendation
Use the singleton-settings approach. The current schema and module patterns already point to a small, reviewable landing slice, and Step 6 only needs a basic editable public home. Model the missing editorial fields on `LandingSettings`, keep featured outing/posts as references, and resolve the current verse from the verse source of truth instead of duplicating it into landing state.

## Risks
- `LandingSettings` does not yet model mission/vision/description/video/contact, so the proposal must define the minimal schema delta clearly.
- The “current verse” needs a fallback strategy until the verse editor/admin slice exists.
- Public landing assembly must guard against missing or unpublished featured content so the home page does not break.

## Ready for Proposal
Yes — the codebase is ready for `sdd-propose`. The proposal should define the minimal landing schema, the admin edit surface, the public landing payload, and the fallback rules for verse/featured content.
