# Tasks: file-uploads

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700–900 (new + modified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 4-PR stacked-to-main chain |
| Delivery strategy | ask-always |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema migration + env config | PR 1 → main | Standalone; no file-module code yet |
| 2 | FileCategory + FileService + FilesPublicController + tests | PR 2 → main | All read-only/public logic |
| 3 | FilesController (POST/DELETE) + DTOs + deps | PR 3 → main | Auth-guarded write ops |
| 4 | AppModule wiring + bootstrap mkdir + wiring tests | PR 4 → main | Final integration slice |

---

## Phase 1: Infrastructure (Migration + Env Config)

- [x] **T-01** — Modify `packages/db/prisma/schema.prisma`: rename `originalName→originalFilename`, `sizeBytes→fileSize`, `path→storagePath`; add `thumbnailPath String?`; add `@@index([createdAt])`. Keep `extension` and `url` columns as-is.
  **Files**: `packages/db/prisma/schema.prisma`
  **Spec**: FU-08
  **Test**: None (migration validation in T-02)
  **Deps**: None
  **Est. lines**: ~15

- [x] **T-02** — Run `prisma migrate dev --name align_file_asset_to_spec` to generate migration SQL in `packages/db/prisma/migrations/`. Review the generated SQL manually: renames are metadata-only in Postgres.
  **Files**: `packages/db/prisma/migrations/*align_file_asset_to_spec*/migration.sql`
  **Spec**: FU-08
  **Test**: None
  **Deps**: T-01
  **Est. lines**: ~1 (generated file)

- [x] **T-03** — Modify `apps/api/src/config/env.interface.ts`: add `UPLOAD_DIR: string` and `MAX_FILE_SIZE: number` to `EnvConfig` interface.
  **Files**: `apps/api/src/config/env.interface.ts`
  **Spec**: FU-06
  **Test**: T-04
  **Deps**: None
  **Est. lines**: ~4

- [x] **T-04** — Modify `apps/api/src/config/env.validation.ts`: add `UPLOAD_DIR` (default `"./uploads"`) and `MAX_FILE_SIZE` (default `10485760`) to `validate()`. Add tests in `env.validation.test.ts` for the new vars.
  **Files**: `apps/api/src/config/env.validation.ts`, `apps/api/src/config/env.validation.test.ts`
  **Spec**: FU-06
  **Test**: `pnpm --filter api test -- env.validation.test.ts`
  **Deps**: T-03
  **Est. lines**: ~25

---

## Phase 2: Core Implementation

- [x] **T-05** — Create `apps/api/src/file-module/file-category.ts`: define `FileCategory` enum (from schema), `IMAGE_MIMES`, `DOC_MIMES`, `IMAGE_CATS` set, and `isAllowedMime(c, m)` function.
  **Files**: `apps/api/src/file-module/file-category.ts`
  **Spec**: FU-05
  **Test**: T-09 (tests written in file-category.test.ts, 16 tests)
  **Deps**: None
  **Est. lines**: ~20

- [x] **T-06** — Create `apps/api/src/file-module/dto/file-response.dto.ts`: `FileAssetResponse` interface (id, url, thumbnailUrl, mimeType, fileSize, originalFilename, category, createdAt). Never expose `storagePath` or `storageProvider`.
  **Files**: `apps/api/src/file-module/dto/file-response.dto.ts`
  **Spec**: FU-02, FU-03
  **Test**: T-09 (interface only, used by service tests)
  **Deps**: None
  **Est. lines**: ~20

- [x] **T-07** — Create `apps/api/src/file-module/file.service.ts`: inject `DbService`; implement `upload()` (validate MIME via `isAllowedMime`, mkdir, writeFile, sharp resize 500px JPEG q80 → `.thumb.jpg`, insert `FileAsset`; rollback file on DB error), `serve()` (findUnique, return file path + mimeType), `serveThumb()` (findUnique thumbnailPath, 404 if null), `remove()` (findUnique, best-effort `unlink` on path + thumb path with warning log on ENOENT, delete `FileAsset` record).
  **Files**: `apps/api/src/file-module/file.service.ts`
  **Spec**: FU-01, FU-02, FU-03, FU-04, FU-05
  **Test**: T-09 (file.service.test.ts, 16 tests)
  **Deps**: T-05, T-06
  **Est. lines**: ~150

- [x] **T-08** — Create `apps/api/src/file-module/files-public.controller.ts`: `GET /files/:id` → `fileService.serve()`, `GET /files/:id/thumb` → `fileService.serveThumb()`. No auth guard. Set `Content-Type` from DB mimeType. Return JSON 404 envelope on miss.
  **Files**: `apps/api/src/file-module/files-public.controller.ts`
  **Spec**: FU-02, FU-04
  **Test**: T-09 (files-public.controller.test.ts, 5 tests)
  **Deps**: T-07
  **Est. lines**: ~50

- [x] **T-09** — Write unit tests for `FileService` (`file.service.test.ts`): mock `DbService`, `vi.mock("sharp")`, `vi.mock("fs/promises")`; test MIME allowlist (FU-05), thumbnail success/fail (FU-04), atomic rollback on DB error (FU-01), serve 404, serveThumb 404, remove with ENOENT best-effort (FU-03). Write integration tests for `FilesPublicController` (`files-public.controller.test.ts`): `.overrideGuard(AuthGuard).useValue({canActivate: () => true})`, test 200+Content-Type, 404 JSON envelope.
  **Files**: `apps/api/src/file-module/file.service.test.ts`, `apps/api/src/file-module/files-public.controller.test.ts`, `apps/api/src/file-module/file-category.test.ts`
  **Spec**: FU-01–FU-06
  **Test**: `pnpm test` (37 new tests, 140 total)
  **Deps**: T-07, T-08
  **Est. lines**: ~250

---

## Phase 3: Auth-Guarded Controller + Dependencies

- [x] **T-10** — Create `apps/api/src/file-module/file.controller.ts`: `POST /files/:category` with `FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE } })` + `@UseGuards(AuthGuard)`, `@Body("category") category: FileCategory`; calls `fileService.upload()`. `DELETE /files/:id` with `@UseGuards(AuthGuard)`; calls `fileService.remove()`.
  **Files**: `apps/api/src/file-module/file.controller.ts`
  **Spec**: FU-01, FU-03, FU-06, FU-07
  **Test**: T-11
  **Deps**: T-07
  **Est. lines**: ~50

- [x] **T-11** — Write integration tests for `FilesController` (`file.controller.test.ts`): `.overrideGuard(AuthGuard)` → `canActivate: () => false` for 401 tests, `canActivate: () => true` for happy path; test 401 on POST/DELETE without auth (FU-07), 413 on oversized file (FU-06), 400 on bad MIME (FU-05), 201 on valid upload (FU-01), 204 on valid delete (FU-03).
  **Files**: `apps/api/src/file-module/file.controller.test.ts`
  **Spec**: FU-01, FU-03, FU-05, FU-06, FU-07
  **Test**: `pnpm test` (target +8 tests)
  **Deps**: T-10
  **Est. lines**: ~200

- [x] **T-12** — Modify `apps/api/package.json`: add `sharp ^0.33` as dependency, `@types/multer ^1.4` as devDependency.
  **Files**: `apps/api/package.json`
  **Spec**: FU-01, FU-04
  **Test**: `pnpm install`
  **Deps**: None
  **Est. lines**: ~4

- [x] **T-13** — Modify `.gitignore`: append `uploads/` line.
  **Files**: `.gitignore`
  **Spec**: None
  **Test**: None
  **Deps**: None
  **Est. lines**: ~1

---

## Phase 4: Wiring + Bootstrap + Final Tests

- [x] **T-14** — Create `apps/api/src/file-module/file.module.ts`: import `DbModule`, register `FileService`, register both controllers.
  **Files**: `apps/api/src/file-module/file.module.ts`
  **Spec**: FU-01–FU-08
  **Test**: T-16
  **Deps**: T-07, T-08, T-10
  **Est. lines**: ~30

- [x] **T-15** — Modify `apps/api/src/app.module.ts`: add `FileModule` to `imports` array. Modify `apps/api/src/main.ts`: add `fs.mkdir(UPLOAD_DIR, { recursive: true })` inside `bootstrap()` before `app.listen()`.
  **Files**: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`
  **Spec**: FU-01
  **Test**: T-16
  **Deps**: T-14
  **Est. lines**: ~15

- [x] **T-16** — Extend `app.module.test.ts` to assert `AppModule` compiles with `FileModule` imported (BF-06). Extend `main.test.ts` to assert `fs.mkdir` is called with `UPLOAD_DIR` on bootstrap.
  **Files**: `apps/api/src/app.module.test.ts`, `apps/api/src/main.test.ts`
  **Spec**: FU-01
  **Test**: `pnpm test` (target +4 tests)
  **Deps**: T-15
  **Est. lines**: ~40

---

## Phase 5: Verification

- [x] **T-17** — Run full `pnpm test` — all 115–119 tests must pass. Run `prisma migrate deploy` in target env. Verify `GET /files/:id/thumb` for image with thumbnail, `GET /files/:id` for non-image returns file without thumbnail, `POST /files/:category` rejects wrong MIME, `DELETE /files/:id` returns 204. Manual checklist: upload 5MB JPEG → 201 + DB row + file on disk + thumb on disk; upload 15MB file → 413; upload text/plain to OUTING_MAIN_IMAGE → 400; GET non-existent → `{"statusCode":404,"message":"File not found"}`.
  **Files**: All
  **Spec**: FU-01–FU-08
  **Test**: `pnpm test` — all tests pass
  **Deps**: T-16
  **Est. lines**: 0
