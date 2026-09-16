# Publication Form Safety and Feedback

## Objective

Make the admin publication form safer and clearer without redesigning the existing admin visual system or changing backend contracts.

## Problem

The form can discard activity values before a type change is confirmed, save failures appear behind the open dialog, required fields lack local accessible validation, scope radios are not grouped, and saving feedback is weak.

## Why

These defects can cause accidental data loss, hide recovery information, and make the form harder to complete with assistive technology or under slow/error conditions.

## Scope

- Preserve the current admin theme, publication capabilities, API payloads, and modal workflow.
- Limit implementation to the publication form/page and their colocated web tests.
- Do not change the API, database, public publication pages, or unrelated admin surfaces.
- Preserve unrelated worktree changes, including the existing untracked `.agents/` directory.

## Authorized scope

- `apps/web/src/admin/PublicationForm.tsx`
- `apps/web/src/admin/PublicationForm.test.tsx`
- `apps/web/src/admin/PublicationsPage.tsx`
- `apps/web/src/admin/PublicationsPage.test.tsx`
- This task document and its Engram mirror

## TDD and checks

- Effective TDD mode: disabled by maintainer decision recorded on 2026-07-22.
- Test runner: Vitest through `pnpm --filter @m199/web test`.
- Tests remain required as ordinary verification.

## Tasks

- [x] **PF-1 — Accessible local validation.** Validate required publication fields before submit, associate field messages with controls, and group scope radios correctly.
- [x] **PF-2 — Safe transitions and dialog feedback.** Preserve activity values until a type change is confirmed, show save failures inside the dialog, and communicate the busy action clearly without duplicate submission.
- [x] **PF-3 — Verification and finish.** Cover the changed behavior with focused tests; run web type checking, the Impeccable detector once on final changed UI targets, `git diff --check`, and a structural diff review.

## Acceptance criteria

- Invalid required fields do not submit and expose visible, programmatically associated messages.
- Scope options behave as one named radio group.
- Canceling a type-change confirmation leaves the previously entered activity data intact.
- Confirming a change to `POST` submits an invariant-safe payload with activity-only fields cleared.
- Save failures are visible within the open publication dialog.
- The submit action exposes a stable disabled/busy state and contextual saving label.
- Existing create/edit, mission selection, image selection, and type-change behavior remains covered.
- No backend contract or unrelated visual system changes are introduced.

## Progress

- Current task: PF-3.
- Verification evidence: `pnpm --filter @m199/web test -- PublicationForm.test.tsx PublicationsPage.test.tsx` — 53 files and 508 tests passed (the runner emits a pre-existing Astro source-map warning); `pnpm --filter @m199/web typecheck` — 0 errors, 4 pre-existing hints; Impeccable detector — `[]`; `git diff --check` — passed; authorized structural diff review — scoped to the five listed files, with no accidental churn.
- Next step: leave the worktree uncommitted for maintainer review.

## Rationale

Functional safety and recovery feedback take priority over cosmetic polish. The existing admin presentation is retained; refinements should use current shadcn field and alert patterns at the narrowest correct level.
