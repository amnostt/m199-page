# Proposal: Outings

## Intent

Create the first public and admin Outings slice so responsible users can publish outings (`Salidas`) and visitors can discover details, files, featured outing context, and lightweight anonymous interest.

## Scope

### In Scope
- Admin CRUD for outings with `DRAFT`, `PUBLISHED`, and `ARCHIVED` status values, unique slug, date/time, location, description, main image, croquis, and plan references. CRUD means create/read/update/archive in this first slice; hard delete is out of scope.
- Product-level routes: admin API under `/outings/admin`, public API under `/outings`, web pages `/outings` and `/outings/:slug`, and anonymous like action for published outings.
- Featured-on-landing control remains owned by the existing landing singleton. Outings admin may expose a convenience action, but it MUST delegate to the same landing settings update path.

### Out of Scope
- Registration, RSVP, attendance, payments, comments, maps, notifications, SEO automation, analytics, and admin UI polish beyond CRUD needs.
- Multiple featured outings or independent featured-outing ownership outside landing settings.
- Raw visitor identity storage for likes.
- Hard delete for outings.

## Capabilities

### New Capabilities
- `outings`: Admin/public Outing management, publication lifecycle, public list/detail, delegated featured-outing convenience action, and anonymous likes.

### Modified Capabilities
- `landing-page`: Landing singleton remains the featured outing source of truth; featured outing must resolve only to one `PUBLISHED` Outing and degrade to null when absent or not publishable.

## Approach

Use a dedicated Outings module at `apps/api/src/outings` over existing `Outing`/`OutingLike`. Split controllers by audience, enforce active admin auth on mutations, reuse FileAsset IDs, derive privacy-safe visitor hashes with required `VISITOR_HASH_SECRET`, and keep landing as the single editorial owner for the featured outing.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/outings` | New | Outings module, services, DTOs, admin/public controllers, tests |
| `apps/api/src/landing` | Modified | Featured outing publishability and null fallback |
| `apps/web/src` | Modified | Public list/detail routes and like interaction |
| `packages/db/prisma/schema.prisma` | Reused | Existing `Outing`, `OutingLike`, `FileAsset`, `LandingSettings` models |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Slug/status rules become ambiguous | Med | Specs define uniqueness, publish-readiness, and archived visibility |
| Anonymous likes over-identify visitors | Med | Require `VISITOR_HASH_SECRET`; store salted hash only; never persist raw IP/user agent |
| Featured outing conflicts with landing | Low | Landing singleton remains source of truth; Outings convenience action delegates to landing settings |

## Rollback Plan

Remove the Outings module/routes and web routes, revert landing featured-outing changes, and keep existing schema untouched because the required models already exist.

## Dependencies

- Existing auth guard, file upload/serving, landing singleton, and Prisma models.
- Assumption: first slice prioritizes public discovery and interest signal, not event operations.

## Success Criteria

- [ ] Admin can create, update, archive, publish, and request featuring one valid outing through the landing-owned settings path.
- [ ] Public users can list/detail only published outings and like once per outing fingerprint.
- [ ] Landing handles missing, `DRAFT`, or `ARCHIVED` featured outing without errors.
