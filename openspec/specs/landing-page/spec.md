# Landing Page Specification

## Purpose

Editable public landing content with protected admin access, public payload assembly, and web rendering with graceful fallbacks for missing content.

## Requirements

### Requirement: LP-01 Admin Landing Settings

Authenticated active responsible users MUST be able to read and update singleton landing settings via API. The system SHALL expose mission, vision, description, featured video URL, and contact fields as editable.

#### Scenario: Admin reads settings

- GIVEN an authenticated active responsible user
- WHEN GET `/landing/admin`
- THEN 200 with current landing settings payload

#### Scenario: Admin updates settings

- GIVEN an authenticated active responsible user and valid landing DTO
- WHEN PUT `/landing/admin`
- THEN 200 with updated settings, persistence confirmed

#### Scenario: Unauthenticated access denied

- GIVEN no auth token
- WHEN GET or PUT `/landing/admin`
- THEN 401

### Requirement: LP-02 Public Landing Payload

The public landing endpoint MUST assemble hero image, copy fields, a featured outing, featured posts, and current verse into a single JSON payload. Missing or null sections SHALL return null — never server errors. Featured outing resolution MUST return one `PUBLISHED` Outing only; absent, `DRAFT`, `ARCHIVED`, or missing references SHALL resolve `featuredOuting` to null while keeping the rest of the payload intact. Featured posts MUST include at most 3 active `PUBLISHED` posts ordered by explicit feature timestamp descending. Normal post edits MUST NOT reorder featured posts. `currentVerse` MUST be the latest remaining published verse by system-controlled creation/publication timestamp, not a calendar date; if none exists it SHALL be null.

#### Scenario: Complete landing payload

- GIVEN hero image, all copy fields, one `PUBLISHED` featured outing, posts, and current verse exist
- WHEN GET `/landing/public`
- THEN 200 with full assembled payload including that featured outing

#### Scenario: Missing featured outing

- GIVEN featuredOutingId is null
- WHEN GET `/landing/public`
- THEN `featuredOuting` is null, rest of payload intact

#### Scenario: Non-publishable featured outing

- GIVEN featuredOutingId points to a `DRAFT`, `ARCHIVED`, or missing outing
- WHEN GET `/landing/public`
- THEN `featuredOuting` is null, rest of payload intact

#### Scenario: Zero featured posts

- GIVEN no active featured published posts exist in the database
- WHEN GET `/landing/public`
- THEN `featuredPosts` is an empty array, rest of payload intact

#### Scenario: Featured posts capped and ordered

- GIVEN more than 3 active featured published posts with feature timestamps exist
- WHEN GET `/landing/public`
- THEN `featuredPosts` contains the 3 newest feature timestamps in descending order

#### Scenario: Normal post edit preserves order

- GIVEN an older featured post is edited without changing featured state
- WHEN GET `/landing/public`
- THEN that post does not move ahead of newer feature timestamps

#### Scenario: Latest remaining verse selected

- GIVEN multiple remaining published verses exist across one or more dates
- WHEN GET `/landing/public`
- THEN `currentVerse` is the newest by system-controlled timestamp

#### Scenario: Latest verse deleted

- GIVEN the latest verse was deleted and an older verse remains
- WHEN GET `/landing/public`
- THEN `currentVerse` is the next latest remaining published verse

#### Scenario: No remaining verse

- GIVEN no remaining published verse exists
- WHEN GET `/landing/public`
- THEN `currentVerse` is null and the payload still returns 200

### Requirement: LP-03 Public Web Rendering

The web app MUST render the landing payload replacing the current Vite shell. Each section that is null or empty SHALL degrade gracefully without breaking page layout.

#### Scenario: Full landing renders

- GIVEN a complete landing payload
- WHEN the web app loads
- THEN all sections render with content, hero image displayed via `/files/{id}`

#### Scenario: Empty section degrades

- GIVEN a payload section is null
- WHEN the page renders
- THEN that section is hidden or shows placeholder text, page layout intact

#### Scenario: Missing hero image

- GIVEN `heroImageId` is null
- WHEN the page renders
- THEN hero section is hidden, remaining sections render normally
