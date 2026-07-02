# File Management Specification

## Purpose

Enable file upload and serving infrastructure so outings and posts can include images and documents. Provides upload, public serving, and admin deletion with local storage, thumbnail generation, and MIME validation per FileCategory.

## Requirements

### Requirement: FU-01 File Upload

The system MUST accept multipart/form-data uploads via POST `/files/:category`, validate MIME type against the category allowlist, write the original file to disk, create a FileAsset database record, and generate a thumbnail for image files.

The endpoint MUST validate the category exists in the FileCategory enum, validate MIME type against the category-specific allowlist, store the file to `UPLOAD_DIR/{category}/{uuid}.{ext}`, create a FileAsset record with originalFilename, mimeType, category, fileSize, storagePath, and optional thumbnailPath, and generate a 500px longest-side JPEG thumbnail at 80% quality for image uploads.

#### Scenario: Upload valid image file

- GIVEN a valid image file (image/jpeg, 2MB) and authenticated admin user
- WHEN POST `/files/OUTING_MAIN_IMAGE` is called with multipart form data
- THEN the server stores the file to disk, creates FileAsset record, generates 500px JPEG thumbnail, and returns 201 with FileAsset including id, thumbnailUrl

#### Scenario: Upload valid PDF document

- GIVEN a valid PDF file (application/pdf, 5MB) and authenticated admin user
- WHEN POST `/files/OUTING_CROQUIS` is called
- THEN the server stores the file, creates FileAsset record with no thumbnail, and returns 201

#### Scenario: Upload failure keeps original, sets thumbnail null

- GIVEN a valid image file but thumbnail generation fails (corrupt image)
- WHEN POST `/files/OUTING_MAIN_IMAGE` is called
- THEN the original file is stored, FileAsset is created with thumbnailPath=null, and 201 is returned

---

### Requirement: FU-02 File Serving

The system MUST serve uploaded files publicly via GET `/files/:id` with correct Content-Type header, and return 404 for non-existent files.

The endpoint MUST look up FileAsset by id, set Content-Type from mimeType field, stream the file from storagePath, and return 404 with JSON error when file or record not found.

#### Scenario: Serve existing image

- GIVEN a FileAsset record exists with mimeType=image/jpeg and storagePath pointing to existing file
- WHEN GET `/files/{id}` is called
- THEN the server returns 200 with Content-Type image/jpeg and file binary data

#### Scenario: Serve non-existent file returns 404

- GIVEN no FileAsset exists for the given id
- WHEN GET `/files/{id}` is called
- THEN the server returns 404 with `{"statusCode":404,"message":"File not found"}`

---

### Requirement: FU-03 File Deletion

The system MUST allow any authenticated active admin to delete any file via DELETE `/files/:id`, removing both the file from disk and the FileAsset database record.

The endpoint MUST verify the user is authenticated and has ACTIVE status, delete the physical file from storagePath, delete the FileAsset record, and return 204 on success.

#### Scenario: Admin deletes existing file

- GIVEN a FileAsset exists with storagePath pointing to existing file
- WHEN DELETE `/files/{id}` is called by an authenticated active admin
- THEN the physical file is deleted, FileAsset record is deleted, and 204 is returned

#### Scenario: Unauthenticated delete returns 401

- GIVEN no authentication token
- WHEN DELETE `/files/{id}` is called
- THEN the server returns 401

---

### Requirement: FU-04 Thumbnail Generation

The system MUST generate thumbnails only for image files, creating a 500px longest-side JPEG at 80% quality, and set thumbnailPath=null on failure while preserving the original.

Thumbnail generation MUST only occur for mimeType matching image/*, resize to fit within 500px on longest side preserving aspect ratio, output as JPEG at 80% quality, store at same location as original with `.thumb.jpg` suffix, and set thumbnailPath=null when generation fails.

#### Scenario: Thumbnail generated for image

- GIVEN an uploaded image (2000x1500px, image/jpeg)
- WHEN FileService processes the upload
- THEN a thumbnail at 500px longest side (500x375) is created at storagePath.thumb.jpg

#### Scenario: No thumbnail for PDF

- GIVEN an uploaded PDF
- WHEN FileService processes the upload
- THEN no thumbnail is generated and thumbnailPath is null

#### Scenario: Thumbnail failure preserves original

- GIVEN a corrupt image that sharp cannot process
- WHEN FileService processes the upload
- THEN the original file is kept, FileAsset.thumbnailPath is null, and upload returns 201

---

### Requirement: FU-05 MIME Validation

The system MUST reject uploads with MIME types not in the category-specific allowlist, returning 400 Bad Request with validation error.

Image categories (OUTING_MAIN_IMAGE, POST_COVER_IMAGE, LANDING_HERO, OTHER) MUST allow only: image/jpeg, image/png, image/webp, image/gif. Document categories (OUTING_CROQUIS, OUTING_PLAN, POST_DOWNLOAD) MUST allow: image/jpeg, image/png, image/webp, image/gif, application/pdf.

#### Scenario: Reject disallowed MIME type

- GIVEN a file with mimeType=text/plain
- WHEN POST `/files/OUTING_MAIN_IMAGE` is called
- THEN the server returns 400 with `{"statusCode":400,"message":"MIME type text/plain is not allowed for category OUTING_MAIN_IMAGE"}`

#### Scenario: Accept valid MIME for category

- GIVEN a file with mimeType=application/pdf
- WHEN POST `/files/OUTING_CROQUIS` is called
- THEN the server returns 201 (PDF is allowed for document categories)

---

### Requirement: FU-06 File Size Limit

The system MUST reject uploads exceeding MAX_FILE_SIZE (default 10MB), returning 413 Payload Too Large.

The middleware MUST check Content-Length header before processing, reject with 413 when file exceeds limit, and allow configuration via MAX_FILE_SIZE environment variable.

#### Scenario: Reject oversized file

- GIVEN a file with size 15MB and MAX_FILE_SIZE=10485760 (10MB)
- WHEN upload is attempted
- THEN the server returns 413 with `{"statusCode":413,"message":"File size exceeds maximum of 10MB"}`

---

### Requirement: FU-07 Auth Requirements

The system MUST require AuthGuard (ACTIVE user) for POST and DELETE endpoints, and allow public access for GET.

POST `/files/:category` MUST require valid AuthGuard with ACTIVE user. DELETE `/files/:id` MUST require valid AuthGuard with ACTIVE user. GET `/files/:id` MUST be public with no auth required.

#### Scenario: Upload without auth returns 401

- GIVEN no authentication token
- WHEN POST `/files/OUTING_MAIN_IMAGE` is called
- THEN the server returns 401

#### Scenario: Delete without auth returns 401

- GIVEN no authentication token
- WHEN DELETE `/files/{id}` is called
- THEN the server returns 401

#### Scenario: Get without auth succeeds

- GIVEN no authentication token
- WHEN GET `/files/{id}` is called with valid id
- THEN the file is returned with 200

---

### Requirement: FU-08 FileAsset Migration

The system MUST provide a Prisma migration that creates the FileAsset table and runs cleanly forward and backward.

The migration MUST add FileAsset table with id (cuid), originalFilename (string), mimeType (string), category (enum), fileSize (int), storagePath (string), thumbnailPath (string, nullable), createdAt, updatedAt, and create indexes on category and createdAt. The migration MUST be reversible via `prisma migrate revert`.

#### Scenario: Migration applies cleanly

- GIVEN no FileAsset table exists
- WHEN `prisma migrate deploy` is run
- THEN the migration succeeds and FileAsset table is created with all required columns and indexes

#### Scenario: Migration reverts cleanly

- GIVEN FileAsset table exists with data
- WHEN `prisma migrate revert` is run
- THEN the table is dropped and migration state is updated
