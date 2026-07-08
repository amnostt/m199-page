## Exploration: Posts CRUD admin UI

### Current State

**Backend (archived `2026-07-06-posts`)** — fully implemented, protected by `AuthGuard` at controller level (401 if unauthenticated):

`PostsAdminController` (`@Controller("posts/admin")`):
| Method | Path | Body/Query | Notes |
|---|---|---|---|
| GET | `/posts/admin` | `PostListQueryDto` (`status?`, `skip?`, `take?`) | List with optional status filter + pagination |
| GET | `/posts/admin/slug/:slug` | — | Read one post by slug for editing |
| POST | `/posts/admin` | `CreatePostDto` | Create; defaults `status: DRAFT` |
| PATCH | `/posts/admin/:id` | `UpdatePostDto` (all optional) | Partial update; never touches `featuredAt` |
| POST | `/posts/admin/:id/publish` | — | Sets `PUBLISHED`, sets `publishedAt` only on first publish |
| POST | `/posts/admin/:id/archive` | — | Sets `ARCHIVED`, deletes `FeaturedPost` row if present |
| DELETE | `/posts/admin/:id` | — | 204, cascades downloads + featured row (transaction) |
| POST | `/posts/admin/:id/feature` | — | Requires `PUBLISHED`; max 3 active; 409 `ConflictException` over cap |
| DELETE | `/posts/admin/:id/feature` | — | Idempotent unfeature |

`CreatePostDto`: `title` (required), `slug` (required, kebab-case regex), `content` (required, HTML — sanitized server-side via `sanitizePostContent`), `coverImageId?`, `description?`, `tags?` (string[], max 20), `downloadIds?` (string[]), `status?` (`DRAFT|PUBLISHED|ARCHIVED`).
`UpdatePostDto`: same fields, all optional.

`PostRow` (raw admin shape returned by list/get/create/update): `id, slug, title, description, coverImageId, content, status, tags, createdById, publishedAt, createdAt, updatedAt, downloads?` (each download: `id, postId, fileId, label, sortOrder, createdAt`). **Note**: the admin endpoints return the raw internal row shape — there is no `PostPublicResponse`-style mapping (that mapping only exists for the public read endpoints in `posts-public.controller.ts`). The admin UI must resolve `coverImageId`/`fileId` to `/files/{id}` URLs client-side, and must map `status` strings itself (no enum re-export from web).

Error contract observed in service: `ConflictException` (409) on slug collision or feature cap; `NotFoundException` (404) on missing post; `BadRequestException` (400) on invalid file category or unpublished-feature attempt.

**File module** (`apps/api/src/file-module/`, not `files/`):
- `POST /files/:category` (multipart, `AuthGuard`) → `FileAssetResponse { id, url, thumbnailUrl, mimeType, fileSize, originalFilename, category, createdAt }`.
- `DELETE /files/:id` (`AuthGuard`) → 204.
- `GET /files/:id` and `GET /files/:id/thumb` — public, no auth.
- Categories relevant to Posts: `POST_COVER_IMAGE` (image-only MIME) and `POST_DOWNLOAD` (image + PDF MIME). `PostsService.create/update` validates `coverImageId`/`downloadIds` against these categories server-side and throws 400 on mismatch — the admin UI should upload through the matching category endpoint so this validation passes, but doesn't need to duplicate the MIME check client-side (nice-to-have UX only).
- **Gap found**: `apps/web/vite.config.ts` dev proxy only forwards `/posts`, `/outings`, `/landing`, `/auth`. It does **not** proxy `/files`. Cover-image previews, thumbnail rendering, and file upload/delete calls from the admin UI will 404 against the Vite dev server unless the proxy config is extended. This must be an explicit task in the next design/tasks phase — flagged as an open risk below.

**Admin UI foundation** (archived `2026-07-07-ui-admin-complete`):
- `apps/web/src/admin/session.ts` — `login`, `refreshSession` (deduped in-flight promise), `logout`, and `adminFetch<T>(url, init)`: centralized fetch with `credentials: "include"`, one 401→refresh→retry cycle, 403→logout+redirect. **This is the exact helper the Posts admin UI must reuse for every API call** (list/get/create/update/publish/archive/delete/feature/unfeature, and file upload/delete).
- `apps/web/src/admin/AdminApp.tsx` — top-level bootstrap (`refreshSession` on mount with bounded timeout) → `AdminLogin` or `AdminShell`. `AdminShell` currently renders `LandingSettingsPage` unconditionally under a sidebar with a disabled `Posts` placeholder link (`nav-placeholder-posts`). Wiring Posts as the active section requires: (a) enabling that nav item, (b) adding minimal client-side routing/state to switch between Landing Settings and Posts (no router library is installed yet — current shell is single-page, no `react-router`).
- `apps/web/src/admin/LandingSettingsPage.tsx` — the reference CRUD-adjacent pattern: load-on-mount via `adminFetch`, normalize nullable API fields into a flat form-state type, `window.confirm` gate before mutating calls, four UI states (`loading`, `load-error`, `save-error`, `save-success`) each with a `data-testid`. Posts will need a richer version of this (list + create + edit + lifecycle actions), but the state-machine shape (loading/error/success per action) should be reused per-post-action rather than invented fresh.
- `apps/web/src/admin/adminTypes.ts` — shared type contracts mirroring API shapes (`AuthUser`, `LandingSettings`, `LandingSettingsForm`). Posts will need its own `Post`, `PostListItem`, `PostForm` (and possibly `PostDownload`) types added here.
- No file-upload UI pattern exists yet anywhere in `apps/web` — this will be new for Posts (cover image + downloadable files), and is the single biggest net-new piece of UI work in this slice.

**Testing conventions** (`apps/web`):
- Runner: `pnpm test` → `vitest run`, `environment: "jsdom"`, `forbidOnly: true` (an accidental `.only` fails CI).
- Stack: Vitest 3.2.4 + `@testing-library/react` 16.3.0, no MSW — tests stub `globalThis.fetch` directly with `vi.fn()` (see `AdminApp.test.tsx`, `LandingSettingsPage.test.tsx`).
- Pattern: `beforeEach(() => vi.restoreAllMocks())`, `afterEach(() => cleanup())`, `data-testid` per state/action rather than text-matching where multiple similar states exist.
- Test-file sizes for the prior slice: `session.test.ts` 483 lines, `AdminApp.test.tsx` 575 lines, `LandingSettingsPage.test.tsx` 409 lines (single-entity editor). Posts is a multi-entity CRUD + lifecycle + file management surface — test volume will be materially larger.

### Affected Areas
- `apps/web/src/admin/adminTypes.ts` — add `Post`, `PostListItem`, `PostForm`, `PostDownload`, `FileAssetResponse` types.
- `apps/web/src/admin/AdminApp.tsx` — enable `Posts` nav item, add minimal view-switching state.
- `apps/web/src/admin/` — new files: a `PostsListPage`, a `PostFormPage` (or `PostEditorPage` shared for create/edit), and likely a small file-upload widget component.
- `apps/web/vite.config.ts` — add `/files` to the dev proxy (blocking gap, not optional).
- `apps/api/src/posts/*` — read-only reference, no backend changes expected in this slice.
- `apps/api/src/file-module/*` — read-only reference for upload/delete contract.

### Approaches

1. **Full vertical slice in one PR (list + create + edit + lifecycle + files + tags + featured)**
   - Pros: one coherent mental model, no intermediate half-working states, matches "one feature = one PR" intuition.
   - Cons: given `posts.service.test.ts` is already 1175 lines and `LandingSettingsPage.test.tsx` (a *simpler*, single-entity editor) was 204 impl + 409 test lines, a full Posts admin UI (list + form + file widget + lifecycle actions) will almost certainly blow past the 400-line review budget by a wide margin — likely 3-5x on the frontend code alone plus proportional tests.
   - Effort: High.

2. **Foundation-first, then vertical slices, mirroring the `ui-admin-complete` precedent** (recommended)
   - Slice 1 ("Posts list + read"): `PostsListPage` (table/list view, status filter, links to edit), wiring the `Posts` nav item, `adminTypes.ts` additions, `/files` proxy fix. No mutation UI yet — read-only.
   - Slice 2 ("Create + edit core fields"): `PostFormPage` for title/slug/content/description/tags/status, using `adminFetch` POST/PATCH, reusing the loading/error/success state shape from `LandingSettingsPage`.
   - Slice 3 ("Lifecycle actions"): publish/archive/delete buttons with `window.confirm` gates on the list and/or edit page (consistent with the existing confirm-before-mutate pattern).
   - Slice 4 ("Cover image + downloadable files + featured toggle"): file upload widget (new pattern), wiring `coverImageId`/`downloadIds`, feature/unfeature buttons with the 3-slot cap surfaced in the UI.
   - Pros: each slice is independently reviewable and shippable, matches the delivery strategy the team already chose for `ui-admin-complete` (stacked PRs after a 400-line forecast breach), isolates the riskiest/most novel piece (file upload UI) into its own slice so it doesn't block simpler read/edit functionality from landing.
   - Cons: more coordination overhead (state.yaml / tasks tracking across slices), Posts nav item stays "partially wired" for a few PRs.
   - Effort: Medium per slice, Medium-High overall.

3. **Read + write combined, defer file management and featured toggle entirely to a follow-up change**
   - First slice ships list/create/edit/publish/archive/delete for text fields only (title, slug, content, description, tags, status); cover image, downloads, and featured toggle become a separate SDD change proposed later.
   - Pros: smallest possible first PR, fastest to ship something reviewable; avoids inventing the file-upload UI pattern under time pressure.
   - Cons: splits what the user described as one slice ("Posts CRUD admin UI") across two SDD changes; a Post without a cover image is a degraded but arguably shippable interim state for an internal admin tool.
   - Effort: Low-Medium for this slice; defers real effort rather than eliminating it.

### Recommendation

Approach 2 (foundation-first, vertical slices within **one SDD change**, chained/stacked PRs) — consistent with how `ui-admin-complete` was actually delivered (PR1 shell/session, PR2 Landing Settings, forecast-driven stacking after breaching 400 lines). Do NOT split into a separate SDD change (rejecting approach 3): tags, cover image, downloads, and featured toggle are all part of the same `CreatePostDto`/`UpdatePostDto` contract and the same `PostFormPage`; splitting them into a later change would mean revisiting the same form twice. Keep them as later slices of the *same* change/tasks list instead.

### Scope Boundaries

**IN this SDD change** (`posts-admin-crud`), across multiple chained PR slices:
- Posts list (status filter, pagination-aware if needed)
- Create/edit form: title, slug, content (plain textarea or minimal rich text — product decision below), description, tags, status
- Publish / Archive / Delete actions with confirm gates
- Cover image upload/replace via `POST_COVER_IMAGE` category
- Downloadable files upload/manage via `POST_DOWNLOAD` category (list, add, remove, reorder is optional — `sortOrder` exists server-side but reordering UI can be deferred)
- Feature/unfeature toggle with 3-slot cap surfaced (disable "Feature" when cap reached and post isn't already featured)
- `/files` dev proxy fix in `vite.config.ts` (blocking prerequisite, small, can ride in slice 1)

**Likely DEFERRED** (flag for product/user confirmation, not silently assumed):
- Rich text / WYSIWYG editing of `content` — current backend just sanitizes HTML server-side; building a real editor is a meaningfully separate scope decision (plain textarea vs. HTML editor vs. Markdown-to-HTML).
- Drag-and-drop reordering of downloadable files (sortOrder exists but no UI requirement stated).
- Bulk actions (bulk publish/archive/delete).
- Slug auto-generation from title (nice-to-have, not in backend contract).

**Review budget**: This will need chained/stacked PRs. Estimate based on precedent: `LandingSettingsPage` alone (single entity, no list, no file upload, no lifecycle actions) was ~204 impl + 409 test = ~613 lines and already needed care to stay reviewable per-PR. Posts admin UI has a list view, a richer form, 4 lifecycle actions, and a net-new file-upload widget — this is unambiguously **higher complexity than the entire prior slice combined**. Sdd-tasks MUST forecast per-slice line counts explicitly; single-PR delivery is not realistic here. Recommend the same delivery strategy already used for `ui-admin-complete` (ask-on-risk → chained once forecast confirms breach).

### Open Questions / Product Decisions

1. **Content editing UX**: plain `<textarea>` for HTML content (matches `LandingSettingsPage` precedent, fastest to ship) vs. a real WYSIWYG/Markdown editor? This materially changes slice 2 scope and effort.
2. **Pagination in the list UI**: `PostListQueryDto` supports `skip`/`take` — does the first list slice need actual pagination controls, or is "load all, client-side scroll" acceptable for MVP admin volume?
3. **Tags input UX**: freeform comma-separated text field vs. tag-chip input with add/remove? Backend just wants `string[]` (max 20) — no tag taxonomy/autocomplete exists server-side.
4. **Downloadable files reordering**: is drag-and-drop reorder needed in v1, or is add/remove-only acceptable (sortOrder assigned by insertion order)?
5. **Slug editing after publish**: backend allows changing `slug` via `UpdatePostDto` on a published post (no lock found in `posts.service.ts`) — should the UI warn/confirm specifically about slug changes on published posts (URL breakage), separate from the generic save confirm?
6. Confirm the `/files` proxy gap is acceptable to fix as part of this change (it is a pre-existing gap in `ui-admin-complete`, not something Posts introduces, but Posts is the first slice that actually needs it).

### Ready for Proposal

Yes. The backend contract, file-module integration points, and UI patterns to reuse are all concrete and read directly from code. Recommend `sdd-propose` scope this as a single SDD change (`posts-admin-crud`) with a tasks breakdown that explicitly plans 3-4 chained PR slices (list/read → create/edit → lifecycle actions → files/tags/featured), and surface the open questions above to the user before/during `sdd-propose` rather than assuming defaults.
