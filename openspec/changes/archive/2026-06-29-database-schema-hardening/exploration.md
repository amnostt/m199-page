# Exploration: database schema hardening

### Current State
The workspace baseline is in place and the Prisma draft already validates. `packages/db/prisma/schema.prisma` covers the MVP entities and core relations, `packages/db/prisma.config.ts` loads `DATABASE_URL` from the root `.env`, and the foundation docs describe the intended invariants.

What is still soft: there are no migrations, generated client, or DB test fixtures yet, and several rules are still documented as application/transactional concerns rather than hard database guarantees (for example one landing settings row, transactional like-count sync, and upload-policy limits).

### Affected Areas
- `packages/db/prisma/schema.prisma` — core entity/constraint hardening.
- `packages/db/prisma.config.ts` — Prisma 7 env/schema wiring.
- `packages/db/package.json` — validate/format/typecheck scripts for the DB package.
- `docs/technical-foundation.md` — human-readable constraint strategy must stay in sync.
- `openspec/changes/database-schema-hardening/` — new SDD change artifacts.

### Approaches
1. **Schema-first hardening** — tighten the Prisma model and package-level DB workflow, but keep runtime features deferred.
   - Pros: smallest review surface, fits the 400-line budget, keeps the change aligned with the current baseline.
   - Cons: some invariants still need API transactions or later SQL migrations.
   - Effort: Medium

2. **Full DB foundation slice** — harden the schema plus add migration workflow, client generation, and DB test scaffolding in the same change.
   - Pros: more operationally complete; reduces follow-up setup work.
   - Cons: more decisions, more files, and a higher risk of scope creep.
   - Effort: High

### Recommendation
Use **schema-first hardening**. The current draft is already valid, so the next SDD change should focus on the invariants Prisma can express now and document the remainder as explicit API/transaction rules. If migration scaffolding is needed, keep it minimal and only as far as required to make the schema operationally reviewable.

### Risks
- Prisma cannot fully enforce one-row-only landing settings or transactional like-count consistency by itself.
- Migration/client setup can easily expand the slice beyond the review budget.
- Hardening work could become churn if we do not separate DB-enforceable rules from app-enforced rules.

### Ready for Proposal
Yes — propose a narrowly scoped hardening slice that lists which rules will be enforced in Prisma/schema now, and which will remain API- or transaction-enforced later.
