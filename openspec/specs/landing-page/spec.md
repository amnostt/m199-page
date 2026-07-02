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

The public landing endpoint MUST assemble hero image, copy fields, featured outing, featured posts, and current verse into a single JSON payload. Missing or null sections SHALL return null — never server errors.

#### Scenario: Complete landing payload

- GIVEN hero image, all copy fields, featured outing, posts, and current verse exist
- WHEN GET `/landing/public`
- THEN 200 with full assembled payload

#### Scenario: Missing featured outing

- GIVEN featuredOutingId is null
- WHEN GET `/landing/public`
- THEN `featuredOuting` is null, rest of payload intact

#### Scenario: Zero featured posts

- GIVEN no featured posts exist in the database
- WHEN GET `/landing/public`
- THEN `featuredPosts` is an empty array, rest of payload intact

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
