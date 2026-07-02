# Design: file-uploads

## Technical Approach

Add `FileModule` to `apps/api/src/` following the `ResponsiblesModule` pattern: thin controller, service owns disk + DB + thumbnail, `@UseGuards(AuthGuard)` at controller level, `DbService` injected (no static `@m199/db` imports per BF-02). Upload uses `@nestjs/platform-express` `FileInterceptor` with Multer **memory** storage, then explicit `fs/promises.writeFile` after MIME allowlist validation, `sharp`-based thumbnail, and `FileAsset` insert. Serve and delete are explicit controller methods (not `express.static`) so GET returns the spec's JSON 404 envelope on miss and `Content-Type` from the DB row.

## Architecture Decisions

| # | Decision | Choice (rationale) |
|---|----------|--------------------|
| 1 | GET served by controller method, not `express.static` | Spec FU-02 demands JSON 404 envelope; static returns HTML 404 |
| 2 | Multer memoryStorage + explicit `fs/promises.writeFile` | Service owns `<uuid>.<ext>` naming and atomic rollback on DB failure |
| 3 | Align `FileAsset` schema to spec field names via migration | Table empty in dev; Postgres renames are metadata-only |
| 4 | Typed HTTP exceptions + global `AllExceptionsFilter` | `NotFound`/`BadRequest`/`PayloadTooLarge`; filter already produces spec envelope |
| 5 | Thumbnail failures non-fatal | Spec FU-04 — `thumbnailPath = null`, original kept |
| 6 | Path: `UPLOAD_DIR/<CATEGORY>/<uuid>.<ext>` | Category-only — matches `FileCategory` enum; UUID prevents enumeration |
| 7 | Separate `FilesPublicController` for GET | Structural enforcement of "no auth on serve" — no conditional guard |

## Data Flow

**Upload**: Client → AuthInterceptor (Origin) → AuthGuard (JWT+ACTIVE) → FileInterceptor(multer memoryStorage) → FilesController.upload → FileService.upload (validate category, validate mime, mkdir, write buffer, sharp resize 500px JPEG q80, fileAsset.create, return DTO) → 201.

**Serve**: Client → FilesPublicController.serve(id) → FileService.serve (findUnique, 404 JSON if null, res.sendFile with mimeType from row) → 200 | 404.

**Delete**: Client → AuthInterceptor → AuthGuard → FilesController.remove(id) → FileService.remove (findUnique, unlink path + thumb best-effort, fileAsset.delete) → 204.

## File Changes

| File | Action |
|------|--------|
| `apps/api/src/file-module/{file.module,file.controller,files-public.controller,file.service,file-category}.ts` | Create — module + 2 controllers (guarded + public) + service + category enum/allowlist |
| `apps/api/src/file-module/dto/file-response.dto.ts` | Create (strips `storagePath`/`storageProvider`) |
| `apps/api/src/file-module/*.test.ts` (4 files) | Create — 2 controllers, service unit + integration with real tmpdir |
| `apps/api/src/app.module.ts` | Modify — import `FileModule` |
| `apps/api/src/main.ts` | Modify — `fs.mkdir(UPLOAD_DIR,{recursive:true})` on bootstrap (no `express.static`) |
| `apps/api/src/config/env.{validation,interface,validation.test}.ts` | Modify — add `UPLOAD_DIR` (default `./uploads`), `MAX_FILE_SIZE` (default `10485760`) |
| `apps/api/src/main.test.ts` | Modify — assert `fs.mkdir` |
| `packages/db/prisma/schema.prisma` | Modify — rename `originalName→originalFilename`, `sizeBytes→fileSize`, `path→storagePath`; add `thumbnailPath: String?` + `@@index([createdAt])` |
| `packages/db/prisma/migrations/20260702XXXXXX_align_file_asset_to_spec/migration.sql` | Create (Prisma-generated) |
| `apps/api/package.json` | Modify — `sharp ^0.33` (dep), `@types/multer ^1.4` (devDep) |
| `.gitignore` | Modify — append `uploads/` |

## Contracts

```ts
// file-category.ts
const IMAGE_MIMES = ["image/jpeg","image/png","image/webp","image/gif"] as const;
const DOC_MIMES   = [...IMAGE_MIMES, "application/pdf"] as const;
const IMAGE_CATS  = new Set<FileCategory>(["OUTING_MAIN_IMAGE","POST_COVER_IMAGE","LANDING_HERO","OTHER"]);
export function isAllowedMime(c: FileCategory, m: string): boolean {
  return (IMAGE_CATS.has(c) ? IMAGE_MIMES : DOC_MIMES).includes(m as never);
}

// dto/file-response.dto.ts — never exposes storagePath or storageProvider
export interface FileAssetResponse {
  id: string; url: string;                // "/files/<id>"
  thumbnailUrl: string | null;            // "/files/<id>/thumb" or null
  mimeType: string; fileSize: number;
  originalFilename: string; category: FileCategory;
  createdAt: string;                      // ISO
}
```

## Testing Strategy

| Layer | Target | Pattern |
|-------|--------|---------|
| Unit `FileService` | MIME allowlist, thumbnail success/fail, atomic rollback on DB error | `responsibles.service.test.ts` — `Test.createTestingModule` + mocked `DbService`; `vi.mock("sharp")`, `vi.mock("fs/promises")` |
| Unit `FileService.remove` | deletes original + thumb, idempotent on ENOENT | same harness, real `tmpdir` |
| Integration `FilesController` | routes resolve, `@UseGuards(AuthGuard)` enforced | `responsibles.controller.test.ts` — `.overrideGuard(AuthGuard).useValue({canActivate})` |
| Integration `FilesPublicController` | 200 + `Content-Type` + binary; 404 JSON envelope | `res.sendFile` mocked, `DbService` mocked |
| Wiring | `AppModule` compiles with `FileModule` (BF-06) | extend `app.module.test.ts` |
| Bootstrap | `fs.mkdir(UPLOAD_DIR,{recursive:true})` runs | extend `main.test.ts` |

Strict-TDD: each test file lands with the code it covers. Target +18–22 tests. Baseline 97 → 115–119.

## Migration / Rollout

1. `pnpm --filter @m199/db prisma migrate dev --name align_file_asset_to_spec` (generates SQL).
2. Review `migration.sql` — renames are Postgres metadata-only, no rewrite.
3. `pnpm --filter @m199/db db:migrate:deploy` in target env.
4. Deploy API; `fs.mkdir` runs on first boot.
5. **Rollback**: `prisma migrate revert` + revert API commit + `git checkout .gitignore`. No data-loss — no rows reference renamed columns yet.

## Open Questions

- [ ] **BLOCKER — schema/spec field alignment**: spec says `originalFilename`/`fileSize`/`storagePath`/`thumbnailPath`; current schema has `originalName`/`sizeBytes`/`path` and **no `thumbnailPath` column**. Table was bootstrapped in the initial migration; spec assumed a fresh table. Confirm migration step 1, or accept divergence and map in DTO.
- [ ] **`@@index([createdAt])`** (spec FU-08): schema only has `@@index([category])` + `@@index([uploadedById])`. Confirm required or drop.
- [ ] **Thumb serve path**: spec FU-02 only covers original GET. Is `GET /files/:id/thumb` in scope? Currently designed as separate endpoint.
- [ ] **DELETE unlink failure**: best-effort `fs.unlink` (log + continue on non-ENOENT) is acceptable for MVP. Retry queue out of scope per proposal.
