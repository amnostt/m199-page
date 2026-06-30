# Archive Report: Backend Foundation

**Change**: `backend-foundation`  
**Archive Date**: 2026-06-30  
**Artifact Mode**: hybrid  
**Verification Verdict**: PASS WITH WARNINGS  
**Chain Strategy**: stacked-to-main (preserved)

## Executive Summary

The `backend-foundation` SDD change is fully archived. A thin NestJS API foundation was introduced into `apps/api/` — bootstrap, config validation, global error envelope, DB boundary over `@m199/db`, health endpoint, and focused tests — all before any product or auth modules. All 28 implementation tasks are complete and verified. Final verification returned PASS WITH WARNINGS with zero CRITICAL issues.

## Verification Summary

| Metric | Value |
|--------|-------|
| Final verification verdict | PASS WITH WARNINGS |
| CRITICAL issues | 0 |
| Blocking issues | 0 |
| Tasks total | 28 |
| Tasks complete | 28/28 |
| Tests passed (final) | 25/25 (API: 22, DB: 2, Web: 1) |
| Typecheck | PASS (all packages) |
| BF-01–BF-06 spec compliance | 16/17 compliant, 1/17 partial (fresh install not rerun) |

### Non-Blocking Warnings (preserved)

1. **Fresh install not rerun**: Workspace typecheck and tests passed against the current installed dependency state. A clean checkout + `pnpm install` was not performed during final verification.
2. **Dotenv injection from local `.env`**: Root and DB test output reported dotenv loading from `../../.env`. `.env` is not tracked and its contents were never read, but the test environment still observes local dotenv loading behavior.
3. **Review budget exceeded**: The full combined change exceeds the 400-line review budget. Stacked-to-main slicing (Slice 1 → Slice 2) must be preserved, not collapsed into a single PR. Slice 1 had an explicit user-approved `size:exception`.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `backend-api-foundation` | Created (new capability) | 6 requirements (BF-01–BF-06) copied to main specs |
| `mvp-technical-foundation` | Updated (2 MODIFIED) | MVP Exclusions — now explicitly names NestJS API scaffolding; Installable Workspace Baseline — now explicitly mentions runtime API foundation |

### Delta Spec Merge Details

**`backend-api-foundation`**: Main spec did not exist. Full spec copied directly to `openspec/specs/backend-api-foundation/spec.md`. Contains requirements BF-01 through BF-06 covering NestJS bootstrap, config validation, error conventions, DB boundary, health endpoint, and test coverage.

**`mvp-technical-foundation`**: Two requirements modified in the existing main spec:

1. **MVP Exclusions**: Updated to explicitly name NestJS API bootstrap with an operational health endpoint as allowed scaffolding. The previously generic "runtime shells" language was replaced with the specific NestJS reference. Exclusion scope otherwise unchanged.

2. **Installable Workspace Baseline**: Updated to mention "runtime API foundation" alongside existing "operational database scaffolding." The previously DB-only scaffolding language was enriched to reflect the NestJS API foundation now present in the baseline.

All other requirements in `mvp-technical-foundation` were preserved unchanged: Foundation Document Structure, Initial Domain Model Coverage, Constraint Enforcement Tier, Business Rule Representation, Artifact Validation, Shared Tooling Commands, Local/Dev PostgreSQL Environment Contract, Prisma Migration Workflow, Prisma Client Generation, Database Package Ownership Boundary, and Seed Safeguard.

## Task Completion

All 28 tasks across 6 phases are complete and checked in the archived `tasks.md`:

| Phase | Tasks | Status |
|-------|-------|--------|
| 1: Dependencies, Config & Env Validation | 5 (1.1–1.5) | ✅ Complete |
| 2: NestJS Bootstrap & Error Conventions | 4 (2.1–2.4) | ✅ Complete |
| 3: DB Boundary & @m199/db Refactor | 3 (3.1–3.3) | ✅ Complete |
| 4: Health & Validation Proof | 5 (4.1–4.5) | ✅ Complete |
| 5: Testing | 6 (5.1–5.6) | ✅ Complete |
| 6: Corrective (Post-Verify Fixes) | 5 (6.1–6.5) | ✅ Complete |

Zero unchecked implementation tasks remain.

## Archive Contents

```
openspec/changes/archive/2026-06-30-backend-foundation/
├── exploration.md              — SDD exploration notes
├── proposal.md                 — Change proposal (scope, risks, approach)
├── design.md                   — Technical design and architecture decisions
├── tasks.md                    — 28/28 tasks complete
├── verify-report-slice-1.md    — Slice 1 verification (PASS WITH WARNINGS)
├── verify-report.md            — Final verification (PASS WITH WARNINGS)
├── archive-report.md           — This report
└── specs/
    ├── backend-api-foundation/
    │   └── spec.md             — Delta spec (BF-01–BF-06)
    └── mvp-technical-foundation/
        └── spec.md             — Delta spec (2 MODIFIED requirements)
```

## Design Deviations (Documented)

Four minor deviations from the original design were discovered and documented during implementation:

1. **PrismaClient type**: Replaced with local `PrismaClientLike` interface — `@prisma/client` type is not resolvable from `apps/api/` (transitive dep only). Same contract, zero ownership violation (BF-04 compliant).
2. **Health test approach**: Direct controller instantiation instead of `Test.createTestingModule` — NestJS v11 DI limitation with `ConfigService`. Functionally equivalent coverage.
3. **AppModule test: validate mock**: `vi.mock` on env validation due to ESM import hoisting. Real `validate()` is tested separately in `env.validation.test.ts` (7 tests).
4. **main.ts bootstrap export**: `bootstrap()` exported with `!process.env.VITEST` guard for testability — vitest sets this env var automatically.

## Traceability

| Artifact | Location | Engram ID |
|----------|----------|-----------|
| Proposal | `openspec/changes/archive/2026-06-30-backend-foundation/proposal.md` | — |
| Specs (delta) | `openspec/changes/archive/2026-06-30-backend-foundation/specs/` | — |
| Design | `openspec/changes/archive/2026-06-30-backend-foundation/design.md` | — |
| Tasks | `openspec/changes/archive/2026-06-30-backend-foundation/tasks.md` | — |
| Verify (Slice 1) | `openspec/changes/archive/2026-06-30-backend-foundation/verify-report-slice-1.md` | — |
| Verify (Final) | `openspec/changes/archive/2026-06-30-backend-foundation/verify-report.md` | — |
| Apply Progress | — | #209 |
| Archive Report | `openspec/changes/archive/2026-06-30-backend-foundation/archive-report.md` | topic: `sdd/backend-foundation/archive-report` |

## Source of Truth Updated

- `openspec/specs/backend-api-foundation/spec.md` — NEW capability (6 requirements)
- `openspec/specs/mvp-technical-foundation/spec.md` — UPDATED (2 modified requirements)

## Archive Decision

**Archived with warnings**. No CRITICAL issues were present in the final verification report. The three non-blocking warnings (fresh install not rerun, dotenv loading observed, review budget slicing required) have been preserved in this archive report. The stacked-to-main PR slicing requirement is explicitly preserved as a constraint for the delivery workflow. Slice 1's `size:exception` was user-approved per documented audit.

## SDD Cycle Complete

The `backend-foundation` change has completed the full SDD lifecycle: proposal → spec → design → tasks → apply (Slice 1 + Slice 2 + corrective) → verify (Slice 1 + final) → archive. The change is closed and the active changes directory is clean.
