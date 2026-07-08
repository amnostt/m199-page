# Delta for Admin Web

## MODIFIED Requirements

### Requirement: Admin Shell Navigation

The system MUST provide a usable admin shell with sidebar navigation for Landing Settings and Posts as active sections, switching between them via local component state with no router library. Domains still out of scope MUST remain visible placeholders without CRUD behavior.
(Previously: Posts was a disabled placeholder; only Landing Settings was an active section.)

#### Scenario: Landing navigation

- GIVEN an active admin session
- WHEN the admin selects Landing Settings
- THEN the Landing Settings editor is displayed

#### Scenario: Posts navigation

- GIVEN an active admin session
- WHEN the admin selects the Posts nav item
- THEN the Posts list view is displayed without a full page reload or router navigation

#### Scenario: Switching sections preserves the shell

- GIVEN the admin is viewing Posts
- WHEN the admin selects Landing Settings (or vice versa)
- THEN the view-switching state updates the displayed section while the shell and session remain intact

#### Scenario: Out-of-scope navigation

- GIVEN an active admin session
- WHEN the admin views unavailable sections
- THEN they are disabled, hidden, or marked unavailable without CRUD behavior
