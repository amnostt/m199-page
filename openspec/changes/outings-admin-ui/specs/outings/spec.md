# Delta for Outings

## ADDED Requirements

### Requirement: OUT-08 Admin Web Outing Management

The system MUST let authenticated administrators use the admin web to list outings by `DRAFT`, `PUBLISHED`, or `ARCHIVED` status; create and edit all API-supported outing fields; and perform confirmed Draft, Publish, and Archive lifecycle actions. The interface MUST render the server-returned state and validation failures, MUST preserve selected optional image, croquis, and plan asset references, and MUST NOT provide asset-clearing or Landing feature controls.

#### Scenario: Filtered list and form submission

- GIVEN an authenticated administrator and outings in multiple statuses
- WHEN the administrator selects a status and creates or edits an outing with supported fields
- THEN the matching list and form show the server-returned outing state

#### Scenario: Lifecycle action succeeds

- GIVEN an administrator views an outing and confirms Draft, Publish, or Archive
- WHEN the server accepts the action
- THEN the interface refreshes from the returned lifecycle state

#### Scenario: Server rejects a lifecycle or form request

- GIVEN a required publish field is missing or another request is invalid
- WHEN the administrator submits the form or confirms a lifecycle action
- THEN the interface shows the server validation error without claiming success

#### Scenario: Existing assets are retained

- GIVEN an outing has one or more optional asset references
- WHEN the administrator edits unrelated fields
- THEN its existing asset references remain selected and no clearing control is available
