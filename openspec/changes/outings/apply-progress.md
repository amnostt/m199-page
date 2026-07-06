# Apply Progress: Outings — Phase 3 (API Controllers)

## Phase 3 Batch

**Date**: 2026-07-05
**Mode**: Strict TDD
**Status**: Complete — tasks 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 (32 new tests after gate remediation) done

### Completed Tasks

- [x] 3.1 Admin controller — `OutingsAdminController` with `@UseGuards(AuthGuard)`, endpoints: GET/POST `/outings/admin`, PATCH `/outings/admin/:id`, POST `/:id/archive`, POST `/:id/feature`
- [x] 3.2 Public controller — `OutingsPublicController` with GET `/outings`, GET `/outings/:slug`, POST `/outings/:slug/like`
- [x] 3.3 Admin route tests — 15 tests: CRUD delegation, AuthGuard decorator verification, route-level 401 coverage for GET/POST `/outings/admin`, query parameters, create/update/archive/feature delegation (OUT-01)
- [x] 3.4 Public list/detail tests — 7 tests: published-only filtering, 404 for DRAFT/ARCHIVED/missing slugs, internal field exclusion (OUT-02, OUT-06)
- [x] 3.5 Like tests — 7 tests: delegation with IP/UA extraction, idempotent duplicates, IPv6 address handling, missing slug, and DRAFT/ARCHIVED public 404 behavior (OUT-07)
- [x] 3.6 Feature tests — 2 tests: delegates to service.featureOuting for published and draft outings; service validates status (OUT-05)
- [x] Module wiring — AuthModule import added for AuthGuard DI resolution

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/outings/outings-admin.controller.ts` | Created | Admin CRUD + archive + feature endpoints protected by AuthGuard. Follows landing-admin controller pattern. |
| `apps/api/src/outings/outings-public.controller.ts` | Created | Public list, detail, and like endpoints. No auth guard. Extracts IP/UA from Express request for like endpoint. |
| `apps/api/src/outings/outings-admin.controller.test.ts` | Created + remediated | 15 tests: CRUD delegation, AuthGuard metadata, module compile smoke, and 2 route-level 401 tests. |
| `apps/api/src/outings/outings-public.controller.test.ts` | Created + remediated | 17 tests: findAllPublic, findBySlug, like delegation/idempotency, public DRAFT/ARCHIVED like 404 behavior, no-guard check, and smoke. |
| `apps/api/src/outings/outings.module.ts` | Modified | +5 lines: registered both controllers, added AuthModule import. |
| `apps/api/src/outings/outings.service.ts` | Modified | +1 line: exported `OutingRow` interface (was private). |
| `openspec/changes/outings/tasks.md` | Modified | Marked 3.1-3.6 complete. |
| `openspec/changes/outings/apply-progress.md` | Modified | Phase 3 implementation documentation. |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1 | `outings-admin.controller.test.ts` | Unit + route-level supertest | ✅ 64/64 (Phase 2) | ✅ Written (module not found / unauthorized route gaps) | ✅ 15/15 | ✅ delegation + guard metadata + GET/POST 401 route coverage | ✅ Gate remediation |
| 3.2 | `outings-public.controller.test.ts` | Unit | ✅ 64/64 (Phase 2) | ✅ Written (module not found / hidden-status leak) | ✅ 17/17 | ✅ list/detail/like + DRAFT/ARCHIVED public 404 behavior | ✅ Gate remediation |
| 3.3-3.6 | Combined above | Unit + route-level supertest | N/A (new) | ✅ Written | ✅ 32/32 | ✅ Full coverage per remediated spec claims | ✅ Clean |

### Test Summary
- **Phase 3 tests written**: 32 new (15 admin + 17 public)
- **Total outings tests passing**: 96 (21 DTO + 43 service + 15 admin controller + 17 public controller)
- **Full test suite**: 324/324 passing (db: 17 + web: 7 + api: 300)
- **Typecheck**: Clean across all workspaces
- **Layers used**: Unit + route-level supertest (32)
- **Approval tests**: None — no refactoring of existing behavior

### Deviations from Design
- None. Controllers follow landing controller patterns exactly: admin controller uses `@UseGuards(AuthGuard)` at controller level with overridden guard in tests; public controller has no guard. Both use `@Inject` constructor injection.

### Issues Found
- **AuthModule import required**: Adding `OutingsAdminController` (with `@UseGuards(AuthGuard)`) caused DI resolution failures in `app.module.test.ts` and `bootstrap.wiring.test.ts`. Fixed by importing `AuthModule` in `OutingsModule`. Every other module using `AuthGuard` (ResponsiblesModule, FileModule, LandingModule) already imports `AuthModule` — this was a missed dependency.
- **OutingRow type export**: `findBySlug` returns `OutingRow | null` but the interface was private. Exported it to allow controller tests to type mock return values. One-line change — minimal phase-boundary impact.

### Line Budget
- **Phase 3 diff estimate**: ~970 changed lines after gate remediation
  - `outings-admin.controller.ts`: ~102 lines
  - `outings-public.controller.ts`: ~115 lines
  - `outings-admin.controller.test.ts`: ~273 lines
  - `outings-public.controller.test.ts`: ~346 lines
  - `outings.module.ts`: +5 lines
  - `outings.service.ts`: +1 line
  - `tasks.md` / `apply-progress.md`: ~120 lines
  - **Total**: ~970 changed lines — test files and remediation evidence dominate
  - **Budget**: Over the 400-line review budget. Exception is documented because the controller slice is coherent and NestJS controller tests require per-controller TestingModule/supertest setup.
  - **Note**: Controller tests with NestJS TestingModule + vitest mocks require boilerplate per controller. Like Phase 2's Prisma mock infrastructure, this is a one-time cost. Future outings tests (e.g., adding new endpoints) will be ~15-20 lines each.

### Remaining Tasks (Phase 4: Web UI)
- [ ] 4.1-4.6 Web routing and components

### Workload / PR Boundary
- **Mode**: Chained PR slice 3 / Phase 3
- **Chain strategy**: stacked-to-main (base: PR 2b branch)
- **Current work unit**: Admin + Public controllers with 32 controller tests
- **Boundary**: Admin CRUD + archive + feature → public list/detail/like → 32 controller tests
- **Budget**: ~970 changed lines — over the 400-line target but within the expected range for a NestJS controller layer with full test coverage and gate remediation

---

# Phase 3 Gate Remediation (2026-07-05)

**Trigger**: Phase 3 controllers failed fresh gate review. Targeted remediation only.

### Fixes Applied

1. **CRITICAL — Public like endpoint exposed non-PUBLISHED outing status**: `OutingsPublicController.like()` only checked for missing outings, then delegated to `addLike` which threw status-specific `BadRequestException` for DRAFT/ARCHIVED. Added `|| outing.status !== "PUBLISHED"` guard so non-public slugs return `NotFoundException` at the controller boundary — matching the behavior of `findBySlug`.

2. **CRITICAL — OUT-01 unauthorized route scenario not covered by passing route test**: `tasks.md` claimed "admin routes return 401 without auth, 200 with auth" but `outings-admin.controller.test.ts` only verified `@UseGuards(AuthGuard)` metadata and direct method delegation. Added two supertest-based route-level 401 tests (GET and POST `/outings/admin`) that override `AuthGuard` to deny with `UnauthorizedException` and assert HTTP 401 response.

3. **WARNING — Artifacts overstated route-level verification**: Updated `tasks.md` task 3.3 description and `apply-progress.md` test counts to accurately reflect what is tested (metadata check + route-level 401 via supertest). Public like endpoint now has DRAFT/ARCHIVED rejection tests at the controller boundary.

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/outings/outings-public.controller.ts` | Modified (+2) | Added `|| outing.status !== "PUBLISHED"` guard in `like()` method so DRAFT/ARCHIVED outings return 404 at the public boundary. |
| `apps/api/src/outings/outings-public.controller.test.ts` | Modified (+24) | Added 2 tests: DRAFT like → NotFoundException, ARCHIVED like → NotFoundException. |
| `apps/api/src/outings/outings-admin.controller.test.ts` | Modified (+40) | Added imports (`INestApplication`, `UnauthorizedException`, `supertest`, `beforeAll`, `afterAll`). Added "Route-level 401" describe block with supertest-based GET and POST 401 tests where AuthGuard is overridden to deny. |
| `openspec/changes/outings/tasks.md` | Modified | Clarified task 3.3 description: "route-level supertest" instead of overstated "200 with auth". |
| `openspec/changes/outings/apply-progress.md` | Modified | Added Phase 3 gate remediation documentation. |

### Test Summary (Post-Remediation)
- New tests added: 4 (2 public like status-guard + 2 admin route-level 401)
- Public controller: 17 tests (was 15, +2 DRAFT/ARCHIVED like)
- Admin controller: 15 tests (was 13, +2 route-level 401)
- Total outings tests: 96/96 passing
- Full suite: 324/324 passing (db: 17 + web: 7 + api: 300)

---

# Apply Progress: Outings — Phase 2b (Public Filter + Visitor Hash + Likes + Feature)

## Phase 2b Batch

**Date**: 2026-07-05
**Mode**: Strict TDD
**Status**: Complete — tasks 2.4, 2.5, 2.6, 2.7, 2.8, 2.9 (18 new tests) done

### Completed Tasks

- [x] 2.4 `findAllPublic` — filter PUBLISHED, map to OutingResponse with asset URLs
- [x] 2.5 Visitor hash derivation — pure functions `normalizeIp` and `deriveVisitorHash` with `:` delimiter
- [x] 2.6 Transactional like — findUnique dedupe → create + increment; idempotent
- [x] 2.7 `featureOuting` delegation — validates PUBLISHED, delegates to LandingService via `@Optional()` injection
- [x] 2.8 18 tests: findAllPublic (3), hash derivation (6), addLike (5), featureOuting (4)
- [x] 2.9 Module wiring: LandingModule exports LandingService, OutingsModule imports LandingModule

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/outings/outings.service.ts` | Modified (+224) | Added OutingResponse interface, normalizeIp/deriveVisitorHash pure functions, findAllPublic, addLike, featureOuting methods. Injected ConfigService and LandingService (@Optional). |
| `apps/api/src/outings/outings.service.test.ts` | Modified (+360) | Extended mock infrastructure with OutingLike mocks and increment handling. Added 18 new tests (hash derivation, findAllPublic, addLike, featureOuting). |
| `apps/api/src/outings/outings.module.ts` | Modified (+11) | Added LandingModule import for featureOuting DI wiring. |
| `apps/api/src/landing/landing.module.ts` | Modified (+1) | Added `exports: [LandingService]` for cross-module injection. |
| `openspec/changes/outings/tasks.md` | Modified | Marked 2.4-2.9 as complete. |
| `openspec/changes/outings/apply-progress.md` | Modified | Phase 2b implementation documentation. |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.4 | `outings.service.test.ts` | Unit | ✅ 24/24 (2a) | ✅ Written | ✅ 3/3 | ✅ published + empty + shape-check | ➖ Clean |
| 2.5 | `outings.service.test.ts` | Unit (pure) | N/A (new pure fns) | ✅ Written | ✅ 6/6 | ✅ 3 normalize + 3 derive | ➖ Clean |
| 2.6 | `outings.service.test.ts` | Unit | ✅ 24/24 (2a) | ✅ Written | ✅ 5/5 | ✅ first + idempotent + diff IP + draft + missing | ➖ Clean |
| 2.7 | `outings.service.test.ts` | Unit | ✅ 24/24 (2a) | ✅ Written | ✅ 4/4 | ✅ published + draft + archived + missing | ➖ Clean |
| 2.9 | N/A | N/A | N/A | Module wiring (structural) | ✅ typecheck passes | ➖ Single | ➖ None needed |

### Test Summary
- **Phase 2b tests written**: 18 new (3 findAllPublic + 6 hash derivation + 5 addLike + 4 featureOuting)
- **Post-remediation**: 1 additional test (concurrent-race P2002 catch in addLike)
- **Total outings tests passing**: 64 (21 DTO + 24 Phase 2a + 18 Phase 2b + 1 remediation)
- **Full test suite**: 292/292 passing (db: 17 + web: 7 + api: 268)
- **Typecheck**: Clean across all workspaces
- **Layers used**: Unit (18), Pure function (6 hash tests)
- **Pure functions created**: 2 (`normalizeIp`, `deriveVisitorHash`)
- **Approval tests**: None — no refactoring of existing behavior

### Deviations from Design
- **Hash delimiter**: Design specifies no delimiter between fields. Implementation uses `:` for unambiguous separation (version, secret, normalized IP, user-agent). Documented in Phase 2a apply-progress deviations.
- **Pure function extraction**: `normalizeIp` and `deriveVisitorHash` are exported standalone functions (not private methods). Follows strict-tdd.md "Extract-Before-Mock Rule" — allows direct testing without mocking ConfigService.
- **@Optional() LandingService**: LandingService injection uses `@Optional()` to avoid breaking Phase 2a DI contracts and allow graceful degradation. featureOuting throws a descriptive error if LandingModule isn't imported.

### Issues Found
None.

### Line Budget
- **Phase 2b diff**: 589 insertions, 7 deletions = ~596 changed lines
- **Over 400-line budget**: Yes (~196 over). Excess breakdown:
  - ~70 lines: OutingLike mock infrastructure (shared test boilerplate, analogous to Phase 2a's ~280-line Prisma mock)
  - ~40 lines: Pure function extraction + tests for hash derivation (TDD best practice)
  - ~30 lines: Constructor/injection changes for ConfigService + LandingService
  - ~56 lines: Phase 2b business logic (findAllPublic: 10, addLike: 45, featureOuting: 20 — legitimately small)
- **Budget note**: The test mock infrastructure for OutingLike (70 lines) is a one-time cost shared across all future like tests. Removing it would require 70+ lines of inline mocking per test. The 400-line budget remains mathematically challenging for NestJS service layers with comprehensive Prisma mocks.

### Remaining Tasks (Phase 3: API Controllers)
- [ ] 3.1 Admin controller with AuthGuard
- [ ] 3.2 Public controller with list/detail/like endpoints
- [ ] 3.3-3.6 Controller integration tests

### Workload / PR Boundary
- **Mode**: Chained PR slice 2b / Phase 2b
- **Chain strategy**: stacked-to-main (base: PR 2a branch)
- **Current work unit**: Public Filter + Visitor Hash + Likes + Feature (~596 lines)
- **Boundary**: findAllPublic → hash derivation → addLike → featureOuting → 18 unit tests
- **Budget exceeded by**: ~196 lines, primarily test mock infrastructure and TDD pure-function extraction

---

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

---

# Gate Remediation (2026-07-05)

**Trigger**: Phase 2b failed fresh gate review. Targeted remediation only.

### Fixes Applied

1. **CRITICAL — Transactional like dedupe**: Replaced `findUnique → create → update` in `addLike` (non-transactional, race-prone) with `$transaction` + P2002 catch. The `@@unique([outingId, visitorHash])` constraint now protects against concurrent duplicate inserts — `findUnique` catches the common idempotent case inside the transaction, and the P2002 catch handles the narrow race where two requests both pass `findUnique` before either `create` commits. The `outingLike.create` mock was hardened to throw P2002 on duplicates (matching real Prisma behavior).

2. **WARNING — Stale test-suite claim**: Updated "284/291 with 7 web failures" to current 292/292 across all workspaces.

3. **WARNING — Stale hash formula**: Updated task 2.5 text in `tasks.md` from `+` concatenation to `:` delimiter (matches implementation).

4. **SUGGESTION — Concurrency test**: Added `addLike` test "does not increment when unique constraint is violated" — sets `likeCreateThrowsP2002: true` override, verify P2002 catch returns current count without incrementing.

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/outings/outings.service.ts` | Modified | Added `upsert` + `$transaction` to `OutingPrismaClient` interface. Rewrote `addLike` to use interactive transaction with P2002 catch for concurrent-race protection. |
| `apps/api/src/outings/outings.service.test.ts` | Modified | Added `likeCreateThrowsP2002` override to `MockDbOverrides`, `$transaction` mock, duplicate-check + P2002 throw in `outingLikeCreate`. Added 1 concurrent-race test (43 total). |
| `openspec/changes/outings/apply-progress.md` | Modified | Updated test-suite claim, added remediation documentation. |
| `openspec/changes/outings/tasks.md` | Modified | Fixed hash formula in task 2.5 (no-delimiter → `:` delimiter). |

### Verification (Post-Remediation)
- `pnpm --filter @m199/api test src/outings/outings.service.test.ts` → 43/43 ✅
- `pnpm --filter @m199/api test src/outings` → 64/64 ✅ (2 files)
- `pnpm --filter @m199/api typecheck` → Clean ✅
- `pnpm test` → 292/292 ✅ (db: 17 + web: 7 + api: 268)

### Remaining Risks
- None. All gate findings resolved.
