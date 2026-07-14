# Design: Outings Admin UI

## Technical Approach

Add a local-state Outings section to the authenticated `AdminApp`, matching the existing Posts owner/list/form composition. The browser calls the existing protected Outings and Files APIs through `adminFetch`; no API, public UI, Landing feature control, Posts refactor, or asset-clearing behavior is added. The parallel delta spec was not available during design.

## Architecture Decisions

| Decision | Options / tradeoff | Choice and rationale |
|---|---|---|
| Section composition | Route library; local owner state | Create `OutingsPage` with `list/create/edit` state, as `PostsPage` does. The shell has no router, and the list response already contains every editable field. |
| List/filter source | Filter locally; query server | Request `GET /outings/admin?status=…` on filter change (or no query for All), retaining the API’s ordering/pagination contract and server authority. |
| Lifecycle | Invent a publish endpoint; PATCH status | Save Draft and Publish submit `status: DRAFT|PUBLISHED` through existing create/PATCH endpoints; Archive alone uses `POST /:id/archive`. Confirm every mutation and use returned rows to reconcile list state. |
| Errors/assets | Generic errors and removable slots; preserve response errors and IDs | Add a parsed `AdminRequestError` from `adminFetch` so the outing form shows API validation text. Reuse `FileUploadWidget` only to upload/replacement-select IDs; show existing assets as links/previews and expose no removal control, because `null` clearing semantics are not confirmed. |

## Data Flow

```text
AdminApp → OutingsPage → OutingsListPage ──GET /outings/admin?status──→ API
                         │       │
                         │       └─ edit selected OutingAdmin (no detail endpoint)
                         └→ OutingFormPage ──POST/PATCH──→ API → returned row → list reload
FileUploadWidget ──multipart POST /files/{OUTING_*}──→ FileAsset.id ──→ form payload
```

`adminFetch` includes cookies, performs its established one-refresh retry for 401, and redirects on 403. Form and lifecycle UI never assert success before the API response; rejected mutations retain user input and display the parsed error.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/admin/AdminApp.tsx` | Modify | Activate `outings`, render `OutingsPage`, remove it from placeholders. |
| `apps/web/src/admin/adminTypes.ts` | Modify | Add admin-only outing row, status, form, and mutation types. |
| `apps/web/src/admin/session.ts` | Modify | Export parsed request error while retaining existing auth/retry semantics. |
| `apps/web/src/admin/outingsApi.ts` | Create | Typed wrappers for list/create/update/archive and URL helpers. |
| `apps/web/src/admin/OutingsPage.tsx` | Create | Own list/create/edit view state and reload-after-save boundary. |
| `apps/web/src/admin/OutingsListPage.tsx` | Create | Server-filtered list, edit/create entry points, confirmed archive actions. |
| `apps/web/src/admin/OutingFormPage.tsx` | Create | Required fields, date-time conversion, three upload slots, confirmed Draft/Publish saves, API errors. |
| `apps/web/src/admin/AdminApp.test.tsx` | Modify | RED test for active Outings navigation. |
| `apps/web/src/admin/outingsApi.test.ts` | Create | RED typed-client and payload/error coverage. |
| `apps/web/src/admin/OutingsListPage.test.tsx` | Create | RED list/filter/archive confirmation coverage. |
| `apps/web/src/admin/OutingFormPage.test.tsx` | Create | RED create/edit, assets, Draft/Publish, and validation coverage. |
| `apps/web/src/admin/session.test.ts` | Modify | Cover parsed JSON/plain-text API errors without regressing auth retry. |

## Interfaces / Contracts

```ts
type OutingStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
interface OutingAdmin {
  id: string; slug: string; title: string; dateTime: string;
  location: string; description: string; status: OutingStatus;
  mainImageId: string | null; croquisId: string | null; planId: string | null;
}
// GET /outings/admin?status=OutingStatus → OutingAdmin[]
// POST /outings/admin and PATCH /outings/admin/:id → OutingAdmin
// POST /outings/admin/:id/archive → OutingAdmin
```

The payload contains title, slug, ISO `dateTime`, location, description, optional asset IDs, and status. Upload categories are `OUTING_MAIN_IMAGE`, `OUTING_CROQUIS`, and `OUTING_PLAN`; server MIME rules remain authoritative.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | API query/payload, URL/error helpers | RED tests in `apps/web/src/admin/outingsApi.test.ts` and `apps/web/src/admin/session.test.ts`; assert credentials, ISO/status/asset IDs, parsed failures. |
| Component | Shell navigation; list states/filter; form load from selected row; upload IDs; confirmations; pending/error/reload behavior | Vitest + Testing Library, mocked `fetch` and `window.confirm`; include decline/no-request and server validation failure cases. |
| Integration | Existing API contracts and authenticated upload behavior | Retain API controller/service tests; no new API behavior required. E2E is unavailable per `openspec/config.yaml`. |

## Threat Matrix

N/A — no routing, shell commands, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The admin shell’s local section switch and HTTP calls do not introduce one of the listed process boundaries.

## Migration / Rollout

No migration required. The UI is additive over deployed protected contracts; rollback removes the isolated web-admin files and restores the Outings placeholder.

## Open Questions

- [ ] None blocking. Asset clearing remains explicitly deferred until the API distinguishes omitted IDs from `null` clearing.
