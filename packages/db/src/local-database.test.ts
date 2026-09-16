import { describe, expect, it } from "vitest";

import {
  assertExpectedLocalDatabaseUrl,
  isExpectedLocalDatabaseUrl,
} from "./local-database.js";

const LOCAL_DATABASE_URL =
  "postgresql://m199:m199@localhost:5433/m199?schema=public";

describe("local database target guard", () => {
  it("accepts the canonical Compose database URL", () => {
    expect(isExpectedLocalDatabaseUrl(LOCAL_DATABASE_URL)).toBe(true);
    expect(() =>
      assertExpectedLocalDatabaseUrl(LOCAL_DATABASE_URL),
    ).not.toThrow();
  });

  it.each(["", "   "])(
    "uses the default port when the configured port is %j",
    (configuredPort) => {
      expect(
        isExpectedLocalDatabaseUrl(LOCAL_DATABASE_URL, configuredPort),
      ).toBe(true);
    },
  );

  it("accepts a URL that matches the configured host port", () => {
    const configuredDatabaseUrl =
      "postgresql://m199:m199@localhost:5544/m199?schema=public";

    expect(isExpectedLocalDatabaseUrl(configuredDatabaseUrl, "5544")).toBe(
      true,
    );
    expect(() =>
      assertExpectedLocalDatabaseUrl(configuredDatabaseUrl, "5544"),
    ).not.toThrow();
  });

  it("rejects a URL that does not match the configured host port", () => {
    expect(isExpectedLocalDatabaseUrl(LOCAL_DATABASE_URL, "5544")).toBe(false);
    expect(() =>
      assertExpectedLocalDatabaseUrl(LOCAL_DATABASE_URL, "5544"),
    ).toThrow("Refusing local database operation");
  });

  it.each(["0", "-1", "1.5", "65536", "not-a-port"])(
    "rejects invalid configured port %s",
    (configuredPort) => {
      expect(
        isExpectedLocalDatabaseUrl(LOCAL_DATABASE_URL, configuredPort),
      ).toBe(false);
      expect(() =>
        assertExpectedLocalDatabaseUrl(LOCAL_DATABASE_URL, configuredPort),
      ).toThrow("Refusing local database operation");
    },
  );

  it.each([
    "postgresql://m199:m199@example.com:5433/m199",
    "postgresql://m199:m199@localhost:5432/m199",
    "postgresql://m199:m199@localhost:5433/another-db",
    "postgresql://other:m199@localhost:5433/m199",
    undefined,
  ])("rejects unsafe target %s", (databaseUrl) => {
    expect(isExpectedLocalDatabaseUrl(databaseUrl)).toBe(false);
    expect(() => assertExpectedLocalDatabaseUrl(databaseUrl)).toThrow(
      "Refusing local database operation",
    );
  });

  it("accepts the loopback IPv4 alias", () => {
    expect(
      isExpectedLocalDatabaseUrl("postgresql://m199:m199@127.0.0.1:5433/m199"),
    ).toBe(true);
  });
});
