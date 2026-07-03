# Apply Progress: Outings — Phase 1 (Type Layer + Config)

## Batch: PR Slice 1 / Phase 1
**Date**: 2026-07-03
**Mode**: Strict TDD
**Status**: Complete — all 8 tasks done

## Completed Tasks

- [x] 1.1 Create `apps/api/src/outings/dto/create-outing.dto.ts`
- [x] 1.2 Create `apps/api/src/outings/dto/update-outing.dto.ts`
- [x] 1.3 Create `apps/api/src/outings/dto/outing-list-query.dto.ts`
- [x] 1.4 Add `VISITOR_HASH_SECRET` to REQUIRED_KEYS + EnvConfig
- [x] 1.5 Create `apps/api/src/outings/outings.module.ts`
- [x] 1.6 Import `OutingsModule` in `apps/api/src/app.module.ts`
- [x] 1.7 DTO validation tests (missing required fields, invalid status)
- [x] 1.8 Config validation test (VISITOR_HASH_SECRET missing)

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/outings/dto/create-outing.dto.ts` | Created | DTO with @IsNotEmpty for title/slug/dateTime/location/description, optional file IDs, @IsEnum status |
| `apps/api/src/outings/dto/update-outing.dto.ts` | Created | Partial update with all fields @IsOptional |
| `apps/api/src/outings/dto/outing-list-query.dto.ts` | Created | Optional status enum filter + skip/take pagination |
| `apps/api/src/outings/dto/outings.dto.test.ts` | Created | 21 tests: required field rejection, invalid status, empty-update validity, query filters |
| `apps/api/src/outings/outings.module.ts` | Created | NestJS module skeleton (controllers/service to be added in PR 2) |
| `apps/api/src/config/env.validation.ts` | Modified | Added VISITOR_HASH_SECRET to REQUIRED_KEYS and return value |
| `apps/api/src/config/env.interface.ts` | Modified | Added VISITOR_HASH_SECRET: string to EnvConfig |
| `apps/api/src/config/env.validation.test.ts` | Modified | Refactored to use MINIMAL_VALID_CONFIG, added 2 OUT-07 tests |
| `apps/api/src/app.module.ts` | Modified | Imported OutingsModule |
| `apps/api/src/app.module.test.ts` | Modified | Added VISITOR_HASH_SECRET to validateMock |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `outings.dto.test.ts` | Unit | N/A (new) | ✅ Written | ✅ 13/13 | ✅ 3 statuses + empty title/slug | ➖ Clean |
| 1.2 | `outings.dto.test.ts` | Unit | N/A (new) | ✅ Written | ✅ 3/3 | ✅ empty + single + invalid | ➖ Clean |
| 1.3 | `outings.dto.test.ts` | Unit | N/A (new) | ✅ Written | ✅ 4/4 | ✅ empty + valid + invalid + pagination | ➖ Clean |
| 1.4 | `env.validation.test.ts` | Unit | ✅ 17/17 | ✅ Written | ✅ 16/16 | ✅ missing + empty VISITOR_HASH_SECRET | ✅ MINIMAL_VALID_CONFIG |
| 1.5 | `app.module.test.ts` | Integration | ✅ 3/3 | ➖ Structural | ✅ 3/3 | ➖ Single | ➖ None needed |
| 1.6 | `app.module.test.ts` | Integration | ✅ 3/3 | ➖ Structural | ✅ 3/3 | ➖ Single | ➖ None needed |
| 1.7 | `outings.dto.test.ts` | Unit | N/A | ✅ Written | ✅ 21/21 | ✅ All scenarios | ➖ Clean |
| 1.8 | `env.validation.test.ts` | Unit | ✅ 17/17 | ✅ Written | ✅ 16/16 | ✅ 2 OUT-07 scenarios | ➖ Clean |

## Test Summary
- **Total tests written**: 24 new (21 DTO + 2 env + 1 refactored env)
- **Total tests passing**: 40 (across 3 test files)
- **Layers used**: Unit (38), Integration (2 via app.module)
- **Approval tests**: None — no refactoring of existing behavior
- **Pure functions created**: 0 (all NestJS/class-validator decorator-based)

## Deviations from Design
- **UpdateOutingDto**: Design said `PartialType(CreateOutingDto)` from `@nestjs/common`, but `PartialType` is not available at runtime in NestJS 11 without `@nestjs/mapped-types` (not installed). Followed existing project pattern (`UpdateLandingSettingsDto`) — defined all fields manually with `@IsOptional()`.
- **OutingListQueryDto skip/take validation**: Removed `@Type(() => Number)` + `@IsInt` + `@Min` decorators because `class-transformer`'s `@Type()` requires `reflect-metadata` import in test setup (not configured in project's vitest). No existing DTO in the codebase uses `@Type()`. Numeric parsing and bounds checking deferred to the service layer (PR 2).
- **Non-existent asset ID test (task 1.7 note)**: Not tested in this slice — asset ID validation requires service-level logic. Left for PR 2 per instructions. Apply-progress updated honestly.

## Issues Found
None.

## Remaining Tasks (Phase 2: Outings Service — PR 2)
- [ ] 2.1–2.7 OutingsService, publish-readiness, visitor hash, transactional likes

## Workload / PR Boundary
- **Mode**: Chained PR slice 1 / Phase 1
- **Chain strategy**: stacked-to-main
- **Current work unit**: Type Layer + Config (~180 lines)
- **Boundary**: DTOs → env config → module skeleton → app.module wiring
- **Estimated review budget impact**: ~160 changed lines (within 400-line budget)
