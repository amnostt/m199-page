## Exploration: Outings Admin UI MVP

### Current State
The committed baseline already contains a protected Outings API at `/outings/admin` backed by `OutingsService`: authenticated list with status/pagination query, create, partial update, archive, and feature endpoints. Create/update support title, slug, date/time, location, description, status, and optional `mainImageId`, `croquisId`, and `planId`; the service validates publish readiness and referenced file assets. There is no Outings section in the web admin: `AdminApp` still renders Outings as a disabled placeholder, while Posts establishes the existing list/form owner pattern and `FileUploadWidget` provides reusable asset upload behavior.

The smallest usable UI slice is therefore an authenticated Outings admin section with:
- a status-filtered list of existing outings;
- create and edit forms covering every create/update field, including the three optional asset slots;
- explicit Draft/Publish/Archive lifecycle actions, with API errors surfaced rather than guessed locally;
- no feature-on-landing action, public outing changes, unrelated entity CRUD, or Landing Settings expansion.

### Affected Areas
- `apps/web/src/admin/AdminApp.tsx` — replace the disabled Outings navigation item and add the section to the authenticated admin shell.
- `apps/web/src/admin/adminTypes.ts` — add admin-facing Outing, status, and form contracts matching the existing API rows and DTOs.
- `apps/web/src/admin/OutingsPage.tsx` — own list/create/edit view state, following the existing `PostsPage` composition pattern.
- `apps/web/src/admin/OutingsListPage.tsx` — load `/outings/admin`, filter statuses, render empty/loading/error states, and trigger publish/archive/edit actions.
- `apps/web/src/admin/OutingFormPage.tsx` — create/edit all API-supported fields and use existing upload primitives for optional assets.
- `apps/web/src/admin/outingsApi.ts` — isolate authenticated list/create/update/archive requests and status/lifecycle error handling.
- `apps/web/src/admin/FileUploadWidget.tsx` — reuse its current contract for outing asset slots; only extend it if the existing file categories cannot represent outing assets.
- `apps/web/src/admin/*.test.tsx` and `apps/web/src/admin/outingsApi.test.ts` — cover the new UI and request mapping under the repository's Vitest/RTL pattern.
- `apps/api/src/outings/outings-admin.controller.ts` and `apps/api/src/outings/outings.service.ts` — reference only for contract validation; no backend change is currently indicated.

### Approaches
1. **Dedicated Outings admin section mirroring Posts** — add a small API client, section owner, list, and form while reusing auth, upload, and admin shell patterns.
   - Pros: smallest boundary; directly maps to existing endpoints; keeps Outings concerns isolated; easy to test and roll back.
   - Cons: introduces some duplicated list/form plumbing already present for Posts; lifecycle publish uses PATCH status rather than a dedicated endpoint.
   - Effort: Medium

2. **Generalize a shared editorial CRUD framework first** — extract reusable list/form/lifecycle abstractions for Posts and Outings before adding the feature.
   - Pros: may reduce future duplication across admin entities.
   - Cons: expands the change beyond the requested slice; risks disturbing the committed Posts behavior; requires designing abstractions before the Outings workflow is proven.
   - Effort: High

### Recommendation
Choose the dedicated Outings section. Implement only the admin list, create/edit form, and lifecycle actions against the already-supported API, reusing existing session, upload, and Posts composition patterns without refactoring Posts. Treat `feature` as explicitly out of scope for this MVP because it delegates into Landing Settings, which the request excludes; a later change can add it if product ownership requires it.

### Risks
- The API returns raw admin outing rows while the public API uses a different projection; the client must model the admin response separately and avoid copying public `OutingResponse` assumptions.
- Publish readiness is enforced server-side across title, slug, date/time, location, and description; the UI should preserve the server error and should not claim a successful publish from local state alone.
- Update DTO fields are optional but do not provide an explicit clear-to-null path for asset IDs; the form must either preserve existing asset IDs or verify the API's intended clearing semantics before exposing removal controls.
- Asset categories for outings are not currently established in the web admin; reusing `FileUploadWidget` may require confirming accepted backend categories without changing unrelated file-management behavior.
- Direct browser navigation under the admin shell is currently component state based, so this slice should keep navigation consistent with the existing shell rather than introduce a new router.

### Ready for Proposal
Yes. The proposal should commit to the dedicated, no-refactor slice: authenticated Outings list, create/edit form, Draft/Publish/Archive lifecycle, existing asset-upload reuse, and explicit exclusion of feature-on-landing and unrelated admin CRUD. Before design, confirm the asset-category/clear semantics from the existing file API and decide whether publish is a list action, a form status transition, or both.
