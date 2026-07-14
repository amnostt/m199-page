# Delta for Admin Web

## MODIFIED Requirements

### Requirement: Admin Shell Navigation

The system MUST provide a usable admin shell with sidebar navigation for Landing Settings, Posts, and Outings as active sections, switching between them via local component state with no router library. Unrelated domains still out of scope MUST remain visible placeholders without CRUD behavior.

(Previously: Only Landing Settings and Posts were active; other domains were unavailable placeholders.)

#### Scenario: Landing navigation

- GIVEN an active admin session
- WHEN the admin selects Landing Settings
- THEN the Landing Settings editor is displayed

#### Scenario: Posts navigation

- GIVEN an active admin session
- WHEN the admin selects the Posts nav item
- THEN the Posts list view is displayed without a full page reload or router navigation

#### Scenario: Outings navigation

- GIVEN an active admin session
- WHEN the admin selects the Outings nav item
- THEN the Outings list view is displayed without a full page reload or router navigation

#### Scenario: Switching sections preserves the shell

- GIVEN the admin is viewing any active section
- WHEN the admin selects another active section
- THEN the displayed section changes while the shell and session remain intact

#### Scenario: Out-of-scope navigation

- GIVEN an active admin session
- WHEN the admin views unrelated unavailable sections
- THEN they are disabled, hidden, or marked unavailable without CRUD behavior

### Requirement: Shared Admin Feedback Patterns

Admin flows MUST use shared loading, error, and confirmation patterns for first-slice actions. Outings lifecycle actions MUST require confirmation, and form or lifecycle failures MUST be displayed without a false success state.

(Previously: Required shared loading, error, and confirmation patterns for first-slice actions.)

#### Scenario: Loading state

- GIVEN an admin request is pending
- WHEN data is loading or saving
- THEN a clear loading state prevents ambiguous interaction

#### Scenario: Destructive or persistent action confirmation

- GIVEN an action persists admin content
- WHEN the user attempts the action
- THEN confirmation is required before submission

#### Scenario: Outings failure feedback

- GIVEN an Outings form or lifecycle request fails
- WHEN the server returns an error
- THEN the error is shown and the displayed outing state is not treated as updated
