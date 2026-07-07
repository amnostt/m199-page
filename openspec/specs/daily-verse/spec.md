# Daily Verse Specification

## Purpose

Admin-managed verse publishing where "daily" means latest uploaded remaining verse, not calendar rotation.

## Requirements

### Requirement: DV-01 Admin Verse Publishing

Active responsible users MUST be able to create published verses. The system SHALL assign creation/publication date and time from system-controlled timestamps, MUST NOT accept admin-chosen verse dates, and MUST allow multiple verses on the same date.

#### Scenario: Admin creates verse

- GIVEN an authenticated active responsible user and valid verse text/reference
- WHEN the admin creates a verse
- THEN the verse is published with system-controlled date/time

#### Scenario: Multiple verses same date

- GIVEN one verse already exists for today
- WHEN an admin creates another verse today
- THEN both verses are stored without date uniqueness rejection

#### Scenario: Manual date rejected

- GIVEN a create request includes an explicit verse date or time
- WHEN the admin submits the request
- THEN the system ignores or rejects that client-controlled date/time

### Requirement: DV-02 Admin Verse Deletion

Active responsible users MUST be able to delete any remaining verse, including the latest/current verse and past verses. Deleted verses MUST NOT appear on the homepage or public history.

#### Scenario: Delete current verse

- GIVEN verses A and B exist and B is latest
- WHEN an admin deletes B
- THEN B is removed from public results
- AND A becomes the latest remaining verse

#### Scenario: Delete past verse

- GIVEN a past verse appears in public history
- WHEN an admin deletes that verse
- THEN it no longer appears in public history

### Requirement: DV-03 Public Verse History

Public users MUST be able to view up to 100 past remaining published verses ordered by latest system-controlled timestamp first. The system SHALL support multiple entries with the same date.

#### Scenario: History lists past verses

- GIVEN a latest verse and older remaining verses exist
- WHEN a public user opens verse history
- THEN up to 100 older verses are shown newest-first

#### Scenario: History cap

- GIVEN more than 101 published verses exist
- WHEN a public user opens verse history
- THEN at most 100 history items are returned (excluding the current latest)

#### Scenario: Empty history

- GIVEN no past remaining verses exist
- WHEN a public user opens verse history
- THEN an empty state is shown without server errors

### Requirement: DV-04 Admin Verse Listing (Capped)

Admin endpoints MUST cap results to prevent unbounded growth. The admin listing SHALL return at most 200 verses.

#### Scenario: Admin listing capped

- GIVEN more than 200 verses exist
- WHEN an admin lists all verses
- THEN at most 200 results are returned
