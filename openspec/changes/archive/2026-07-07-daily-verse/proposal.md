# Proposal: Daily Verse

## Intent

Enable responsible users to manage the homepage verse. “Daily” means latest uploaded remaining verse, not a calendar schedule; multiple uploads may share a date.

## Scope

### In Scope
- Admin create/publish verses with stored date/time; date is not unique.
- Admin delete any verse, including latest/current and past verses.
- Homepage resolves `currentVerse` from latest uploaded remaining verse, falling back after deletion.
- Expose public history of remaining published verses.

### Out of Scope
- Calendar-based scheduling, automatic daily rotation, or one-verse-per-day limits.
- Public editing, comments, likes, notifications, or verse media uploads.
- Role-specific permissions beyond existing active responsible auth.

## Capabilities

### New Capabilities
- `daily-verse`: Admin creation/deletion, non-unique upload date/time, latest-remaining selection, and public history.

### Modified Capabilities
- `landing-page`: Clarify `currentVerse` as latest uploaded remaining verse with fallback after deletion.

## Approach

Add a dedicated Verse API/module. Reuse `Verse` where possible, remove date uniqueness, and store date plus time/upload timestamp for ordering. Landing remains a read consumer ordered by latest remaining upload. Admin endpoints use the existing active responsible-user guard.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/db/prisma/schema.prisma` | Modified | Store date/time and remove unique date constraint. |
| `apps/api/src/verse*` | New | Verse module, service, controllers, DTOs, and tests. |
| `apps/api/src/landing/landing.service.ts` | Modified | Select latest uploaded remaining verse; fallback after deletion. |
| `apps/api/src/app.module.ts` | Modified | Register Verse module. |
| `apps/web/src/App.tsx` | Modified | Add or link public verse history UI if required by design. |
| `openspec/specs/landing-page/spec.md` | Modified | Update current verse behavior contract. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing unique date constraint blocks same-day uploads | Med | Remove uniqueness and order by stored upload date/time. |
| Deleting latest verse changes homepage unexpectedly | Med | Specify latest remaining fallback and empty state. |
| Scope grows into scheduling | Low | Specs explicitly forbid manual dates and automatic rotation. |

## Rollback Plan

Revert the Verse module, landing query changes, web history UI, and Prisma migration. If data migration ships, provide a down migration or restore before redeploying the previous version.

## Dependencies

- Existing auth-responsibles active-user guard.
- Existing landing public payload and `Verse`/`VerseRevision` Prisma models.

## Success Criteria

- [ ] Admin can create/publish multiple verses on the same date.
- [ ] Admin can delete latest/current and past verses.
- [ ] Homepage shows the latest uploaded remaining verse and falls back after latest deletion.
- [ ] Public users can view past published verses.
- [ ] Empty and deleted-verse states do not break landing or history pages.
