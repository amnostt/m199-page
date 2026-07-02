# File Management Specification

## Purpose

Enable file upload, public serving, and admin deletion for outings and posts — local storage, thumbnail generation, and MIME validation per FileCategory.

## Requirements

### Requirement: FU-01 File Upload
POST `/files/:category` MUST accept multipart uploads, validate MIME against category allowlist, store to `UPLOAD_DIR/{category}/{uuid}.{ext}`, create FileAsset record, and generate 500px JPEG 80% thumbnail for image/*. Returns 201.

#### Scenario: Valid image upload
- GIVEN authenticated active admin and valid image/jpeg
- WHEN POST `/files/OUTING_MAIN_IMAGE`
- THEN 201 with FileAsset including id, originalFilename, thumbnailUrl

#### Scenario: Valid PDF upload
- GIVEN authenticated active admin and valid application/pdf
- WHEN POST `/files/OUTING_CROQUIS`
- THEN 201, file stored, thumbnailPath=null

#### Scenario: Thumbnail failure preserves original
- GIVEN valid image but sharp cannot generate thumbnail
- WHEN POST `/files/OUTING_MAIN_IMAGE`
- THEN 201, original kept, thumbnailPath=null

### Requirement: FU-02 File Serving
GET `/files/:id` MUST serve files publicly with correct Content-Type. Returns 404 when file or record missing.

#### Scenario: Serve existing file
- GIVEN FileAsset with valid storagePath
- WHEN GET `/files/{id}`
- THEN 200 with correct Content-Type and binary data

#### Scenario: File not found
- GIVEN no FileAsset for given id
- WHEN GET `/files/{id}`
- THEN 404 `{"statusCode":404,"message":"File not found"}`

### Requirement: FU-03 File Deletion
DELETE `/files/:id` MUST require authenticated active admin, delete physical file and FileAsset record. Returns 204.

#### Scenario: Admin deletes file
- GIVEN existing FileAsset and authenticated active admin
- WHEN DELETE `/files/{id}`
- THEN 204, file and record removed

#### Scenario: Unauthenticated delete
- GIVEN no authentication token
- WHEN DELETE `/files/{id}`
- THEN 401

### Requirement: FU-04 Thumbnail Generation
Image/* uploads MUST generate 500px longest-side JPEG 80% at `{path}.thumb.jpg`. Non-images and failures MUST set thumbnailPath=null, preserving original.

#### Scenario: Image thumbnail
- GIVEN uploaded 2000×1500px image
- WHEN FileService processes upload
- THEN 500×375 thumbnail at storagePath.thumb.jpg

#### Scenario: No thumbnail for PDF
- GIVEN uploaded PDF
- WHEN FileService processes upload
- THEN thumbnailPath=null

#### Scenario: Thumbnail failure
- GIVEN corrupt image sharp cannot process
- WHEN FileService processes upload
- THEN original kept, thumbnailPath=null, 201

### Requirement: FU-05 MIME Validation
Image categories (OUTING_MAIN_IMAGE, POST_COVER_IMAGE, LANDING_HERO, OTHER) MUST allow: image/jpeg, image/png, image/webp, image/gif. Document categories (OUTING_CROQUIS, OUTING_PLAN, POST_DOWNLOAD) MUST also allow application/pdf. Disallowed types MUST return 400.

#### Scenario: Disallowed MIME
- GIVEN text/plain file
- WHEN POST `/files/OUTING_MAIN_IMAGE`
- THEN 400, MIME type not allowed for category

#### Scenario: PDF allowed for documents
- GIVEN application/pdf file
- WHEN POST `/files/OUTING_CROQUIS`
- THEN 201 accepted

### Requirement: FU-06 File Size Limit
Uploads exceeding MAX_FILE_SIZE env var (default 10MB) MUST return 413.

#### Scenario: Oversized file
- GIVEN 15MB file, MAX_FILE_SIZE=10MB
- WHEN upload attempted
- THEN 413, file size exceeds maximum

### Requirement: FU-07 Auth Requirements
POST and DELETE MUST require AuthGuard with ACTIVE user. GET MUST be public.

#### Scenario: Upload without auth
- GIVEN no authentication token
- WHEN POST `/files/OUTING_MAIN_IMAGE`
- THEN 401

#### Scenario: Public GET succeeds
- GIVEN no auth token and valid file id
- WHEN GET `/files/{id}`
- THEN 200 with binary data

### Requirement: FU-08 FileAsset Migration
Prisma migration MUST create FileAsset table: id (cuid), originalFilename, mimeType, category (enum), fileSize, storagePath, thumbnailPath (nullable), createdAt, updatedAt, indexes on category and createdAt. MUST be reversible.

#### Scenario: Migration applies
- GIVEN no FileAsset table
- WHEN `prisma migrate deploy`
- THEN table created with all columns and indexes

#### Scenario: Migration reverts
- GIVEN FileAsset table exists
- WHEN `prisma migrate revert`
- THEN table dropped, migration state reverted
