# Delta for Posts

## MODIFIED Requirements

### Requirement: P-01 Admin Post Management

Authenticated active responsible users MUST create, read, update, publish/archive, tag, attach downloads, set a cover image, and delete posts through the admin web UI. The list view MUST support a status filter and load the full result set with no pagination controls. Unauthenticated users MUST NOT mutate posts.
(Previously: covered API-level CRUD only, without admin-UI list, form, or lifecycle-action behavior.)

#### Scenario: Admin saves post content

- GIVEN an authenticated active responsible user and valid post data
- WHEN the user creates or updates a post
- THEN the post is persisted with title, slug, status, tags, cover image, downloads, and sanitized HTML

#### Scenario: Unauthenticated mutation denied

- GIVEN no valid auth token
- WHEN a create, update, publish, archive, feature, or delete request is made
- THEN the request is rejected with 401

#### Scenario: Admin lists posts with status filter

- GIVEN posts in DRAFT, PUBLISHED, and ARCHIVED status exist
- WHEN the admin selects a status filter
- THEN only matching posts show, loaded in one request with no pagination UI

#### Scenario: Admin creates a post via the form

- GIVEN title, slug, plain-textarea content, description, tags (comma-separated, max 20), and status are filled
- WHEN the admin submits the create form
- THEN the post is created via `adminFetch`

#### Scenario: Admin edits an existing post

- GIVEN an existing post loaded by slug
- WHEN the admin changes fields and submits
- THEN the post is updated via a partial `PATCH` and the UI reflects the new values

#### Scenario: Admin confirms before lifecycle actions

- GIVEN a post eligible for publish, archive, or delete
- WHEN the admin triggers one of those actions
- THEN a `window.confirm` gate MUST be accepted before the request is sent

## ADDED Requirements

### Requirement: P-05 Cover Image and Downloadable File Management

The admin UI MUST let admins upload or replace a post's cover image and add or remove downloadable files, via the `POST_COVER_IMAGE` and `POST_DOWNLOAD` file-module categories. Reordering downloads is out of scope; `sortOrder` follows insertion order.

#### Scenario: Admin uploads or replaces the cover image

- GIVEN a post with no cover image, or one already set
- WHEN the admin uploads an image through the cover widget
- THEN the file is stored under `POST_COVER_IMAGE` and `coverImageId` is set to it

#### Scenario: Admin adds a downloadable file

- GIVEN a post below the allowed downloads limit
- WHEN the admin uploads a file through the downloads widget
- THEN the file is stored under `POST_DOWNLOAD` and appended to the download list

#### Scenario: Admin removes a downloadable file

- GIVEN a post with one or more downloads
- WHEN the admin removes one
- THEN that download no longer appears on the post

### Requirement: P-06 Admin UI Featured Toggle

The admin UI MUST let admins feature or unfeature a `PUBLISHED` post and MUST surface the 3-slot cap (P-03), disabling or explaining the Feature action at cap rather than only surfacing a raw 409.

#### Scenario: Admin features a post under the cap

- GIVEN fewer than 3 posts are featured
- WHEN the admin features a `PUBLISHED` post
- THEN it becomes featured and the UI reflects the new state

#### Scenario: Admin sees the cap reached

- GIVEN 3 posts are already featured
- WHEN the admin attempts to feature another
- THEN the Feature action is disabled or the cap is explained, avoiding an unnecessary 409 request

#### Scenario: Admin unfeatures a post

- GIVEN a currently featured post
- WHEN the admin unfeatures it
- THEN it is no longer featured and a slot frees up

### Requirement: P-07 Slug Change Confirmation on Published Post

Changing `slug` on a `PUBLISHED` post MUST trigger a distinct confirmation, separate from the generic save confirmation, warning that the public URL will change and existing links will break. The update MUST NOT submit until the admin explicitly confirms.

#### Scenario: Slug change on published post warns before save

- GIVEN a `PUBLISHED` post in the edit form
- WHEN the admin changes the slug and submits
- THEN a distinct URL-breakage confirmation shows before the `PATCH` request is sent

#### Scenario: Slug change on non-published post has no extra warning

- GIVEN a `DRAFT` or `ARCHIVED` post in the edit form
- WHEN the admin changes the slug and submits
- THEN only the generic save confirmation (if any) applies

#### Scenario: Admin cancels the slug-change confirmation

- GIVEN a `PUBLISHED` post with a changed slug pending submission
- WHEN the admin declines the distinct confirmation
- THEN no update request is sent and the form retains the edited values
