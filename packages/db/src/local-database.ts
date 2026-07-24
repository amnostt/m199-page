const EXPECTED_LOCAL_DATABASE = {
  hostname: new Set(["localhost", "127.0.0.1"]),
  port: "5432",
  username: "m199",
  password: "m199",
  database: "m199",
} as const;

function isExpectedLocalDatabaseUrlValue(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);

    return (
      url.protocol === "postgresql:" &&
      EXPECTED_LOCAL_DATABASE.hostname.has(url.hostname) &&
      url.port === EXPECTED_LOCAL_DATABASE.port &&
      url.username === EXPECTED_LOCAL_DATABASE.username &&
      url.password === EXPECTED_LOCAL_DATABASE.password &&
      decodeURIComponent(url.pathname.slice(1)) ===
        EXPECTED_LOCAL_DATABASE.database &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

/**
 * Returns true only for the PostgreSQL instance created by the local Compose
 * file. This deliberately requires the complete local connection identity so
 * a destructive reset cannot silently target another database on localhost.
 */
export function isExpectedLocalDatabaseUrl(
  databaseUrl: string | undefined,
): boolean {
  return (
    databaseUrl !== undefined &&
    isExpectedLocalDatabaseUrlValue(databaseUrl.trim())
  );
}

/**
 * Guards destructive local operations and development-only seed credentials.
 */
export function assertExpectedLocalDatabaseUrl(
  databaseUrl: string | undefined,
): asserts databaseUrl is string {
  if (isExpectedLocalDatabaseUrl(databaseUrl)) return;

  throw new Error(
    "Refusing local database operation: DATABASE_URL must target the local Compose PostgreSQL database.",
  );
}
