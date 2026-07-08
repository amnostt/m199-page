# Proposal: Posts Admin CRUD UI

## Intent

Posts backend (archived `2026-07-06-posts`) is done but only reachable via API. Wire Posts into the admin shell so admins can manage posts without dev help.

## Scope

### In Scope
- Posts list (status filter, load-all, no pagination)
- Create/edit form: title, slug, content (textarea), description, tags (comma-separated, max 20), status
- Publish / Archive / Delete with `window.confirm` gates
- Distinct confirm for slug changes on a `PUBLISHED` post (URL breakage)
- Cover image upload/replace via `POST_COVER_IMAGE`
- Downloadable files add/remove via `POST_DOWNLOAD` (sortOrder by insertion)
- Feature/unfeature toggle, 3-slot cap surfaced
- `/files` dev proxy fix in `vite.config.ts` (blocking prerequisite)

### Out of Scope
- WYSIWYG editor (locked — "not a CMS/editor project", per archived posts proposal)
- List pagination; drag-and-drop file reordering (deferred)
- Tag taxonomy/autocomplete, bulk actions, slug auto-generation
- Backend changes (reference-only)

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `posts`: P-01 delivered via UI; adds slug-change-on-published confirmation
- `admin-web`: Admin Shell Navigation — Posts moves from placeholder to active

## Approach

Reuse `ui-admin-complete` patterns: `adminFetch`/session helpers, `LandingSettingsPage`'s loading/error/success state shape, minimal view-switching state (no router). Add `Post`, `PostListItem`, `PostForm`, `PostDownload` types. New file-upload widget (first here). Deliver as chained PR slices (list/read → create/edit → lifecycle → files/featured); `sdd-tasks` sets per-slice budgets.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `apps/web/src/admin/adminTypes.ts` | Modified | Post types |
| `apps/web/src/admin/AdminApp.tsx` | Modified | Posts nav, view state |
| `apps/web/src/admin/` (new) | New | List/form pages, upload widget |
| `apps/web/vite.config.ts` | Modified | `/files` dev proxy |
| `apps/api/src/posts/*`, `file-module/*` | Reference | No backend changes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Single-PR breaches 400-line budget | High | Chained PR slices per `sdd-tasks` forecast |
| File-upload widget is net-new | Med | Own slice, jsdom tests |
| Raw `PostRow` needs client mapping | Med | Map `coverImageId`/`fileId` to `/files` |
| Silent slug break on published post | Low | Dedicated confirm, separate from save |

## Rollback Plan

Revert admin UI files, the `AdminApp.tsx` nav change, `adminTypes.ts` additions, and the `/files` proxy entry. No backend/schema changes — frontend-only, low-risk.

## Dependencies

- Archived `2026-07-06-posts` (Posts API, file categories)
- Archived `2026-07-07-ui-admin-complete` (admin shell, adminFetch)

## Success Criteria

- [ ] Admin can list, create, edit, publish, archive, delete posts via UI
- [ ] Admin can upload/replace cover image, add/remove downloads
- [ ] Feature/unfeature surfaces the 3-slot cap
- [ ] Slug change on published post shows a distinct confirmation
- [ ] `/files` dev proxy works for previews, thumbnails, uploads
- [ ] No backend changes required
