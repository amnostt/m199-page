import { describe, expect, it } from "vitest";

import {
  assertExpectedLocalDatabaseUrl,
  isExpectedLocalDatabaseUrl,
} from "./local-database.js";

const LOCAL_DATABASE_URL =
  "postgresql://m199:m199@localhost:5432/m199?schema=public";

describe("local database target guard", () => {
  it("accepts the canonical Compose database URL", () => {
    expect(isExpectedLocalDatabaseUrl(LOCAL_DATABASE_URL)).toBe(true);
    expect(() =>
      assertExpectedLocalDatabaseUrl(LOCAL_DATABASE_URL),
    ).not.toThrow();
  });

  it.each([
    "postgresql://m199:m199@example.com:5432/m199",
    "postgresql://m199:m199@localhost:5433/m199",
    "postgresql://m199:m199@localhost:5432/another-db",
    "postgresql://other:m199@localhost:5432/m199",
    undefined,
  ])("rejects unsafe target %s", (databaseUrl) => {
    expect(isExpectedLocalDatabaseUrl(databaseUrl)).toBe(false);
    expect(() => assertExpectedLocalDatabaseUrl(databaseUrl)).toThrow(
      "Refusing local database operation",
    );
  });

  it("accepts the loopback IPv4 alias", () => {
    expect(
      isExpectedLocalDatabaseUrl("postgresql://m199:m199@127.0.0.1:5432/m199"),
    ).toBe(true);
  });
});
