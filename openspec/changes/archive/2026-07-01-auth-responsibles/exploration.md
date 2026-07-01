# Exploration: auth + responsables

### Current State
The roadmap has reached step 4 and explicitly wants login, httpOnly cookies, access + refresh tokens, multiple sessions, current-session logout, active/inactive responsible users, basic responsible-user CRUD, and password reset by another responsible user.

The foundation is already partially prepared: `packages/db/prisma/schema.prisma` defines `ResponsibleUser`, `ResponsibleUserStatus`, `RefreshSession`, and `RefreshSessionStatus`, and `docs/technical-foundation.md` already documents the intended auth/session model. However, `apps/api` still only has the backend foundation; there is no auth module, no JWT/cookie wiring, no session lifecycle service, no responsible-user CRUD routes, and no password-reset flow.

### Affected Areas
- `apps/api/src/**` — new auth/responsible modules, guards, DTOs, controllers, and tests.
- `packages/db/prisma/schema.prisma` — may need small auth/session refinements if implementation exposes gaps.
- `docs/technical-foundation.md` — should stay aligned with the chosen auth/session behavior.
- `docs/development-roadmap.md` — step 4 is the active roadmap target.
- `openspec/changes/auth-responsibles/` — proposal/spec/design/tasks will live here next.

### Approaches
1. **Thin NestJS auth module on top of the existing schema** — implement local login, hashed refresh sessions, httpOnly cookies, guards, logout-current-session, inactive-user checks, and responsible-user CRUD in a small set of Nest modules.
   - Pros: matches the current backend stack, reuses the existing Prisma auth model, keeps scope reviewable, and fits the roadmap.
   - Cons: requires careful manual handling of cookies, rotation, and token hashing; more auth edge cases must be tested explicitly.
   - Effort: Medium

2. **Passport-heavy auth stack** — add Passport/JWT strategies, guards, and refresh flows through the Nest ecosystem.
   - Pros: more framework conventions, familiar patterns for future expansion.
   - Cons: larger dependency footprint, more indirection than this MVP needs, and higher review cost for the first auth slice.
   - Effort: Medium/High

### Recommendation
Use the thin NestJS auth module. The schema already expresses the core auth model, so the first slice should focus on behavior: login, refresh-token issuance/rotation, cookie transport, current-session logout, and inactive-user blocking. Responsible-user CRUD and password-reset-by-another-responsible-user should build on that foundation, not precede it.

### Risks
- Refresh-session rotation and multiple-session logout can get subtle if token revocation and cookie clearing are not designed together.
- Password reset by another responsible user needs a clear authorization rule and audit trail; otherwise this becomes a privilege-escalation hole.
- Inactive-user enforcement must apply consistently across login, refresh, and CRUD endpoints, not just the login screen.

### Ready for Proposal
Yes — but first clarify the password-reset authority rules and whether logout-current-session should revoke only the active refresh session or also rotate tokens immediately.
