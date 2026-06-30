# Design: Database Schema Hardening

## Technical Approach

Schema-first hardening: classify every business invariant from the delta spec into DB (Prisma-native) or APP (service/transaction) tiers, add missing FK indexes matching existing patterns, and sync the foundation doc. No migrations, client generation, or runtime code.

## Architecture Decisions

| Decision | Option A | Option B | Choice | Rationale |
|---|---|---|---|---|
| Enforcement classification | Separate DB/APP doc | Inline schema comments per model | Inline comments | Schema is source of truth; comments survive code churn. Foundation doc mirrors with summary table. |
| FK index on `Post.createdById` | Add `@@index` | Rely on Prisma auto-index | Add | `Outing.createdById` and `FileAsset.uploadedById` already declare explicit FK indexes. Consistency wins. |
| FK index on `Verse.createdById` | Add `@@index` | Rely on Prisma auto-index | Add | Same FK index pattern as Outing/FileAsset; all models referencing `ResponsibleUser` follow the same convention. |
| Session cleanup index | `@@index([status, expiresAt])` | Keep existing `@@index([expiresAt])` | Add composite | Enables efficient `WHERE status IN ('REVOKED','EXPIRED') AND expiresAt < now()` without full-scan on status. |
| Migration scaffolding | `prisma migrate dev` config | Keep validate/format only | Validate/format only | Proposal excludes migrations. Existing `db:validate` + `db:format` already work. |

## Constraint Tier Map

Top-of-schema comment block defines two tiers. Each model section repeats per-constraint labels:

```
-- === Enforcement Tiers ===
-- DB  → Prisma constructs: @unique, @@unique, @@index, @default, enum, required field, relation
-- APP → API/service logic, transactional writes, future SQL migrations
```

| Invariant | Tier | Prisma Construct / Mechanism |
|---|---|---|
| Unique email, slug, token hash | DB | `@unique` |
| FeaturedPost max 3 slots | DB | `FeaturedPostSlot` enum (3 values) + `slot @unique` + `postId @unique` |
| One featured outing | DB | `LandingSettings.featuredOutingId @unique` |
| One like per visitor per outing | DB | `@@unique([outingId, visitorHash])` |
| Anonymous likes (no PII) | DB | `visitorHash String` — no identity columns |
| One verse per date | DB | `@@unique([date])` |
| One post per download file | DB | `@@unique([postId, fileId])` |
| Inactive responsible users | DB | `ResponsibleUserStatus` enum (ACTIVE/INACTIVE) + `status` field + `@@index([status])` |
| File size/type metadata | DB | `sizeBytes Int`, `mimeType String`, `extension String?` columns in FileAsset |
| Post tags | DB | `tags String[] @default([])` column + `@@index([tags], type: Gin)` |
| Verse history / revisions | DB | `VerseRevision` model + `@@index([verseId, changedAt])` |
| Refresh-session fields | DB | `tokenHash @unique`, status/expiresAt columns, `@@index([userId, status])`, `@@index([expiresAt])` |
| LandingSettings singleton | APP | Service enforces `WHERE id = 1` on upsert |
| Inactive user enforcement | APP | Login/content-creation guards check `status != INACTIVE` |
| Outing.likesCount sync | APP | Transactional writes on like/unlike |
| Upload MIME/size limits | APP | Per-category validation before FileAsset insert |
| Publish-readiness | APP | Status transition guard requires complete public fields |
| Refresh token lifecycle | APP | Hash-only storage; app layer handles revoke/rotate/expiry |

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/db/prisma/schema.prisma` | Modify | Add tier-classification comment block, missing FK indexes (`Post.createdById`, `Verse.createdById`), composite index `RefreshSession([status, expiresAt])`, per-model tier labels. |
| `docs/technical-foundation.md` | Modify | Replace Constraint Strategy section with two-tier summary table matching schema comments. |
| `packages/db/prisma.config.ts` | No change | Loads schema and DATABASE_URL correctly for validation. |
| `packages/db/package.json` | No change | `db:validate`, `db:format`, `typecheck` scripts already aligned. |

## Data Flow

```
schema.prisma (source of truth)
    │
    ├── prisma validate ──► schema validation (no DB needed)
    │
    └── docs/technical-foundation.md (human summary ← mirrors schema comments)
```

No runtime data flow — documentation/constraint hardening only.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Schema validation | `prisma validate` passes after changes | Run `pnpm --filter @m199/db db:validate` |
| Schema formatting | `prisma format` produces no diff | Run `pnpm --filter @m199/db db:format` |
| Doc review | Tier labels match between schema and foundation doc | Manual cross-reference check |

No unit/integration/E2E tests — no runtime code is added or modified.

## Migration / Rollout

No migration required. Revert: `git revert` the schema and doc changes, re-run `prisma validate` to confirm baseline.

## Open Questions

- None. All invariants enumerated in the delta spec are classified above.
