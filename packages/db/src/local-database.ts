const EXPECTED_LOCAL_DATABASE = {
  hostname: new Set(["localhost", "127.0.0.1"]),
  username: "m199",
  password: "m199",
  database: "m199",
} as const;

export const DEFAULT_POSTGRES_HOST_PORT = "5433";

export function resolveExpectedLocalDatabasePort(
  configuredPort: string | undefined,
): string | undefined {
  const port = configuredPort?.trim() || DEFAULT_POSTGRES_HOST_PORT;
  if (!/^\d+$/.test(port)) return undefined;

  const numericPort = Number(port);
  if (
    !Number.isInteger(numericPort) ||
    numericPort < 1 ||
    numericPort > 65_535
  ) {
    return undefined;
  }

  return String(numericPort);
}

function isExpectedLocalDatabaseUrlValue(
  databaseUrl: string,
  configuredPort: string | undefined,
): boolean {
  try {
    const url = new URL(databaseUrl);
    const expectedPort = resolveExpectedLocalDatabasePort(configuredPort);

    return (
      expectedPort !== undefined &&
      url.protocol === "postgresql:" &&
      EXPECTED_LOCAL_DATABASE.hostname.has(url.hostname) &&
      url.port === expectedPort &&
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
  configuredPort: string | undefined = process.env["POSTGRES_HOST_PORT"],
): boolean {
  return (
    databaseUrl !== undefined &&
    isExpectedLocalDatabaseUrlValue(databaseUrl.trim(), configuredPort)
  );
}

/**
 * Guards destructive local operations and development-only seed credentials.
 */
export function assertExpectedLocalDatabaseUrl(
  databaseUrl: string | undefined,
  configuredPort: string | undefined = process.env["POSTGRES_HOST_PORT"],
): asserts databaseUrl is string {
  if (isExpectedLocalDatabaseUrl(databaseUrl, configuredPort)) return;

  throw new Error(
    "Refusing local database operation: DATABASE_URL must target the local Compose PostgreSQL database.",
  );
}
