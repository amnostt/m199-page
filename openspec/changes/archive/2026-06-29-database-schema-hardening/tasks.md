# Tasks: Database Schema Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60–80 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Hardened schema + synced docs | Single PR | Under 80 lines; single deliverable |

## Phase 1: Schema Hardening

- [x] 1.1 Add enforcement-tier comment block at top of `packages/db/prisma/schema.prisma` defining `// DB:` (Prisma-native) and `// APP:` (service/transaction) tier labels
- [x] 1.2 Add `@@index([createdById])` to `Post` model in `packages/db/prisma/schema.prisma` matching existing FK index pattern on `Outing` (line 142) and `FileAsset` (line 114)
- [x] 1.3 Add `@@index([createdById])` to `Verse` model in `packages/db/prisma/schema.prisma` for same FK consistency
- [x] 1.4 Add composite `@@index([status, expiresAt])` to `RefreshSession` model — keep existing `@@index([expiresAt])`; composite enables efficient cleanup queries
- [x] 1.5 Label every invariant from the constraint tier map (design Table 3) with `// DB:` or `// APP:` comment on its model in `schema.prisma`
- [x] 1.6 Annotate `OutingLike` model with explicit `// APP:` note: privacy-safe visitorHash derivation happens at API layer; DB enforces uniqueness + no-identity columns only

## Phase 2: Documentation Sync

- [x] 2.1 In `docs/technical-foundation.md`, replace the "Constraint Strategy" section with a two-tier summary table (DB vs APP) mirroring schema tier labels
- [x] 2.2 Cross-check every invariant in the foundation doc's new tier table has a matching `// DB:` or `// APP:` comment in `schema.prisma`

## Phase 3: Validation

- [x] 3.1 Run `pnpm --filter @m199/db db:validate` and confirm schema passes
- [x] 3.2 Run `pnpm --filter @m199/db db:format` and confirm no diff
- [x] 3.3 Run `pnpm --filter @m199/db typecheck` and confirm no new errors
