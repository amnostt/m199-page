# Exploration: daily verse

## Current State

The repo already models verses in Prisma: `Verse` has one row per `date`, a `PUBLISHED/DRAFT/ARCHIVED` status, and `VerseRevision` exists for audit/history. The landing API already reads the latest `PUBLISHED` verse and exposes it as `currentVerse`, and the web app already renders that section on the home page.

What is missing is a dedicated Verse API/module: there is no `apps/api/src/verse*` feature, no verse controllers, and no admin flow to create/edit/archive revisions. The current landing query also uses `orderBy: { date: "desc" }` without a `date <= now` guard, so the "daily" behavior is really "latest published verse" today.

## Affected Areas

- `packages/db/prisma/schema.prisma` — already contains `Verse` / `VerseRevision`; proposal may need to refine selection or audit rules.
- `apps/api/src/landing/landing.service.ts` — current public landing payload resolves `currentVerse` from the latest published verse.
- `apps/api/src/landing/*` — public controller and tests already expose verse data through landing.
- `apps/api/src/app.module.ts` — will need a Verse module registration if the feature becomes standalone.
- `apps/api/src/verse*` — missing module, controllers, DTOs, service, and tests for verse CRUD/history.
- `apps/web/src/App.tsx` — already renders `currentVerse`; only changes if the product wants a dedicated verse page/controls.
- `openspec/specs/landing-page/spec.md` — current landing spec already includes verse in the home payload.

## Approaches

1. **Dedicated Verse module** — add `/verses/admin` CRUD/history endpoints and keep landing as a consumer of the latest published verse.
   - Pros: matches the existing `Verse` / `VerseRevision` data model, keeps audit/history contained, and avoids overloading landing settings.
   - Cons: more module surface and more tests.
   - Effort: Medium

2. **Landing-owned verse editor** — manage the daily verse through the existing landing module and keep the public homepage as the only consumer.
   - Pros: smallest API surface and fastest path.
   - Cons: couples unrelated concerns, underuses `VerseRevision`, and makes future verse history awkward.
   - Effort: Low/Medium

## Recommendation

Use the dedicated Verse module. The schema already anticipates verse history, and landing/web already have the read path, so the cleanest next step is to add authoring/admin APIs without changing the homepage contract.

## Risks

- The product meaning is still ambiguous: “daily verse” could mean CRUD/history, scheduled publishing, or just the landing home card.
- The current landing query may surface a future-dated verse because it only sorts by `date desc`.
- Verse history/audit behavior is modeled in the DB but not yet wired into runtime code.

## Ready for Proposal

Yes — tell the user the codebase is ready for a proposal, but ask them to confirm whether Daily Verse means a standalone admin CRUD/history feature or only the homepage verse display.
