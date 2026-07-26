/**
 * Auth constants shared by the cookie, JWT, refresh-family, and controller
 * layers. The refresh deadlines intentionally leave a bounded gap between the
 * database transaction and the absolute server operation deadline.
 */

export const ACCESS_TOKEN = "access_token";
export const REFRESH_TOKEN = "refresh_token";

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_SECONDS = Math.floor(
  REFRESH_TOKEN_TTL_MS / 1000,
);
export const REFRESH_TOKEN_BYTES = 48;

export const REFRESH_TRANSACTION_TIMEOUT_MS = 8_000;
export const REFRESH_OPERATION_TIMEOUT_MS = 10_000;
export const REFRESH_REPLAY_WINDOW_MS = 30 * 60 * 1000;

export const REFRESH_OPERATION_HEADER = "x-refresh-operation-id";
export const AUTH_MIN_EPOCH_HEADER = "x-auth-min-epoch";
export const REFRESH_FAMILY_VERSION_HEADER = "x-refresh-family-version";

export const REFRESH_TOKEN_TYPE = "refresh" as const;
