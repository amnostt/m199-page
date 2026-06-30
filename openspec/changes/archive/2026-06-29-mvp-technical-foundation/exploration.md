# Exploration: MVP technical foundation

### Current State
The repository has only SDD metadata (`openspec/` and `.atl/`); there is no application code, runtime module, or test tooling yet. The MVP context captured in Engram describes a public mobile-first ministry site plus an admin panel. Public-facing content centers on outings (`Salidas`), posts, and daily verses. Internal code should stay in English even when public labels are Spanish.

#### Product / domain summary
- Public site: ministry presentation, outings, posts, daily verses.
- Admin side: content management, responsible-user management, featured content control.
- Authentication: JWT-based admin access.
- Storage: local file uploads for images/documents.

#### Entity candidates
- `User` / `ResponsibleUser` — admin/operator account with active/inactive state.
- `Session` / `RefreshSession` — refresh-token session tracking.
- `Outing` — ministry outing/event content.
- `Post` — news/update/content entry.
- `Verse` — daily verse content.
- `FeaturedOuting` — singleton pointer to the current featured outing.
- `FeaturedPost` — featured post assignment (max 3 active).
- `Like` — anonymous engagement record.
- `FileAsset` — uploaded file metadata and constraints.

#### Key business rules
- Featured outing MUST be a singleton: only one outing can be featured at a time.
- Featured posts MUST be capped at 3 active items.
- Likes MUST be anonymous; no public user identity is stored for a like.
- Responsible users MUST support active/inactive status to disable access without deletion.
- Refresh sessions MUST be tracked separately from access tokens.
- File uploads MUST enforce size/type constraints and persist metadata, not just raw paths.

### Affected Areas
- `openspec/changes/mvp-technical-foundation/exploration.md` — exploration artifact.
- `openspec/config.yaml` — may need to evolve once architecture and testing conventions are locked.
- `apps/web` *(proposed)* — React public/admin UI.
- `apps/api` *(proposed)* — NestJS API, auth, business rules, file upload handling.
- `packages/db` *(proposed)* — Prisma schema, migrations, database access.
- `packages/shared` *(proposed)* — shared types/validation helpers if needed.

### Approaches
1. **Workspace monorepo with modular services** — `pnpm` workspaces containing `apps/web`, `apps/api`, and shared packages.
   - Pros: clear boundaries, shared Prisma/types, supports future growth, matches requested stack.
   - Cons: more setup up front, requires workspace discipline.
   - Effort: Medium

2. **Single-app first, split later** — build a minimal prototype with less package structure, then extract modules.
   - Pros: fastest initial bootstrap.
   - Cons: weak boundaries, harder to share schema/types cleanly, likely to create refactor debt.
   - Effort: Low now / High later

### Recommendation
Use a pnpm workspace monorepo from the start, with React in `apps/web`, NestJS in `apps/api`, and Prisma/PostgreSQL isolated in a shared data package. This best fits the MVP scope, keeps business rules centralized in the API, and avoids a costly split later.

### Risks
- The domain still needs clarification around content ownership, moderation, and whether likes are purely counters or persistent anonymous records.
- File upload constraints must be nailed down early to avoid storage and security rework.
- The singleton featured outing and max-3 featured posts rules need database-level enforcement, not just UI checks.
- No code exists yet, so the first implementation phase must establish conventions carefully.

### Ready for Proposal
Yes — the change can move to proposal once the open questions above are answered and the entity boundaries are approved.
