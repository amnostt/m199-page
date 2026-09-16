# URL-Safe Slugs

## Objective

Ensure every admin field that accepts a mission or publication slug rejects characters that are unsafe or hard to read in a URL, while preserving existing valid slugs.

## Problem

The mission and publication admin forms currently accept arbitrary text for slugs. The API only checks that mission and publication slugs are non-empty strings, so malformed values can also bypass the browser and become public route segments.

## Why

Slugs are used in public URLs. Invalid punctuation, spaces, accents, leading or trailing separators, and repeated separators produce fragile or unreadable routes and should be rejected consistently at both the form and API boundaries.

## Rule

A slug must contain lowercase ASCII letters and digits, optionally separated by single hyphens: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

Examples:

- Valid: `mision-centro-2026`
- Invalid: `Misión Centro`, `mision_centro`, `-mision`, `mision--centro`, `mision!`

## Scope

- Detect and cover all current admin slug inputs: publications and missions.
- Add accessible client-side validation and clear guidance.
- Suggest a URL-safe slug from the title in create flows while the slug remains untouched.
- Stop automatic synchronization immediately after the user edits the slug; never overwrite an existing slug in edit flows.
- Enforce the same invariant in create/update API DTO validation.
- Preserve existing valid slugs and unrelated worktree changes.
- Do not auto-transform user input silently, migrate stored data, or change public route structure.

## Authorized scope

- Publication and mission admin forms and their colocated tests under `apps/web/src/admin/`
- Publication and mission create/update DTOs and focused DTO/controller validation tests under `apps/api/src/`
- A narrowly scoped reusable slug helper/constant when it prevents rule drift
- This task document and its Engram mirror

## TDD and checks

- Effective TDD mode: disabled by maintainer decision recorded on 2026-07-22.
- Tests remain required as ordinary verification.
- Relevant runners: `pnpm --filter @m199/web test` and `pnpm --filter @m199/api test`.

## Tasks

- [x] **SLUG-1 — Durable API invariant.** Apply one URL-safe slug rule to publication and mission create/update DTOs, with focused acceptance/rejection coverage.
- [x] **SLUG-2 — Complete admin input constraint.** Apply the same rule to every detected slug input with accessible guidance/errors and focused form behavior tests.
- [x] **SLUG-3 — Verification and finish.** Run focused web/API tests, package type checks, the final Impeccable detector once on changed UI targets, `git diff --check`, and structural diff review.
- [x] **SLUG-4 — Editable title-based suggestion.** Generate the same URL-safe slug suggestion from publication and mission titles during creation, stop synchronization after manual slug editing, and preserve existing slugs during editing.
- [x] **SLUG-5 — Suggestion verification.** Cover accent removal, punctuation/spacing normalization, manual override, clearing after override, create/reset behavior, and edit preservation; rerun applicable checks and the final detector once for this refinement.

## Acceptance criteria

- Publication and mission forms reject empty or malformed slugs before API submission.
- Invalid slug feedback explains the accepted lowercase letter, number, and single-hyphen format and is programmatically associated with the field.
- Valid URL-safe slugs continue to submit unchanged.
- In create flows, a title such as `Misión Centro 2026` suggests `mision-centro-2026`.
- The suggestion keeps following title changes only until the user edits the slug field.
- A manually edited or cleared slug is never overwritten by later title changes.
- Opening an existing mission or publication preserves its stored slug when its title changes.
- Publication and mission create/update API requests reject malformed slugs even when the browser is bypassed.
- Tests cover uppercase letters, spaces, accents, underscores, punctuation, leading/trailing hyphens, repeated hyphens, and valid hyphenated slugs.
- No silent normalization, backend contract expansion, stored-data migration, or unrelated UI change is introduced.

## Progress

- Current task: complete.
- Verification evidence: SLUG-1 through SLUG-3 remain verified: `pnpm --filter @m199/api test -- publication.dto.test.ts mission-slug` — 34 test files passed, 313 tests passed, 13 skipped; `pnpm --filter @m199/web test -- PublicationForm.test.tsx MissionsPage.test.tsx` — 53 test files passed, 534 tests passed; `pnpm --filter @m199/web typecheck` — 0 errors and 4 existing hints; Impeccable detector returned `[]`; `git diff --check` passed; the full relevant diff was structurally inspected for preservation and scope. SLUG-4 and SLUG-5 are verified.
- Next step: none for this refinement; preserve the uncommitted worktree until the maintainer decides its delivery boundary.

## Rationale

Rejecting malformed slugs is safer than silently rewriting route identifiers. The same explicit rule at both boundaries gives immediate form feedback while keeping the API authoritative.
