# Posts Specification

## Purpose

Publish safe ministry posts with admin CRUD, simple sanitized HTML, tags, files, cover images, featured placement, and public read routes.

## Requirements

### Requirement: P-01 Admin Post Management

Authenticated active responsible users MUST create, read, update, publish/archive, tag, attach downloads, set a cover image, and delete posts. Unauthenticated users MUST NOT mutate posts.

#### Scenario: Admin saves post content

- GIVEN an authenticated active responsible user and valid post data
- WHEN the user creates or updates a post
- THEN the post is persisted with title, slug, status, tags, cover image, downloads, and sanitized HTML

#### Scenario: Unauthenticated mutation denied

- GIVEN no valid auth token
- WHEN a create, update, publish, archive, feature, or delete request is made
- THEN the request is rejected with 401

### Requirement: P-02 Sanitized Rich Text

The backend MUST sanitize HTML before persistence and MUST NOT persist dangerous raw HTML. Allowed tags are `p`, `h2`, `h3`, `strong`, `em`, `ul`, `ol`, `li`, `a`, `blockquote`, and `br`. Embedded images, tables, inline styles, colors, iframes, scripts, and unsafe attributes MUST be stripped. The frontend MUST sanitize again before rendering.

#### Scenario: Dangerous HTML stripped

- GIVEN post HTML with scripts, styles, iframes, tables, images, or event attributes
- WHEN the post is saved
- THEN only allowed safe HTML remains in persistence

#### Scenario: Public render sanitizes again

- GIVEN persisted post HTML
- WHEN the public list or detail renders it
- THEN frontend sanitization is applied before insertion into the page

#### Scenario: External links are safe

- GIVEN allowed anchor tags pointing outside the site
- WHEN the content renders publicly
- THEN links open in a new tab with `rel="noopener noreferrer"`

### Requirement: P-03 Featured Post Workflow

The system MUST allow at most 3 active featured `PUBLISHED` posts. Marking or updating featured state MUST set an explicit feature timestamp used for ordering. Unmarking MUST clear that timestamp. Generic post edits MUST NOT change featured ordering.

#### Scenario: Feature cap enforced

- GIVEN 3 active featured posts already exist
- WHEN an admin marks another post as featured
- THEN the request is rejected and existing featured posts remain unchanged

#### Scenario: Featured timestamp controls order

- GIVEN multiple featured posts with feature timestamps
- WHEN featured posts are listed
- THEN they are ordered by feature timestamp descending, not generic `updatedAt`

### Requirement: P-04 Public Post Access

The public web app MUST expose `/posts` and `/posts/:slug` for `PUBLISHED` posts only, with loading, empty, and error states. Visitors MAY download attached files through existing file routes.

#### Scenario: Published posts visible

- GIVEN published posts with covers, tags, and downloads exist
- WHEN a visitor opens `/posts` or a valid detail slug
- THEN published content, metadata, cover image, and downloads are shown

#### Scenario: Non-published posts hidden

- GIVEN a draft or archived post exists
- WHEN a visitor requests its slug
- THEN the post is not exposed publicly
