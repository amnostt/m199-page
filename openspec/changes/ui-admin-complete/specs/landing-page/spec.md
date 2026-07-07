# Delta for Landing Page

## MODIFIED Requirements

### Requirement: LP-01 Admin Landing Settings

Authenticated active responsible users MUST be able to read and update singleton landing settings via API and the admin web. The system SHALL expose only LP-01 base fields in the first admin slice: mission, vision, description, featured video URL, and contact fields. The web editor MUST require confirmation before every save and MUST NOT provide landing preview behavior in this slice.
(Previously: LP-01 specified API read/update for base landing settings fields only.)

#### Scenario: Admin reads settings through API

- GIVEN an authenticated active responsible user
- WHEN GET `/landing/admin`
- THEN 200 with current landing settings payload

#### Scenario: Admin updates settings through API

- GIVEN an authenticated active responsible user and valid landing DTO
- WHEN PUT `/landing/admin`
- THEN 200 with updated settings, persistence confirmed

#### Scenario: Unauthenticated API access denied

- GIVEN no auth token
- WHEN GET or PUT `/landing/admin`
- THEN 401

#### Scenario: Admin editor loads base fields

- GIVEN an active admin session
- WHEN the Landing Settings editor opens
- THEN mission, vision, description, featured video URL, and contact fields are editable

#### Scenario: Save requires confirmation

- GIVEN edited Landing Settings fields
- WHEN the admin chooses save
- THEN confirmation is required before the update is submitted

#### Scenario: Preview unavailable in first slice

- GIVEN the Landing Settings editor is open
- WHEN the admin edits settings
- THEN no landing preview is displayed or required to save
