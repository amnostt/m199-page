# Exploration: file-uploads (Paso 5 — Archivos y uploads)

## Current State

### 1. Storage Infrastructure
**None exists.** No Multer configuration, no S3 client, no static file serving module, no file upload packages in `package.json`.

- `apps/api/package.json` has only NestJS core + bcryptjs + class-validator — no file upload dependencies
- `main.ts` does NOT configure any static file serving or multipart body parsing
- No `uploads/` directory exists in the repo

### 2. Database Schema
**FileAsset model is already designed and ready** (`packages/db/prisma/schema.prisma`):

```prisma
enum FileStorageProvider { LOCAL }

enum FileCategory {
  OUTING_MAIN_IMAGE
  OUTING_CROQUIS
  OUTING_PLAN
  POST_COVER_IMAGE
  POST_DOWNLOAD
  LANDING_HERO
  OTHER
}

model FileAsset {
  id              String              @id @default(uuid())
  storageProvider FileStorageProvider @default(LOCAL)
  category        FileCategory
  originalName    String
  mimeType        String
  extension       String?
  sizeBytes       Int
  path            String
  url             String
  metadata        Json?
  uploadedById    String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  uploadedBy ResponsibleUser? @relation(fields: [uploadedById], references: [id])
  // ... relations to Outing, Post, LandingSettings
  @@index([category])
  @@index([uploadedById])
}
```

The model includes `FileCategory` enum values for all planned upload types (outing images, croquis, plans, post covers, downloads, landing hero). `uploadedById` links to `ResponsibleUser` for audit. No migrations have been created for this model yet.

### 3. API Patterns (to follow)
Well-established patterns from `ResponsiblesModule` and `AuthModule`:

**Module structure:**
```
file-module/
├── file-module.ts       # NestJS Module importing AuthModule
├── file.controller.ts   # Routes + @UseGuards(AuthGuard), thin controller
├── file.service.ts      # Business logic, DB writes, file system writes
├── dto/
│   ├── upload-file.dto.ts    # class-validator DTOs
│   └── file-response.dto.ts  # Public response shape (no path leaks)
```

**Key patterns:**
- `@UseGuards(AuthGuard)` on all upload endpoints
- `DbService` client accessed via minimal interface pattern (no static `@prisma/client` imports)
- DTOs use `class-validator` decorators, validated via global `ValidationPipe`
- Service returns response shapes that never expose internal paths
- Services use `@Inject(DbService)` and `@Inject(AuthService)` for dependencies

### 4. File System Conventions
- **No `uploads/` directory exists** — needs to be created
- **`.gitignore` does NOT exclude uploads** — uploads/ should be added when created (user uploaded files should never be committed)
- Upload path convention: likely `uploads/{category}/{uuid}.{ext}` or similar

### 5. Configuration
**No file-related env vars exist.** Current `EnvConfig`:
```typescript
interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
}
```

Missing env vars needed for file uploads:
- `UPLOAD_DIR` — root directory for local file storage
- `MAX_FILE_SIZE` — global max bytes (roadmap says 10MB)
- `API_ORIGIN` — already exists conceptually in `AuthInterceptor` but not in EnvConfig

### 6. Frontend State
**Minimal scaffold.** `apps/web/src/App.tsx` is a placeholder with no product UI, routing, or API client. The roadmap explicitly defers "Product UI ships in future changes."

Any file upload frontend components (file input, progress UI, drag-and-drop) need to be built as part of this change or deferred to the admin UI change (paso 10).

### 7. Testing Patterns
**Well-established.** `responsibles.controller.test.ts` uses:
- `Test.createTestingModule` with mocked services and `overrideGuard(AuthGuard)`
- `ValidationPipe` directly tested for DTO validation
- `vi.fn().mockResolvedValue` for service mocks
- `expect(service.method).toHaveBeenCalledWith(...)` assertions

### 8. Technical Constraints

| Constraint | Source | Impact on File Uploads |
|---|---|---|
| **CSRF Origin validation** | `AuthInterceptor` — validates Origin on POST/PUT/PATCH/DELETE | File uploads via POST will be protected; GET for serving files is exempt |
| **AuthGuard requires ACTIVE status** | `AuthGuard` + `AuthenticatedRequest` | All upload endpoints require authenticated active user |
| **Cookie-based auth** | `ACCESS_TOKEN` / `REFRESH_TOKEN` httpOnly cookies | Browser clients must send cookies on upload requests |
| **No `@prisma/client` imports in apps/api** | BF-02 boundary rule | Must use `DbService.client` with minimal interface pattern |
| **ValidationPipe whitelist** | Global in `main.ts` | DTOs must explicitly declare allowed fields |
| **SameSite=Lax cookies** | `AuthService.setAuthCookies` | File upload requests from browser must match cookie origin |
| **NODE_ENV=production → secure cookies** | `AuthService.setAuthCookies` | Local dev uses non-secure cookies; production requires HTTPS |

## Gaps

1. **No file upload dependency** — `@types/multer` (and possibly `multer` itself) not in `package.json`
2. **No static file serving** — `main.ts` has no `ServeStaticModule` or Express static middleware
3. **No FileModule** — no controller, service, DTOs for file operations
4. **No file migration** — `FileAsset` model exists in schema but no migration has been created
5. **No upload directory** — filesystem path convention not established
6. **No MIME/type validation service** — per-category allowed MIME types not defined
7. **No file serving endpoint** — no route to retrieve/download uploaded files
8. **No env var for uploads** — `UPLOAD_DIR`, `MAX_FILE_SIZE` missing from env validation
9. **No file deletion endpoint** — only upload + serve, no cleanup
10. **Frontend has no file handling** — no `FormData` construction, no upload UI

## Affected Areas

- `apps/api/src/` — new `file-module/` directory needed
- `apps/api/src/app.module.ts` — import `FileModule`
- `apps/api/src/config/env.interface.ts` — add `UPLOAD_DIR`, `MAX_FILE_SIZE`
- `apps/api/src/config/env.validation.ts` — validate new env vars
- `apps/api/src/main.ts` — add static file serving middleware
- `packages/db/prisma/schema.prisma` — `FileAsset` model ready but migration needed
- `apps/api/package.json` — add `@types/multer` (Multer is included in `@nestjs/platform-express`)
- `apps/web/src/` — file handling deferred or minimal fetch-only
- `.gitignore` — add `uploads/` when directory is created

## Approaches

### 1. Minimal FileModule with Local Storage (Recommended)

Build a dedicated `FileModule` following the exact `ResponsiblesModule` pattern:

**What:**
- `FileModule` imports `AuthModule` for `AuthGuard`
- `FileController` with `@Post(':category')` for upload, `@Get(':id')` for download
- `FileService` handles: file write to disk, `FileAsset` insert via `DbService`, MIME validation
- `ServeStaticModule` or Express `express.static()` in `main.ts` to serve files
- New env vars: `UPLOAD_DIR` (required), `MAX_FILE_SIZE` (optional, default 10MB)
- Multer as file upload handler (already part of `@nestjs/platform-express`)

**Pros:**
- Follows established NestJS module patterns exactly
- Thin controller + service separation matches existing codebase
- Local storage is the documented approach in `technical-foundation.md`
- Minimal new surface area — only what's needed
- CSRF protection automatic via `AuthInterceptor`
- AuthGuard enforcement automatic on all authenticated endpoints

**Cons:**
- Local storage won't work as-is in multi-instance/production without volume sync
- Serving files through NestJS is less efficient than nginx/CDN direct serve
- No file deletion or cleanup

**Effort:** Medium

### 2. Full-Featured FileService with Cloud-Ready Architecture

Abstract storage behind a `StorageService` interface that defaults to local but could swap to S3:

**What:**
- `StorageService` interface with `upload()`, `delete()`, `getUrl()` methods
- `LocalStorageAdapter` implements the interface
- FileModule uses the adapter
- `FileController` + `FileService` for metadata management
- Separate file serving via signed URLs or streaming

**Pros:**
- Architecture supports future S3 swap without rewriting upload logic
- Clear separation between metadata and actual file storage
- More testable

**Cons:**
- More code and complexity for MVP scope
- Premature abstraction — S3 not in roadmap
- Violates YAGNI

**Effort:** High

## Recommendation

**Approach 1 (Minimal FileModule)** is the correct choice:

1. The roadmap explicitly says "subida local" — local storage is the requirement, not a placeholder
2. The technical foundation documents local storage as the planned path
3. The codebase has well-established patterns that should be followed, not extended
4. YAGNI applies to cloud storage — S3 is explicitly deferred
5. A future hardening step (paso 12) can revisit storage if deployment requires it

**Key decisions to make in design phase:**
- Should `FileController` serve files directly (streaming) or should `main.ts` static middleware handle it?
- Should file URLs be public (no auth) or require auth (cookie)?
- Should uploads be synchronous or async (queue/background)?
- Should thumbnails be generated for images?
- What are the exact MIME types allowed per `FileCategory`?

## Risks

1. **File serving through NestJS** — performance implications for large files; nginx direct serve is better but requires separate config
2. **Local storage in production** — if deploying to multiple instances, files won't be shared; must document this constraint
3. **No file cleanup** — deleted entities (outing, post) may leave orphaned files; no cleanup job exists
4. **10MB limit not enforced at middleware level** — Multer limit needs to be configured per route
5. **CSRF + file uploads** — browser-based file upload must send Origin header correctly; native fetch does, AJAX libraries vary
6. **No virus scanning** — uploaded files are stored and served without scanning

## Ready for Proposal

**Yes.** The codebase is clearly mapped. The `FileAsset` model is designed and ready for migration. The module pattern is established. No conflicts with existing architecture. The main open questions are:

1. Public vs. authenticated file serving
2. Exact MIME type allowlist per FileCategory
3. Whether to stream files through NestJS or serve via static middleware
4. Whether to add a `DELETE /files/:id` endpoint or defer cleanup to paso 12

These should be resolved in the **proposal phase** before spec and design.