# Delta for Landing Page

## MODIFIED Requirements

### Requirement: LP-02 Public Landing Payload

The public landing endpoint MUST assemble hero image, copy fields, a featured outing, featured posts, and current verse into a single JSON payload. Missing or null sections SHALL return null — never server errors. Featured outing resolution MUST return one `PUBLISHED` Outing only; absent, `DRAFT`, `ARCHIVED`, or missing references SHALL resolve `featuredOuting` to null while keeping the rest of the payload intact. Featured posts MUST include at most 3 active `PUBLISHED` posts ordered by explicit feature timestamp descending. Normal post edits MUST NOT reorder featured posts.
(Previously: Featured posts were included without specifying cap, publishability, or explicit feature timestamp ordering.)

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
