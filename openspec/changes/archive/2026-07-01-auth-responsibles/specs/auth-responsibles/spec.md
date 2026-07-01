# auth-responsibles Specification

## Purpose

Authentication, refresh-session lifecycle, active/inactive enforcement, responsible-user CRUD, and password reset for the Misión 1-99 MVP. No roles or public registration.

## Requirements

| ID | Requirement | Scenarios |
|----|------------|-----------|
| AR-01 | **Login with httpOnly cookies**. The system MUST authenticate by email+password, returning access and refresh tokens in separate httpOnly cookies. Inactive users MUST be rejected. | **Active user**: correct credentials → 200, `access_token`+`refresh_token` cookies set. **Invalid password**: 401, no cookies. **Inactive user**: 403, no cookies. |
| AR-02 | **Refresh token rotation**. The system MUST rotate the refresh token on each use, revoking the previous one. Refresh MUST fail for inactive users and revoked tokens. | **Valid refresh**: POST `/auth/refresh` with active token → new `access_token`+`refresh_token` cookies, old refresh revoked. **Revoked token**: 401, cookies cleared. **Inactive user**: 403, cookies cleared. |
| AR-03 | **Logout current session**. The system MUST revoke the current refresh session and clear both auth cookies. | **Authenticated logout**: POST `/auth/logout` with valid token → session marked REVOKED, cookies cleared. |
| AR-04 | **Multiple independent sessions**. The system MUST support concurrent refresh sessions per user. Logout of one session SHALL NOT affect others. | **Independent logout**: user A has sessions on device 1 and 2; logout from device 1 revokes only device 1; device 2 remains ACTIVE. |
| AR-05 | **Active/inactive guard on all authenticated endpoints**. Every authenticated endpoint MUST reject requests from inactive users with 403. | **Inactive user at endpoint**: INACTIVE user calls any authenticated route → 403. **Inactive at refresh**: POST `/auth/refresh` → 403, cookies cleared. |
| AR-06 | **Responsible-user CRUD**. Any authenticated active responsible user MUST be able to create, list, update, and deactivate others. Responses MUST NOT include passwordHash. | **Create**: POST `/responsibles` with email+displayName+password → 201, user returned without passwordHash. **List**: GET `/responsibles` → array without passwordHash. **Update**: PATCH `/responsibles/:id` → updated fields, no passwordHash. |
| AR-07 | **Deactivation revokes all sessions**. Setting a user to INACTIVE MUST immediately revoke all their refresh sessions. | **Bulk revocation**: PATCH `/responsibles/:id` with `{status:"INACTIVE"}` → all sessions for that user become REVOKED; subsequent requests blocked. |
| AR-08 | **Password reset by another responsible**. An authenticated user MUST be able to reset another user's password. The reset MUST revoke all refresh sessions of the affected account. | **Reset with revocation**: user D resets user C's password → passwordHash updated, all user C sessions REVOKED. C's existing cookies immediately invalid. |
| AR-09 | **First user via seed/manual setup only**. The system MUST NOT expose any public registration endpoint. The first responsible user SHALL be created through database seed or manual setup. | **No registration endpoint**: unauthenticated POST to `/responsibles` → 401. **Seed creates first user**: seed script inserts one ACTIVE responsible user directly. |
| AR-10 | **No roles model in MVP**. The system MUST NOT implement roles or permissions. All authenticated active responsible users SHALL have equal access to responsible-user management. | **Equal access**: any authenticated active user has full CRUD and password-reset access; no role check exists. |
