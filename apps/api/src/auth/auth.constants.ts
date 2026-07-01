/**
 * Auth constants — cookie names and token TTL values.
 *
 * Shared by AuthService, AuthGuard, and AuthController so cookie names
 * stay consistent across login, refresh, and logout flows.
 */

/** Cookie name for the JWT access token (httpOnly). */
export const ACCESS_TOKEN = "access_token";

/** Cookie name for the opaque refresh token (httpOnly). */
export const REFRESH_TOKEN = "refresh_token";

/** JWT access token time-to-live string (verified by @nestjs/jwt). */
export const ACCESS_TOKEN_TTL = "15m";

/** Refresh token time-to-live in milliseconds (7 days). */
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Bytes of entropy for opaque refresh-token generation. */
export const REFRESH_TOKEN_BYTES = 48;
