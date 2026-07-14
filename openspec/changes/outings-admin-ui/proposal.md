# Proposal: Outings Admin UI

## Intent

Enable authenticated administrators to manage outings in the existing admin shell instead of relying on the protected API directly.

## Scope

### In Scope
- Activate an Outings section with a status-filtered admin list.
- Create and edit outings across all API-supported fields, including optional image, croquis, and plan assets.
- Provide confirmed Draft, Publish, and Archive actions, surfacing server validation errors.

### Out of Scope
- Landing feature controls or Landing Settings changes.
- Public outing pages, unrelated admin CRUD modules, and a Posts refactor.
- Asset-removal controls until the API clearing contract is confirmed.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `outings`: define authenticated admin-web list, form, and lifecycle behavior for existing outing management.
- `admin-web`: make Outings an active local-state admin-shell section with shared feedback and confirmations.

## Approach

Add a dedicated Outings owner, list, form, types, and authenticated API client following the existing Posts composition pattern. Reuse the session, shell, and `FileUploadWidget`; model the admin API response separately from public outing projections. Keep lifecycle truth server-authoritative and refresh UI state only from responses.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/admin/AdminApp.tsx` | Modified | Activate Outings navigation and section. |
| `apps/web/src/admin/OutingsPage.tsx` | New | Own list/form view state. |
| `apps/web/src/admin/OutingsListPage.tsx` | New | Filter, render, and invoke lifecycle actions. |
| `apps/web/src/admin/OutingFormPage.tsx` | New | Create/edit API-supported fields and assets. |
| `apps/web/src/admin/outingsApi.ts` | New | Isolate authenticated outing requests. |
| `apps/web/src/admin/adminTypes.ts` | Modified | Add admin outing contracts. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Publish-required fields are incomplete | Medium | Surface API errors; do not infer success locally. |
| Admin/public response shapes diverge | Medium | Use separate admin contracts. |
| Asset semantics are unclear | Medium | Preserve IDs; defer removal controls. |

## Rollback Plan

Revert the isolated web-admin files and restore Outings as unavailable in `AdminApp`; existing API, public behavior, Posts, and Landing Settings remain unchanged.

## Dependencies

- Existing authenticated `/outings/admin` and file-upload endpoints.

## Success Criteria

- [ ] Authenticated admins can list, create, and edit outings with status filtering and all supported asset slots.
- [ ] Confirmed Draft, Publish, and Archive actions reflect server responses and display failures.
- [ ] No Landing feature control, unrelated CRUD change, or Posts refactor is introduced.
