# Apply Progress: Outings — Phase 2a (Core CRUD + Publish-Readiness)

## Split Rationale (2026-07-05)

The original Phase 2 implementation produced ~1,641 changed lines (521 service + 1,018 tests + 14 module + ~88 docs), far exceeding the 400-line review budget. The maintainer chose to split Phase 2 into 2a and 2b to control review scope.

### Why an exact 400-line slice is impossible for the service layer

The NestJS test mock infrastructure (`makeDbValue` factory with Prisma mocks for `create`, `findUnique`, `findFirst`, `findMany`, `update`, and `findUniqueFile`) requires ~180 lines of boilerplate. This infrastructure is shared across ALL service tests — both CRUD and public/like/feature tests. Even the minimal CRUD-only test file needs the full mock factory.

### Phase 2a line budget

| Component | Lines | Notes |
|-----------|-------|-------|
| `outings.service.ts` (new) | 316 | create, update, archive, findAll, findBySlug + guardPublishReadiness + validateAssetIds + interfaces |
| `outings.service.test.ts` (new) | 650 | 24 tests: 12 CRUD + 8 guard + 4 asset validation. Includes ~280 lines of mock infrastructure |
| `outings.module.ts` (modified) | +11 | Added OutingsService provider (LandingModule import deferred to Phase 2b) |
| `landing.module.ts` | 0 | Reverted — exports deferred to Phase 2b |
| `tasks.md` / `apply-progress.md` | ~100 | SDD documentation update |
| **Total Phase 2a** | **~1,077** | size:exception accepted — smallest coherent slice |

### Phase 2b deferred scope (~350 lines to restore)

| Component | Lines | Notes |
|-----------|-------|-------|
| Service methods | ~205 | findAllPublic, deriveVisitorHash/normalizeIp, addLike, featureOuting + OutingResponse/LikeRequestSignals types + ConfigService/LandingService injection |
| Tests | ~340 | 15 tests: findAllPublic (3), hash derivation (3), addLike (5), featureOuting (4) |
| Module wiring | ~2 | LandingModule import + exports |
| **Total Phase 2b** | **~547** | To be restored in next apply batch |

## Phase 1 (Complete — Committed)

**Commit**: `87213e1 feat(outings): add type layer and config`
**Status**: All 8 tasks complete, 40 tests passing.

## Phase 2a Batch

**Date**: 2026-07-03 (implementation) / 2026-07-05 (split & remediation)
**Mode**: Strict TDD
**Status**: Complete — tasks 2.1, 2.2, 2.3 (24 tests) done

### Completed Tasks

- [x] 2.1 Create `apps/api/src/outings/outings.service.ts` with `create`, `update`, `archive`, `findAll`, `findBySlug` using Prisma client from DbService
- [x] 2.2 Implement publish-readiness guard: reject `PUBLISHED` when title/slug/dateTime/location/description are null or empty
- [x] 2.3 Test: 24 service unit tests for CRUD (12), publish-readiness rejection (8), asset validation (4)

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/outings/outings.service.ts` | Created (reduced) | 316 lines: CRUD methods (create, update, archive, findAll, findBySlug), publish-readiness guard, asset ID validation, Prisma interfaces. Phase 2b methods (findAllPublic, addLike, featureOuting, hash derivation) deferred. |
| `apps/api/src/outings/outings.service.test.ts` | Created (reduced) | 650 lines: 24 tests covering CRUD (12), guard (8), asset validation (4). Mock infrastructure for Prisma client. Phase 2b tests deferred. |
| `apps/api/src/outings/outings.module.ts` | Modified | +11 lines: added OutingsService provider. LandingModule import deferred to Phase 2b. |
| `apps/api/src/landing/landing.module.ts` | Reverted | Exports change reverted — not needed until Phase 2b featureOuting. |
| `openspec/changes/outings/tasks.md` | Updated | Split Phase 2 into 2a/2b with budget rationale. |
| `openspec/changes/outings/apply-progress.md` | Updated | Split documentation with line budget analysis. |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1 | `outings.service.test.ts` | Unit | N/A (new) | ✅ Written | ✅ 12/12 | ✅ 3 create + 3 update + 1 archive + 3 findAll + 2 findBySlug | ➖ Clean |
| 2.2 | `outings.service.test.ts` | Unit | N/A (new) | ✅ Written | ✅ 8/8 | ✅ 5 empty fields + update guard + DRAFT transition + DRAFT empty OK | ➖ Clean |
| 2.3 | `outings.service.test.ts` | Unit | N/A (new) | ✅ Written | ✅ 4/4 | ✅ non-existent reject + valid accept + croquis reject + null/undefined OK | ➖ Clean |

### Test Summary
- **Total tests written**: 24 new (12 CRUD + 8 guard + 4 asset validation)
- **Total tests passing**: 45 (21 DTO + 24 service)
- **Layers used**: Unit (24)
- **Approval tests**: None — no refactoring of existing behavior
- **Pure functions created**: `guardPublishReadiness`, `validateAssetIds`

### Deviations from Design
- **Phase 2 split**: Design originally specified a single service PR (~300 lines estimated). Actual implementation revealed the test mock infrastructure alone is ~280 lines, making the true review budget ~1,641 lines. Split into 2a/2b with explicit `size:exception` for PR 2a.
- **ConfigService removal (deferred)**: ConfigService was injected for `deriveVisitorHash` (Phase 2b only). Removed from Phase 2a constructor — will be restored in Phase 2b.
- **LandingService removal (deferred)**: LandingService was injected for `featureOuting` (Phase 2b only). Removed from Phase 2a constructor and LandingModule exports reverted — both will be restored in Phase 2b.
- **OutingResponse export (deferred)**: `OutingResponse` interface and `LikeRequestSignals` are only used by Phase 2b methods — exported types deferred.
- **Hash derivation delimiter**: Design shows `sha256(version + VISITOR_HASH_SECRET + normalized_ip + user-agent)`. Implementation uses `:` delimiter for unambiguous separation — this will be visible in Phase 2b review.

### Issues Found
None.

### Remaining Tasks (Phase 2b: Public Filter + Visitor Hash + Likes + Feature — PR 2b)
- [ ] 2.4 `findAllPublic` — filter PUBLISHED, map to OutingResponse
- [ ] 2.5 Visitor hash derivation with IP normalization
- [ ] 2.6 Transactional like upsert — idempotent, safe
- [ ] 2.7 `featureOuting` delegation to LandingService
- [ ] 2.8 15 tests: findAllPublic (3), hash (3), like (5), feature (4)
- [ ] 2.9 Module wiring: LandingModule import + LandingService export

### Workload / PR Boundary
- **Mode**: Chained PR slice 2a / Phase 2a
- **Chain strategy**: stacked-to-main (base: PR 1 branch)
- **Current work unit**: Core CRUD + Publish-Readiness (~1,077 lines)
- **Boundary**: Service CRUD → publish-readiness guard → asset validation → 24 unit tests
- **Size exception rationale**: The NestJS test mock infrastructure (~280 lines of Prisma mock factories) is shared across all service tests. Even the minimal CRUD-only slice requires this infrastructure. Splitting further would either lose test fidelity (no Prisma query argument verification) or produce non-coherent slices (tests without their shared setup). The 400-line budget is mathematically impossible for this service layer given the existing project patterns.
- **Deferred scope**: Phase 2b (~547 lines) — findAllPublic, visitor hash, transactional likes, featureOuting, with full test coverage already designed.
