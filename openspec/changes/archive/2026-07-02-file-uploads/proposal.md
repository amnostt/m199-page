# Proposal: file-uploads

## Intent

Enable file upload and serving infrastructure so outings and posts can include images and documents. No file infrastructure exists today — no upload endpoint, no storage, no static serving. This change is a prerequisite for all content-management features (outing images, post covers, downloads, landing hero).

## Scope

### In Scope
- `FileModule` with POST `/files/:category` (upload), GET `/files/:id` (serve public), DELETE `/files/:id` (admin delete)
- Local storage: `./uploads/` in repo root, gitignored
- `FileAsset` migration and model wiring via `DbService`
- Thumbnail generation for images: 500px longest side, JPEG, quality 80% (skip on failure, keep original)
- MIME allowlist per `FileCategory`:
  - Image categories (`OUTING_MAIN_IMAGE`, `POST_COVER_IMAGE`, `LANDING_HERO`, `OTHER`): `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  - Document categories (`OUTING_CROQUIS`, `OUTING_PLAN`, `POST_DOWNLOAD`): above + `application/pdf`
- Any authenticated active admin can delete any file
- Env vars: `UPLOAD_DIR` (default `./uploads`), `MAX_FILE_SIZE` (default 10MB)

### Out of Scope
- S3 / cloud storage (deferred to hardening step)
- Virus scanning
- Image optimization beyond basic 500px JPEG thumbnail
- Frontend upload UI (deferred to admin UI change)
- Rate limiting (deferred)
- File cleanup job for orphaned files

## Capabilities

### New Capabilities
- `file-management`: Upload, serve, and delete image/PDF files with local storage, thumbnail generation, and MIME validation per FileCategory.

### Modified Capabilities
- None

## Approach

Build `FileModule` following the established `ResponsiblesModule` pattern:

1. **Multer** handles multipart parsing and file writes; `@UseGuards(AuthGuard)` on upload and delete
2. **`FileService`** validates MIME type against allowlist, writes original to disk, generates thumbnail via **sharp**, inserts `FileAsset` record via `DbService`
3. **GET** `/files/:id` is **public** (no auth) — `express.static()` in `main.ts` serves files directly
4. **DELETE** `/files/:id` — any authenticated active admin can delete any file; removes file from disk and DB record
5. **Upload failure**: original file kept, thumbnail field set to null, DB record created

New env vars validated in `env.validation.ts`. `uploads/` added to `.gitignore`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/file-module/` | New | FileController, FileService, DTOs |
| `apps/api/src/app.module.ts` | Modified | Import FileModule |
| `apps/api/src/main.ts` | Modified | Add express.static() for uploads/ |
| `apps/api/src/config/env.validation.ts` | Modified | Validate UPLOAD_DIR, MAX_FILE_SIZE |
| `packages/db/prisma/schema.prisma` | Modified | Run FileAsset migration |
| `apps/api/package.json` | Modified | Add @types/multer |
| `.gitignore` | Modified | Add uploads/ |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Local storage doesn't scale across multiple instances | Medium | Document constraint; volume sync deferred to hardening step |
| Thumbnail generation adds CPU cost per upload | Low | Failures skip thumbnail; sharp is fast |
| Large file DoS (uploading huge files) | Low | MAX_FILE_SIZE env var enforces 10MB cap at middleware |

## Rollback Plan

1. Revert migration: `prisma migrate revert`
2. Remove `FileModule` import from `app.module.ts`
3. Remove static middleware from `main.ts`
4. Remove env var validations
5. `git checkout .gitignore`
6. Uninstall `@types/multer`

## Dependencies

- `sharp` for thumbnail generation (add to `apps/api/package.json`)
- `@types/multer` (add to `apps/api/package.json`)
- `FileAsset` migration must be applied before `FileModule` is used

## Success Criteria

- [ ] `POST /files/:category` accepts multipart upload, stores file + creates DB record
- [ ] `GET /files/:id` returns file publicly with correct Content-Type header
- [ ] `DELETE /files/:id` removes both file and DB record
- [ ] Thumbnail generated for images (500px JPEG 80%); skipped on failure
- [ ] MIME type validation rejects disallowed types per category with 400
- [ ] All existing auth tests still pass
- [ ] Migration applied cleanly with no data loss
