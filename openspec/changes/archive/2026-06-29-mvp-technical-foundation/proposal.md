# Proposal: MVP Technical Foundation

## Intent

Create the technical foundation document and initial Prisma/domain model for the Misión 1-99 MVP before application implementation. This prevents ad hoc structure, unclear module boundaries, and weak enforcement of core content rules.

## Scope

### In Scope
- Define monorepo structure for `apps/web`, `apps/api`, `packages/db`, and optional shared packages.
- Document API modules, web feature areas, persistence/auth/file-upload boundaries.
- Draft the initial Prisma/domain model for users, sessions, outings, posts, verses, featured content, likes, and file assets.
- Capture business rules and assumptions for unresolved product questions.

### Out of Scope
- Implementing React/NestJS application features.
- Building admin/public UI screens, auth flows, upload handling, or migrations beyond model draft.
- Advanced roles, social login, password recovery, public search, dark mode, presenter mode, embedded post images.

## Capabilities

### New Capabilities
- `mvp-technical-foundation`: Defines the architecture document and initial domain/persistence model required before MVP implementation.

### Modified Capabilities
- None.

## Approach

Use a `pnpm` workspace monorepo with React in `apps/web`, NestJS in `apps/api`, Prisma/PostgreSQL in `packages/db`, and shared validation/types only where needed. Keep business rules centralized in API modules, with database-level constraints for featured content.

### Initial Model Rules
- One active featured outing at a time.
- Up to three active featured posts.
- Responsible users support active/inactive status without deletion.
- Refresh sessions are tracked separately from JWT access tokens.
- Likes are anonymous and store no public user identity.
- File assets persist metadata and enforce size/type constraints.

### Assumptions
- Content ownership/moderation is deferred unless required by MVP admin workflows.
- Likes are persistent anonymous records, not only aggregate counters.
- Local file storage is acceptable for MVP, with metadata enabling future migration.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `openspec/changes/mvp-technical-foundation/` | Modified | Add proposal artifact. |
| `docs/technical-foundation.md` | New | Planned foundation document. |
| `packages/db/prisma/schema.prisma` | New | Planned initial Prisma model. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Model overreaches MVP | Med | Mark unresolved assumptions and defer non-MVP flows. |
| Featured rules enforced only in UI | Med | Specify DB/API enforcement. |
| Upload constraints remain vague | Med | Document accepted types, size, and metadata before implementation. |

## Rollback Plan

Revert this proposal and any later foundation/model artifacts before implementation; no runtime behavior or persisted production data is affected.

## Dependencies

- Captured MVP requirements and exploration for `mvp-technical-foundation`.

## Success Criteria

- [ ] Proposal clearly limits this change to documentation and initial model design.
- [ ] Foundation scope covers monorepo, API, web, persistence, auth, and uploads.
- [ ] Initial business rules are represented as model/spec requirements.
- [ ] Open assumptions are visible for later validation.
