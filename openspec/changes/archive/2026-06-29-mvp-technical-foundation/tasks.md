# Tasks: MVP Technical Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60-140 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR: harden docs and Prisma draft |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Complete foundation artifact validation | PR 1 | Review docs/schema together; no runtime bootstrap unless a missing placeholder blocks validation. |

## Phase 1: Artifact Baseline Review

- [x] 1.1 Review `docs/technical-foundation.md` against the spec scenarios for monorepo boundaries, API/web/package responsibilities, assumptions, and exclusions.
- [x] 1.2 Review `packages/db/prisma/schema.prisma` for required MVP entities: users, sessions, outings, posts, verses, featured content, likes, downloads, and files.
- [x] 1.3 Confirm `docs/technical-foundation.md` and `schema.prisma` both state this change is documentation/design only, with no runtime app behavior.

## Phase 2: Business Rule Hardening

- [x] 2.1 Verify featured rules in `schema.prisma`: singleton `LandingSettings.featuredOutingId` and three-slot `FeaturedPost` model are explicit and documented.
- [x] 2.2 Verify privacy/lifecycle rules in `schema.prisma`: anonymous `OutingLike.visitorHash`, inactive `ResponsibleUser`, hashed `RefreshSession`, file metadata, and `VerseRevision` history.
- [x] 2.3 Update `docs/technical-foundation.md` if any Prisma-only rule lacks a matching human-readable note or open-question marker.

## Phase 3: Schema Validation Readiness

- [x] 3.1 Check whether Prisma validation can run without monorepo bootstrap; if not, record the blocker in `docs/technical-foundation.md` or this change's verification notes.
- [x] 3.2 If validation is available, run it against `packages/db/prisma/schema.prisma` and fix schema syntax or relation issues only.
- [x] 3.3 Do not add migrations, generated client setup, Prisma config, NestJS, React, linting, or test tooling unless validation cannot be assessed otherwise.

## Phase 4: Acceptance Verification

- [x] 4.1 Mark acceptance only after spec scenarios for document structure, model coverage, business rules, exclusions, and artifact validation pass.
- [x] 4.2 Update `openspec/changes/mvp-technical-foundation/tasks.md` checkboxes as work completes.
