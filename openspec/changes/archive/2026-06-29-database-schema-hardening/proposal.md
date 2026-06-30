# Proposal: Database Schema Hardening

## Intent

Tighten the current Prisma database model so MVP invariants are explicit, reviewable, and separated into DB-enforceable constraints versus API/transaction-enforced rules before runtime feature work starts.

## Scope

### In Scope
- Harden `packages/db/prisma/schema.prisma` constraints, indexes, relation behavior, and comments where Prisma can express the rule safely.
- Keep `packages/db/prisma.config.ts` and `packages/db/package.json` aligned with Prisma 7 validation/format/typecheck workflow.
- Update `docs/technical-foundation.md` so the constraint strategy matches the schema.

### Out of Scope
- API endpoints, auth flows, upload handling, seed data, generated clients, DB provisioning, and product UI.
- Full migration/test fixture scaffolding unless required for schema validation.
- Enforcing rules Prisma cannot express cleanly without later SQL/API transactions.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `mvp-technical-foundation`: clarify hardened database constraints and which durable rules remain application/transaction-enforced.

## Approach

Use schema-first hardening. Prefer Prisma-native uniqueness, indexes, required fields, relation settings, and documented invariants. Do not expand into runtime features. Rules such as one landing settings row, like-count synchronization, upload policy limits, and publish-readiness checks remain explicit API/transaction responsibilities.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/db/prisma/schema.prisma` | Modified | Harden DB-enforceable constraints and document deferred invariants. |
| `packages/db/prisma.config.ts` | Modified | Keep Prisma 7 schema/env wiring reviewable if schema workflow needs adjustment. |
| `packages/db/package.json` | Modified | Ensure DB validation/format/typecheck scripts remain accurate. |
| `docs/technical-foundation.md` | Modified | Sync human-readable constraint strategy. |
| `openspec/specs/mvp-technical-foundation/spec.md` | Modified | Add/adjust requirements for schema hardening behavior. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope expands into migrations/client/runtime work | Med | Keep non-schema runtime work out of scope. |
| Prisma cannot enforce every invariant | High | Label DB-enforced vs API/transaction-enforced rules explicitly. |
| Over-hardening blocks future product decisions | Med | Avoid premature upload limits or policies without final decisions. |

## Rollback Plan

Revert the schema, DB package workflow, docs, and OpenSpec delta changes. Re-run DB validation and root quality commands to confirm the previous baseline is restored.

## Dependencies

- Existing Prisma 7 package setup and `DATABASE_URL`-based validation workflow.

## Success Criteria

- [ ] Prisma schema validation passes after hardening.
- [ ] Spec/docs distinguish DB-enforced rules from API/transaction-enforced rules.
- [ ] No runtime product behavior, seed data, provisioning, or broad migration scaffolding is added.
