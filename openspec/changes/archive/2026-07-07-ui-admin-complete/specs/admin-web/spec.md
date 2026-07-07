# Admin Web Specification

## Purpose

Protected admin web foundation for MVP content management using the existing httpOnly cookie auth contract.

## Requirements

### Requirement: Protected Admin Access

The system MUST protect `/admin` and all admin child routes from unauthenticated or expired sessions.

#### Scenario: Active session enters admin

- GIVEN an active responsible user session
- WHEN the user opens `/admin`
- THEN the admin shell is shown

#### Scenario: Missing or expired session redirects

- GIVEN no valid session or a session that cannot refresh
- WHEN the user opens any admin route
- THEN the user is redirected directly to admin login

### Requirement: Cookie Session Flow

The web admin MUST authenticate through the existing login, refresh, and logout contract using httpOnly cookies and MUST NOT require client-readable tokens.

#### Scenario: Login succeeds

- GIVEN valid responsible credentials
- WHEN the user submits admin login
- THEN the session is established and `/admin` loads

#### Scenario: Login fails

- GIVEN invalid credentials
- WHEN the user submits admin login
- THEN login remains visible with an error state

### Requirement: Admin Shell Navigation

The system MUST provide a usable admin shell with sidebar navigation for Landing Settings and visible placeholders for out-of-scope domains.

#### Scenario: Landing navigation

- GIVEN an active admin session
- WHEN the admin selects Landing Settings
- THEN the Landing Settings editor is displayed

#### Scenario: Out-of-scope navigation

- GIVEN an active admin session
- WHEN the admin views unavailable sections
- THEN they are disabled, hidden, or marked unavailable without CRUD behavior

### Requirement: Shared Admin Feedback Patterns

Admin flows MUST use shared loading, error, and confirmation patterns for first-slice actions.

#### Scenario: Loading state

- GIVEN an admin request is pending
- WHEN data is loading or saving
- THEN a clear loading state prevents ambiguous interaction

#### Scenario: Destructive or persistent action confirmation

- GIVEN an action persists admin content
- WHEN the user attempts the action
- THEN confirmation is required before submission
