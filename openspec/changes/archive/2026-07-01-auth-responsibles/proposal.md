# Proposal: Auth and Responsible Users

## Intent

Enable responsible users to access the admin/API surface safely through local authentication, httpOnly cookie sessions, and MVP responsible-user management. This closes the current gap where the schema models users/sessions but the API has no auth module, login, logout, inactive-user enforcement, or responsible-user CRUD.

## Scope

### In Scope
- Local login with access token + refresh token transported through httpOnly cookies.
- Multiple refresh sessions per responsible user, refresh rotation, and logout of the current session.
- Active/inactive responsible-user checks across login, refresh, and authenticated endpoints.
- Basic responsible-user CRUD by any authenticated responsible user.
- Password reset by another responsible user, revoking all sessions for the affected account.
- Immediate session revocation when a responsible user is inactivated.
- First responsible user created through seed/manual setup only.

### Out of Scope
- Public registration or self-service first-user onboarding.
- Roles/permissions beyond “any authenticated active responsible user”.
- Social login, password recovery by email, MFA, or audit UI.

## Capabilities

### New Capabilities
- `auth-responsibles`: Authentication, refresh-session lifecycle, active/inactive enforcement, responsible-user CRUD, and password reset by another responsible user.

### Modified Capabilities
- None.

## Approach

Build a thin NestJS auth/responsibles module over the existing `ResponsibleUser` and `RefreshSession` Prisma model. Keep DB ownership in `@m199/db`, expose API services/controllers/guards/DTOs in `apps/api`, hash stored refresh tokens, clear cookies on logout/revocation, and test lifecycle edge cases explicitly.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/**` | New | Auth/responsibles modules, guards, DTOs, controllers, services, tests. |
| `packages/db/prisma/schema.prisma` | Modified | Only if auth/session implementation exposes schema gaps. |
| `docs/technical-foundation.md` | Modified | Align documented auth/session behavior. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No roles model over-permits actions | Med | Document MVP rule; revisit before broader admin roles. |
| Refresh/session revocation bugs leave stale access | Med | Centralize revocation and cookie clearing; test login, refresh, logout, reset, inactive flows. |
| First-user setup becomes accidental public registration | Low | Keep seed/manual setup explicit and outside public API. |

## Rollback Plan

Revert API auth/responsibles modules and any schema/docs deltas. If migrations change auth/session tables, apply a rollback migration only after revoking issued sessions and confirming no production data depends on the new columns.

## Dependencies

- Existing NestJS API foundation and `@m199/db` Prisma boundary.
- Seed/manual operational path for the first responsible user.

## Success Criteria

- [ ] Active responsible users can login, refresh, and logout current session via httpOnly cookies.
- [ ] Multiple sessions work independently, while reset/inactivation revoke all affected sessions.
- [ ] Any authenticated active responsible user can create, edit, deactivate, and reset passwords for other responsible users.
- [ ] No public registration or roles/permissions model is introduced.
